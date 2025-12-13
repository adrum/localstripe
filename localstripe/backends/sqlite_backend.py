# Copyright 2017 Adrien Vergé
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import json
import os
import pickle
import sqlite3
import time
from typing import Any, Iterator

from .base import StorageBackend


class SQLiteBackend(StorageBackend):
    """SQLite-based storage backend with per-object-type tables.

    Data is stored in a SQLite database with separate tables for each
    Stripe object type. Each table has:
        - id: The object ID (e.g., cus_xxx, ch_xxx)
        - account_id: For multi-tenancy support
        - created_at: Unix timestamp when the record was created
        - updated_at: Unix timestamp when the record was last updated
        - data: JSON blob containing all object properties

    Configuration:
        LOCALSTRIPE_SQLITE_PATH: Path to the SQLite database file
                                 (default: /tmp/localstripe.db)
    """

    def __init__(self, db_path: str = '/tmp/localstripe.db'):
        self._db_path = db_path
        self._conn: sqlite3.Connection | None = None
        self._tables_created: set[str] = set()
        self._init_db()

    def _init_db(self) -> None:
        """Initialize the database connection."""
        dir_path = os.path.dirname(self._db_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)

        self._conn = sqlite3.connect(self._db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row

        # Load existing table names
        cursor = self._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        for row in cursor:
            self._tables_created.add(row[0])

    def _ensure_connection(self) -> sqlite3.Connection:
        """Ensure the database connection is open."""
        if self._conn is None:
            self._init_db()
        return self._conn  # type: ignore

    def _parse_key(self, key: str) -> tuple[str, str]:
        """Parse a key into (object_type, object_id)."""
        parts = key.split(':', 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid key format: {key}")
        return parts[0], parts[1]

    def _table_name(self, object_type: str) -> str:
        """Get the table name for an object type."""
        # Pluralize and sanitize for SQL
        return f"{object_type}s"

    def _ensure_table(self, object_type: str) -> str:
        """Ensure the table for an object type exists."""
        table = self._table_name(object_type)
        if table not in self._tables_created:
            conn = self._ensure_connection()
            conn.execute(f'''
                CREATE TABLE IF NOT EXISTS "{table}" (
                    id TEXT PRIMARY KEY,
                    account_id TEXT,
                    data TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            ''')
            conn.execute(
                f'CREATE INDEX IF NOT EXISTS "idx_{table}_account" '
                f'ON "{table}" (account_id)'
            )
            conn.execute(
                f'CREATE INDEX IF NOT EXISTS "idx_{table}_created" '
                f'ON "{table}" (created_at)'
            )
            conn.commit()
            self._tables_created.add(table)
        return table

    def _serialize_value(self, value: Any) -> tuple[str | None, str]:
        """Serialize a value to JSON, extracting account_id if present."""
        account_id = None
        if hasattr(value, '__dict__'):
            data = {}
            for k, v in value.__dict__.items():
                if not k.startswith('_'):
                    data[k] = v
            account_id = data.get('account')
            # Store the class name for reconstruction
            data['__class__'] = type(value).__name__
            # Pickle complex objects that can't be JSON serialized
            data['__pickle__'] = pickle.dumps(value).hex()
        else:
            data = {'__value__': value}

        return account_id, json.dumps(data)

    def _deserialize_value(self, data_str: str) -> Any:
        """Deserialize a value from JSON."""
        data = json.loads(data_str)
        if '__pickle__' in data:
            return pickle.loads(bytes.fromhex(data['__pickle__']))
        return data.get('__value__', data)

    def get(self, key: str) -> Any:
        object_type, object_id = self._parse_key(key)
        table = self._table_name(object_type)

        if table not in self._tables_created:
            return None

        conn = self._ensure_connection()
        cursor = conn.execute(
            f'SELECT data FROM "{table}" WHERE id = ?', (object_id,)
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return self._deserialize_value(row['data'])

    def set(self, key: str, value: Any) -> None:
        object_type, object_id = self._parse_key(key)
        table = self._ensure_table(object_type)

        account_id, data_json = self._serialize_value(value)
        now = int(time.time())

        conn = self._ensure_connection()
        conn.execute(
            f'''
            INSERT INTO "{table}" (id, account_id, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                account_id = excluded.account_id,
                data = excluded.data,
                updated_at = excluded.updated_at
            ''',
            (object_id, account_id, data_json, now, now),
        )
        conn.commit()

    def delete(self, key: str) -> None:
        object_type, object_id = self._parse_key(key)
        table = self._table_name(object_type)

        if table not in self._tables_created:
            return

        conn = self._ensure_connection()
        conn.execute(f'DELETE FROM "{table}" WHERE id = ?', (object_id,))
        conn.commit()

    def keys(self) -> Iterator[str]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            # Convert table name back to object type (remove 's' suffix)
            object_type = table[:-1] if table.endswith('s') else table
            cursor = conn.execute(f'SELECT id FROM "{table}"')
            for row in cursor:
                yield f"{object_type}:{row['id']}"

    def values(self) -> Iterator[Any]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            cursor = conn.execute(f'SELECT data FROM "{table}"')
            for row in cursor:
                yield self._deserialize_value(row['data'])

    def items(self) -> Iterator[tuple[str, Any]]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            object_type = table[:-1] if table.endswith('s') else table
            cursor = conn.execute(f'SELECT id, data FROM "{table}"')
            for row in cursor:
                key = f"{object_type}:{row['id']}"
                yield key, self._deserialize_value(row['data'])

    def clear(self) -> None:
        conn = self._ensure_connection()
        for table in list(self._tables_created):
            conn.execute(f'DROP TABLE IF EXISTS "{table}"')
        conn.commit()
        self._tables_created.clear()

    def __contains__(self, key: str) -> bool:
        object_type, object_id = self._parse_key(key)
        table = self._table_name(object_type)

        if table not in self._tables_created:
            return False

        conn = self._ensure_connection()
        cursor = conn.execute(
            f'SELECT 1 FROM "{table}" WHERE id = ? LIMIT 1', (object_id,)
        )
        return cursor.fetchone() is not None

    def __len__(self) -> int:
        conn = self._ensure_connection()
        total = 0
        for table in self._tables_created:
            cursor = conn.execute(f'SELECT COUNT(*) FROM "{table}"')
            total += cursor.fetchone()[0]
        return total

    def close(self) -> None:
        """Close the database connection."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
