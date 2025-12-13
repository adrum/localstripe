# Copyright 2017 Adrien Vergé
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

import os
import tempfile
import pytest

from localstripe.backends import PickleBackend, SQLiteBackend, get_backend
from localstripe.backends.base import StorageBackend


class MockStripeObject:
    """Mock Stripe object for testing."""

    def __init__(self, id, name, account=None):
        self.id = id
        self.name = name
        self.account = account
        self.metadata = {'key': 'value'}


class TestStorageBackendInterface:
    """Test that all backends implement the StorageBackend interface."""

    def test_pickle_backend_is_storage_backend(self):
        with tempfile.NamedTemporaryFile(suffix='.pickle', delete=False) as f:
            backend = PickleBackend(f.name)
            assert isinstance(backend, StorageBackend)
            os.unlink(f.name)

    def test_sqlite_backend_is_storage_backend(self):
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            backend = SQLiteBackend(f.name)
            assert isinstance(backend, StorageBackend)
            backend.close()
            os.unlink(f.name)


class TestPickleBackend:
    """Tests for the Pickle backend."""

    @pytest.fixture
    def backend(self):
        with tempfile.NamedTemporaryFile(suffix='.pickle', delete=False) as f:
            path = f.name
        backend = PickleBackend(path)
        yield backend
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

    def test_set_and_get(self, backend):
        obj = MockStripeObject('cus_123', 'Test Customer')
        backend.set('customer:cus_123', obj)

        retrieved = backend.get('customer:cus_123')
        assert retrieved.id == 'cus_123'
        assert retrieved.name == 'Test Customer'

    def test_get_nonexistent(self, backend):
        assert backend.get('customer:nonexistent') is None

    def test_contains(self, backend):
        obj = MockStripeObject('cus_123', 'Test')
        backend.set('customer:cus_123', obj)

        assert 'customer:cus_123' in backend
        assert 'customer:nonexistent' not in backend

    def test_delete(self, backend):
        obj = MockStripeObject('cus_123', 'Test')
        backend.set('customer:cus_123', obj)
        assert 'customer:cus_123' in backend

        backend.delete('customer:cus_123')
        assert 'customer:cus_123' not in backend

    def test_len(self, backend):
        assert len(backend) == 0

        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        assert len(backend) == 1

        backend.set('customer:cus_2', MockStripeObject('cus_2', 'B'))
        assert len(backend) == 2

    def test_keys(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        backend.set('charge:ch_1', MockStripeObject('ch_1', 'B'))

        keys = list(backend.keys())
        assert 'customer:cus_1' in keys
        assert 'charge:ch_1' in keys

    def test_values(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        backend.set('customer:cus_2', MockStripeObject('cus_2', 'B'))

        values = list(backend.values())
        names = [v.name for v in values]
        assert 'A' in names
        assert 'B' in names

    def test_items(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))

        items = list(backend.items())
        assert len(items) == 1
        assert items[0][0] == 'customer:cus_1'
        assert items[0][1].name == 'A'

    def test_clear(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        backend.set('customer:cus_2', MockStripeObject('cus_2', 'B'))
        assert len(backend) == 2

        backend.clear()
        assert len(backend) == 0

    def test_persistence(self, backend):
        obj = MockStripeObject('cus_123', 'Persisted')
        backend.set('customer:cus_123', obj)

        # Create new backend pointing to same file
        backend2 = PickleBackend(backend.disk_path)
        backend2.load()

        retrieved = backend2.get('customer:cus_123')
        assert retrieved.name == 'Persisted'


class TestSQLiteBackend:
    """Tests for the SQLite backend."""

    @pytest.fixture
    def backend(self):
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            path = f.name
        backend = SQLiteBackend(path)
        yield backend
        backend.close()
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

    def test_set_and_get(self, backend):
        obj = MockStripeObject('cus_123', 'Test Customer')
        backend.set('customer:cus_123', obj)

        retrieved = backend.get('customer:cus_123')
        assert retrieved.id == 'cus_123'
        assert retrieved.name == 'Test Customer'

    def test_get_nonexistent(self, backend):
        assert backend.get('customer:nonexistent') is None

    def test_contains(self, backend):
        obj = MockStripeObject('cus_123', 'Test')
        backend.set('customer:cus_123', obj)

        assert 'customer:cus_123' in backend
        assert 'customer:nonexistent' not in backend

    def test_delete(self, backend):
        obj = MockStripeObject('cus_123', 'Test')
        backend.set('customer:cus_123', obj)
        assert 'customer:cus_123' in backend

        backend.delete('customer:cus_123')
        assert 'customer:cus_123' not in backend

    def test_len(self, backend):
        assert len(backend) == 0

        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        assert len(backend) == 1

        backend.set('customer:cus_2', MockStripeObject('cus_2', 'B'))
        assert len(backend) == 2

    def test_keys(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        backend.set('charge:ch_1', MockStripeObject('ch_1', 'B'))

        keys = list(backend.keys())
        assert 'customer:cus_1' in keys
        assert 'charge:ch_1' in keys

    def test_values(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        backend.set('customer:cus_2', MockStripeObject('cus_2', 'B'))

        values = list(backend.values())
        names = [v.name for v in values]
        assert 'A' in names
        assert 'B' in names

    def test_items(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))

        items = list(backend.items())
        assert len(items) == 1
        assert items[0][0] == 'customer:cus_1'
        assert items[0][1].name == 'A'

    def test_clear(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        backend.set('customer:cus_2', MockStripeObject('cus_2', 'B'))
        assert len(backend) == 2

        backend.clear()
        assert len(backend) == 0

    def test_creates_separate_tables(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))
        backend.set('charge:ch_1', MockStripeObject('ch_1', 'B'))

        # Check tables were created
        cursor = backend._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        tables = [row[0] for row in cursor]
        assert 'customers' in tables
        assert 'charges' in tables

    def test_table_schema(self, backend):
        backend.set('customer:cus_1', MockStripeObject('cus_1', 'A'))

        cursor = backend._conn.execute('PRAGMA table_info(customers)')
        columns = {row[1]: row[2] for row in cursor}

        assert 'id' in columns
        assert 'account_id' in columns
        assert 'data' in columns
        assert 'created_at' in columns
        assert 'updated_at' in columns

    def test_account_id_extraction(self, backend):
        obj = MockStripeObject('cus_1', 'Test', account='acct_123')
        backend.set('customer:cus_1', obj)

        cursor = backend._conn.execute(
            'SELECT account_id FROM customers WHERE id = ?', ('cus_1',)
        )
        row = cursor.fetchone()
        assert row[0] == 'acct_123'

    def test_update_existing(self, backend):
        obj1 = MockStripeObject('cus_1', 'Original')
        backend.set('customer:cus_1', obj1)

        obj2 = MockStripeObject('cus_1', 'Updated')
        backend.set('customer:cus_1', obj2)

        retrieved = backend.get('customer:cus_1')
        assert retrieved.name == 'Updated'
        assert len(backend) == 1

    def test_persistence(self, backend):
        obj = MockStripeObject('cus_123', 'Persisted')
        backend.set('customer:cus_123', obj)
        path = backend._db_path
        backend.close()

        # Create new backend pointing to same file
        backend2 = SQLiteBackend(path)
        retrieved = backend2.get('customer:cus_123')
        assert retrieved.name == 'Persisted'
        backend2.close()


class TestGetBackend:
    """Tests for the backend factory function."""

    def test_default_is_pickle(self, monkeypatch):
        monkeypatch.delenv('LOCALSTRIPE_BACKEND', raising=False)
        monkeypatch.setenv('LOCALSTRIPE_DISK_PATH', '/tmp/test_default.pickle')

        backend = get_backend()
        assert isinstance(backend, PickleBackend)

    def test_pickle_backend_selection(self, monkeypatch):
        monkeypatch.setenv('LOCALSTRIPE_BACKEND', 'pickle')
        monkeypatch.setenv('LOCALSTRIPE_DISK_PATH', '/tmp/test_pickle.pickle')

        backend = get_backend()
        assert isinstance(backend, PickleBackend)

    def test_sqlite_backend_selection(self, monkeypatch):
        monkeypatch.setenv('LOCALSTRIPE_BACKEND', 'sqlite')
        monkeypatch.setenv('LOCALSTRIPE_SQLITE_PATH', '/tmp/test_sqlite.db')

        backend = get_backend()
        assert isinstance(backend, SQLiteBackend)
        backend.close()

    def test_invalid_backend_raises(self, monkeypatch):
        monkeypatch.setenv('LOCALSTRIPE_BACKEND', 'invalid')

        with pytest.raises(ValueError, match='Unknown backend type'):
            get_backend()

    def test_postgres_without_url_raises(self, monkeypatch):
        monkeypatch.setenv('LOCALSTRIPE_BACKEND', 'postgres')
        monkeypatch.delenv('LOCALSTRIPE_POSTGRES_URL', raising=False)

        with pytest.raises(ValueError, match='LOCALSTRIPE_POSTGRES_URL'):
            get_backend()
