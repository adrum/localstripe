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

from .base import StorageBackend
from .pickle_backend import PickleBackend
from .sqlite_backend import SQLiteBackend


def get_backend() -> StorageBackend:
    """Factory function to create the appropriate storage backend.

    The backend type is selected via the LOCALSTRIPE_BACKEND environment
    variable. Supported values:
        - 'pickle' (default): File-based pickle storage
        - 'sqlite': SQLite database storage
        - 'postgres': PostgreSQL database storage

    Each backend type has its own configuration environment variables:
        - pickle: LOCALSTRIPE_DISK_PATH (default: /tmp/localstripe.pickle)
        - sqlite: LOCALSTRIPE_SQLITE_PATH (default: /tmp/localstripe.db)
        - postgres: LOCALSTRIPE_POSTGRES_URL (required for postgres backend)
    """
    backend_type = os.environ.get('LOCALSTRIPE_BACKEND', 'pickle').lower()

    if backend_type == 'pickle':
        disk_path = os.environ.get(
            'LOCALSTRIPE_DISK_PATH', '/tmp/localstripe.pickle'
        )
        return PickleBackend(disk_path)

    elif backend_type == 'sqlite':
        db_path = os.environ.get(
            'LOCALSTRIPE_SQLITE_PATH', '/tmp/localstripe.db'
        )
        return SQLiteBackend(db_path)

    elif backend_type == 'postgres':
        try:
            from .postgres_backend import PostgresBackend
        except ImportError:
            raise ImportError(
                "PostgreSQL backend requires psycopg2. "
                "Install it with: pip install localstripe[postgres]"
            )

        postgres_url = os.environ.get('LOCALSTRIPE_POSTGRES_URL')
        if not postgres_url:
            raise ValueError(
                "LOCALSTRIPE_POSTGRES_URL environment variable is required "
                "for PostgreSQL backend. Example: "
                "postgresql://user:password@localhost:5432/localstripe"
            )
        return PostgresBackend(postgres_url)

    else:
        raise ValueError(
            f"Unknown backend type: {backend_type}. "
            f"Supported backends: pickle, sqlite, postgres"
        )


__all__ = [
    'StorageBackend',
    'PickleBackend',
    'SQLiteBackend',
    'get_backend',
]
