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
from typing import Any, Iterator

from .base import StorageBackend


class PickleBackend(StorageBackend):
    """File-based storage backend using Python pickle serialization.

    This is the original and default storage backend for LocalStripe.
    Data is stored in a single pickle file that is read on startup
    and written after every modification.

    Configuration:
        LOCALSTRIPE_DISK_PATH: Path to the pickle file
                               (default: /tmp/localstripe.pickle)
    """

    def __init__(self, disk_path: str = '/tmp/localstripe.pickle'):
        self._disk_path = disk_path
        self._data: dict[str, Any] = {}

    @property
    def disk_path(self) -> str:
        return self._disk_path

    def get(self, key: str) -> Any:
        return self._data.get(key)

    def set(self, key: str, value: Any) -> None:
        self._data[key] = value
        self.save()

    def delete(self, key: str) -> None:
        if key in self._data:
            del self._data[key]
            self.save()

    def keys(self) -> Iterator[str]:
        return iter(self._data.keys())

    def values(self) -> Iterator[Any]:
        return iter(self._data.values())

    def items(self) -> Iterator[tuple[str, Any]]:
        return iter(self._data.items())

    def clear(self) -> None:
        self._data.clear()
        self.save()

    def __contains__(self, key: str) -> bool:
        return key in self._data

    def __len__(self) -> int:
        return len(self._data)

    def load(self) -> None:
        """Load data from the pickle file."""
        try:
            with open(self._disk_path, 'rb') as f:
                self._data = pickle.load(f)
        except FileNotFoundError:
            self._data = {}

    def save(self) -> None:
        """Save data to the pickle file."""
        dir_path = os.path.dirname(self._disk_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        with open(self._disk_path, 'wb') as f:
            pickle.dump(self._data, f, protocol=pickle.HIGHEST_PROTOCOL)
