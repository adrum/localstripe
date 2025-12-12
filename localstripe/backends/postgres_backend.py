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
from typing import Any, Iterator

try:
    import psycopg2
except ImportError:
    psycopg2 = None  # type: ignore

from .base import StorageBackend


class PostgresBackend(StorageBackend):
    """PostgreSQL-based storage backend.

    Data is stored in a PostgreSQL database with a simple key-value schema.
    Objects are serialized using pickle for storage.

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
        self._init_db()

    def _init_db(self) -> None:
        """Initialize the database connection and schema."""
        self._conn = psycopg2.connect(self._connection_url)
        self._conn.autocommit = False

        with self._conn.cursor() as cur:
            cur.execute('''
                CREATE TABLE IF NOT EXISTS store (
                    key TEXT PRIMARY KEY,
                    value BYTEA NOT NULL
                )
            ''')
            self._conn.commit()

    def _ensure_connection(self) -> Any:
        """Ensure the database connection is open."""
        if self._conn is None or self._conn.closed:
            self._init_db()
        return self._conn

    def get(self, key: str) -> Any:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT value FROM store WHERE key = %s', (key,))
            row = cur.fetchone()
            if row is None:
                return None
            return pickle.loads(row[0])

    def set(self, key: str, value: Any) -> None:
        conn = self._ensure_connection()
        serialized = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
        with conn.cursor() as cur:
            cur.execute(
                '''
                INSERT INTO store (key, value) VALUES (%s, %s)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                ''',
                (key, serialized),
            )
            conn.commit()

    def delete(self, key: str) -> None:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute('DELETE FROM store WHERE key = %s', (key,))
            conn.commit()

    def keys(self) -> Iterator[str]:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT key FROM store')
            for row in cur:
                yield row[0]

    def values(self) -> Iterator[Any]:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT value FROM store')
            for row in cur:
                yield pickle.loads(row[0])

    def items(self) -> Iterator[tuple[str, Any]]:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT key, value FROM store')
            for row in cur:
                yield row[0], pickle.loads(row[1])

    def clear(self) -> None:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute('DELETE FROM store')
            conn.commit()

    def __contains__(self, key: str) -> bool:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute(
                'SELECT 1 FROM store WHERE key = %s LIMIT 1', (key,)
            )
            return cur.fetchone() is not None

    def __len__(self) -> int:
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT COUNT(*) FROM store')
            return cur.fetchone()[0]

    def close(self) -> None:
        """Close the database connection."""
        if self._conn is not None and not self._conn.closed:
            self._conn.close()
            self._conn = None
