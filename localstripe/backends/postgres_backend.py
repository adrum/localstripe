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

import pickle
import time
from typing import Any, Iterator

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import Json
except ImportError:
    psycopg2 = None  # type: ignore
    sql = None  # type: ignore
    Json = None  # type: ignore

from .base import StorageBackend


class PostgresBackend(StorageBackend):
    """PostgreSQL-based storage backend with per-object-type tables.

    Data is stored in a PostgreSQL database with separate tables for each
    Stripe object type. Each table has:
        - id: The object ID (e.g., cus_xxx, ch_xxx)
        - account_id: For multi-tenancy support
        - created_at: Unix timestamp when the record was created
        - updated_at: Unix timestamp when the record was last updated
        - data: JSONB blob containing all object properties

    Configuration:
        LOCALSTRIPE_POSTGRES_URL: PostgreSQL connection URL
            Example: postgresql://user:password@localhost:5432/localstripe

    Requirements:
        Install psycopg2: pip install localstripe[postgres]
    """

    def __init__(self, connection_url: str):
        if psycopg2 is None:
            raise ImportError(
                "PostgreSQL backend requires psycopg2. "
                "Install it with: pip install localstripe[postgres]"
            )
        self._connection_url = connection_url
        self._conn: Any = None
        self._tables_created: set[str] = set()
        self._init_db()

    def _init_db(self) -> None:
        """Initialize the database connection."""
        self._conn = psycopg2.connect(self._connection_url)
        self._conn.autocommit = False

        # Load existing table names
        with self._conn.cursor() as cur:
            cur.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
            """)
            for row in cur:
                self._tables_created.add(row[0])

    def _ensure_connection(self) -> Any:
        """Ensure the database connection is open."""
        if self._conn is None or self._conn.closed:
            self._init_db()
        return self._conn

    def _parse_key(self, key: str) -> tuple[str, str]:
        """Parse a key into (object_type, object_id)."""
        parts = key.split(':', 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid key format: {key}")
        return parts[0], parts[1]

    def _table_name(self, object_type: str) -> str:
        """Get the table name for an object type."""
        return f"{object_type}s"

    def _ensure_table(self, object_type: str) -> str:
        """Ensure the table for an object type exists."""
        table = self._table_name(object_type)
        if table not in self._tables_created:
            conn = self._ensure_connection()
            with conn.cursor() as cur:
                # Use sql.Identifier for safe table name handling
                cur.execute(sql.SQL('''
                    CREATE TABLE IF NOT EXISTS {} (
                        id TEXT PRIMARY KEY,
                        account_id TEXT,
                        data JSONB NOT NULL,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    )
                ''').format(sql.Identifier(table)))

                cur.execute(sql.SQL(
                    'CREATE INDEX IF NOT EXISTS {} ON {} (account_id)'
                ).format(
                    sql.Identifier(f'idx_{table}_account'),
                    sql.Identifier(table)
                ))

                cur.execute(sql.SQL(
                    'CREATE INDEX IF NOT EXISTS {} ON {} (created_at)'
                ).format(
                    sql.Identifier(f'idx_{table}_created'),
                    sql.Identifier(table)
                ))

                conn.commit()
            self._tables_created.add(table)
        return table

    def _serialize_value(self, value: Any) -> tuple[str | None, dict]:
        """Serialize a value to a dict for JSONB storage."""
        account_id = None
        if hasattr(value, '__dict__'):
            data = {}
            for k, v in value.__dict__.items():
                if not k.startswith('_'):
                    data[k] = v
            account_id = data.get('account')
            # Store class name for reference
            data['__class__'] = type(value).__name__
            # Pickle for full object reconstruction
            data['__pickle__'] = pickle.dumps(value).hex()
        else:
            data = {'__value__': value}

        return account_id, data

    def _deserialize_value(self, data: dict) -> Any:
        """Deserialize a value from JSONB."""
        if '__pickle__' in data:
            return pickle.loads(bytes.fromhex(data['__pickle__']))
        return data.get('__value__', data)

    def get(self, key: str) -> Any:
        object_type, object_id = self._parse_key(key)
        table = self._table_name(object_type)

        if table not in self._tables_created:
            return None

        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL('SELECT data FROM {} WHERE id = %s').format(
                    sql.Identifier(table)
                ),
                (object_id,)
            )
            row = cur.fetchone()
            if row is None:
                return None
            return self._deserialize_value(row[0])

    def set(self, key: str, value: Any) -> None:
        object_type, object_id = self._parse_key(key)
        table = self._ensure_table(object_type)

        account_id, data = self._serialize_value(value)
        now = int(time.time())

        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL('''
                    INSERT INTO {} (id, account_id, data, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        account_id = EXCLUDED.account_id,
                        data = EXCLUDED.data,
                        updated_at = EXCLUDED.updated_at
                ''').format(sql.Identifier(table)),
                (object_id, account_id, Json(data), now, now),
            )
            conn.commit()

    def delete(self, key: str) -> None:
        object_type, object_id = self._parse_key(key)
        table = self._table_name(object_type)

        if table not in self._tables_created:
            return

        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL('DELETE FROM {} WHERE id = %s').format(
                    sql.Identifier(table)
                ),
                (object_id,)
            )
            conn.commit()

    def keys(self) -> Iterator[str]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            object_type = table[:-1] if table.endswith('s') else table
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL('SELECT id FROM {}').format(sql.Identifier(table))
                )
                for row in cur:
                    yield f"{object_type}:{row[0]}"

    def values(self) -> Iterator[Any]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL('SELECT data FROM {}').format(sql.Identifier(table))
                )
                for row in cur:
                    yield self._deserialize_value(row[0])

    def items(self) -> Iterator[tuple[str, Any]]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            object_type = table[:-1] if table.endswith('s') else table
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL('SELECT id, data FROM {}').format(
                        sql.Identifier(table)
                    )
                )
                for row in cur:
                    key = f"{object_type}:{row[0]}"
                    yield key, self._deserialize_value(row[1])

    def clear(self) -> None:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            for table in list(self._tables_created):
                cur.execute(
                    sql.SQL('DROP TABLE IF EXISTS {}').format(
                        sql.Identifier(table)
                    )
                )
            conn.commit()
        self._tables_created.clear()

    def __contains__(self, key: str) -> bool:
        object_type, object_id = self._parse_key(key)
        table = self._table_name(object_type)

        if table not in self._tables_created:
            return False

        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL('SELECT 1 FROM {} WHERE id = %s LIMIT 1').format(
                    sql.Identifier(table)
                ),
                (object_id,)
            )
            return cur.fetchone() is not None

    def __len__(self) -> int:
        conn = self._ensure_connection()
        total = 0
        for table in self._tables_created:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL('SELECT COUNT(*) FROM {}').format(
                        sql.Identifier(table)
                    )
                )
                total += cur.fetchone()[0]
        return total

    def close(self) -> None:
        """Close the database connection."""
        if self._conn is not None and not self._conn.closed:
            self._conn.close()
            self._conn = None
