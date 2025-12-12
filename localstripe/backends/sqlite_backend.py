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

import os
import pickle
import sqlite3
from typing import Any, Iterator

from .base import StorageBackend


class SQLiteBackend(StorageBackend):
    """SQLite-based storage backend.

    Data is stored in a SQLite database with a simple key-value schema.
    Objects are serialized using pickle for storage.

    Configuration:
        LOCALSTRIPE_SQLITE_PATH: Path to the SQLite database file
                                 (default: /tmp/localstripe.db)
    """

    def __init__(self, db_path: str = '/tmp/localstripe.db'):
        self._db_path = db_path
        self._conn: sqlite3.Connection | None = None
        self._init_db()

    def _init_db(self) -> None:
        """Initialize the database connection and schema."""
        dir_path = os.path.dirname(self._db_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)

        self._conn = sqlite3.connect(self._db_path, check_same_thread=False)
        self._conn.execute('''
            CREATE TABLE IF NOT EXISTS store (
                key TEXT PRIMARY KEY,
                value BLOB NOT NULL
            )
        ''')
        self._conn.commit()

    def _ensure_connection(self) -> sqlite3.Connection:
        """Ensure the database connection is open."""
        if self._conn is None:
            self._init_db()
        return self._conn  # type: ignore

    def get(self, key: str) -> Any:
        conn = self._ensure_connection()
        cursor = conn.execute(
            'SELECT value FROM store WHERE key = ?', (key,)
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return pickle.loads(row[0])

    def set(self, key: str, value: Any) -> None:
        conn = self._ensure_connection()
        serialized = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
        conn.execute(
            '''
            INSERT INTO store (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            ''',
            (key, serialized),
        )
        conn.commit()

    def delete(self, key: str) -> None:
        conn = self._ensure_connection()
        conn.execute('DELETE FROM store WHERE key = ?', (key,))
        conn.commit()

    def keys(self) -> Iterator[str]:
        conn = self._ensure_connection()
        cursor = conn.execute('SELECT key FROM store')
        for row in cursor:
            yield row[0]

    def values(self) -> Iterator[Any]:
        conn = self._ensure_connection()
        cursor = conn.execute('SELECT value FROM store')
        for row in cursor:
            yield pickle.loads(row[0])

    def items(self) -> Iterator[tuple[str, Any]]:
        conn = self._ensure_connection()
        cursor = conn.execute('SELECT key, value FROM store')
        for row in cursor:
            yield row[0], pickle.loads(row[1])

    def clear(self) -> None:
        conn = self._ensure_connection()
        conn.execute('DELETE FROM store')
        conn.commit()

    def __contains__(self, key: str) -> bool:
        conn = self._ensure_connection()
        cursor = conn.execute(
            'SELECT 1 FROM store WHERE key = ? LIMIT 1', (key,)
        )
        return cursor.fetchone() is not None

    def __len__(self) -> int:
        conn = self._ensure_connection()
        cursor = conn.execute('SELECT COUNT(*) FROM store')
        return cursor.fetchone()[0]

    def close(self) -> None:
        """Close the database connection."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
