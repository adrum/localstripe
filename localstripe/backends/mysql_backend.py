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
import pickle
import time
from typing import Any, Iterator

try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
except ImportError:
    mysql = None  # type: ignore
    MySQLError = Exception  # type: ignore

from .base import StorageBackend


class MySQLBackend(StorageBackend):
    """MySQL-based storage backend with per-object-type tables.

    Data is stored in a MySQL database with separate tables for each
    Stripe object type. Each table has:
        - id: The object ID (e.g., cus_xxx, ch_xxx)
        - account_id: For multi-tenancy support
        - created_at: Unix timestamp when the record was created
        - updated_at: Unix timestamp when the record was last updated
        - data: JSON blob containing all object properties

    Configuration:
        LOCALSTRIPE_MYSQL_URL: MySQL connection URL
            Example: mysql://user:password@localhost:3306/localstripe

    Requirements:
        Install mysql-connector-python: pip install localstripe[mysql]
    """

    def __init__(self, connection_url: str):
        if mysql is None:
            raise ImportError(
                "MySQL backend requires mysql-connector-python. "
                "Install it with: pip install localstripe[mysql]"
            )
        self._connection_url = connection_url
        self._conn: Any = None
        self._tables_created: set[str] = set()
        self._connection_params = self._parse_connection_url(connection_url)
        self._init_db()

    def _parse_connection_url(self, url: str) -> dict:
        """Parse a MySQL connection URL into connection parameters.

        Supports formats:
            mysql://user:password@host:port/database
            mysql://user:password@host/database
        """
        import re
        pattern = r'mysql://(?:([^:@]+)(?::([^@]*))?@)?([^:/]+)(?::(\d+))?/(.+)'
        match = re.match(pattern, url)
        if not match:
            raise ValueError(
                f"Invalid MySQL connection URL: {url}. "
                f"Expected format: mysql://user:password@host:port/database"
            )

        user, password, host, port, database = match.groups()
        params = {
            'host': host,
            'database': database,
        }
        if user:
            params['user'] = user
        if password:
            params['password'] = password
        if port:
            params['port'] = int(port)

        return params

    def _init_db(self) -> None:
        """Initialize the database connection."""
        self._conn = mysql.connector.connect(**self._connection_params)
        self._conn.autocommit = False

        # Load existing table names
        with self._conn.cursor() as cur:
            cur.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s
            """, (self._connection_params['database'],))
            for row in cur:
                self._tables_created.add(row[0])

    def _ensure_connection(self) -> Any:
        """Ensure the database connection is open."""
        if self._conn is None or not self._conn.is_connected():
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

    def _escape_identifier(self, identifier: str) -> str:
        """Escape a MySQL identifier (table/column name)."""
        # MySQL uses backticks for identifier quoting
        return f"`{identifier.replace('`', '``')}`"

    def _ensure_table(self, object_type: str) -> str:
        """Ensure the table for an object type exists."""
        table = self._table_name(object_type)
        if table not in self._tables_created:
            conn = self._ensure_connection()
            with conn.cursor() as cur:
                escaped_table = self._escape_identifier(table)
                cur.execute(f'''
                    CREATE TABLE IF NOT EXISTS {escaped_table} (
                        id VARCHAR(255) PRIMARY KEY,
                        account_id VARCHAR(255),
                        data JSON NOT NULL,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL,
                        INDEX idx_{table}_account (account_id),
                        INDEX idx_{table}_created (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                ''')
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
            # Store class name for reference
            data['__class__'] = type(value).__name__
            # Pickle for full object reconstruction
            data['__pickle__'] = pickle.dumps(value).hex()
        else:
            data = {'__value__': value}

        return account_id, json.dumps(data)

    def _deserialize_value(self, data: dict | str) -> Any:
        """Deserialize a value from JSON."""
        if isinstance(data, str):
            data = json.loads(data)
        if '__pickle__' in data:
            return pickle.loads(bytes.fromhex(data['__pickle__']))
        return data.get('__value__', data)

    def get(self, key: str) -> Any:
        object_type, object_id = self._parse_key(key)
        table = self._table_name(object_type)

        if table not in self._tables_created:
            return None

        conn = self._ensure_connection()
        escaped_table = self._escape_identifier(table)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                f'SELECT data FROM {escaped_table} WHERE id = %s',
                (object_id,)
            )
            row = cur.fetchone()
            if row is None:
                return None
            return self._deserialize_value(row['data'])

    def set(self, key: str, value: Any) -> None:
        object_type, object_id = self._parse_key(key)
        table = self._ensure_table(object_type)

        account_id, data_json = self._serialize_value(value)
        now = int(time.time())

        conn = self._ensure_connection()
        escaped_table = self._escape_identifier(table)
        with conn.cursor() as cur:
            # MySQL uses ON DUPLICATE KEY UPDATE instead of ON CONFLICT
            cur.execute(
                f'''
                INSERT INTO {escaped_table} (id, account_id, data, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    account_id = VALUES(account_id),
                    data = VALUES(data),
                    updated_at = VALUES(updated_at)
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
        escaped_table = self._escape_identifier(table)
        with conn.cursor() as cur:
            cur.execute(
                f'DELETE FROM {escaped_table} WHERE id = %s',
                (object_id,)
            )
            conn.commit()

    def keys(self) -> Iterator[str]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            object_type = table[:-1] if table.endswith('s') else table
            escaped_table = self._escape_identifier(table)
            with conn.cursor() as cur:
                cur.execute(f'SELECT id FROM {escaped_table}')
                for row in cur:
                    yield f"{object_type}:{row[0]}"

    def values(self) -> Iterator[Any]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            escaped_table = self._escape_identifier(table)
            with conn.cursor(dictionary=True) as cur:
                cur.execute(f'SELECT data FROM {escaped_table}')
                for row in cur:
                    yield self._deserialize_value(row['data'])

    def items(self) -> Iterator[tuple[str, Any]]:
        conn = self._ensure_connection()
        for table in self._tables_created:
            object_type = table[:-1] if table.endswith('s') else table
            escaped_table = self._escape_identifier(table)
            with conn.cursor(dictionary=True) as cur:
                cur.execute(f'SELECT id, data FROM {escaped_table}')
                for row in cur:
                    key = f"{object_type}:{row['id']}"
                    yield key, self._deserialize_value(row['data'])

    def clear(self) -> None:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            for table in list(self._tables_created):
                escaped_table = self._escape_identifier(table)
                cur.execute(f'DROP TABLE IF EXISTS {escaped_table}')
            conn.commit()
        self._tables_created.clear()

    def __contains__(self, key: str) -> bool:
        object_type, object_id = self._parse_key(key)
        table = self._table_name(object_type)

        if table not in self._tables_created:
            return False

        conn = self._ensure_connection()
        escaped_table = self._escape_identifier(table)
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT 1 FROM {escaped_table} WHERE id = %s LIMIT 1',
                (object_id,)
            )
            return cur.fetchone() is not None

    def __len__(self) -> int:
        conn = self._ensure_connection()
        total = 0
        for table in self._tables_created:
            escaped_table = self._escape_identifier(table)
            with conn.cursor() as cur:
                cur.execute(f'SELECT COUNT(*) FROM {escaped_table}')
                total += cur.fetchone()[0]
        return total

    def close(self) -> None:
        """Close the database connection."""
        if self._conn is not None and self._conn.is_connected():
            self._conn.close()
            self._conn = None
