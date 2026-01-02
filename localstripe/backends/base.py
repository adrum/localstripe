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

from abc import ABC, abstractmethod
from typing import Any, Iterator


class StorageBackend(ABC):
    """Abstract base class for storage backends.

    All storage backends must implement these methods to provide
    persistent storage for LocalStripe objects.
    """

    @abstractmethod
    def get(self, key: str) -> Any:
        """Retrieve a value by key.

        Args:
            key: The key to look up (format: "object_type:object_id")

        Returns:
            The stored value, or None if not found
        """
        pass

    @abstractmethod
    def set(self, key: str, value: Any) -> None:
        """Store a value by key.

        Args:
            key: The key to store under (format: "object_type:object_id")
            value: The value to store (a StripeObject instance)
        """
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete a value by key.

        Args:
            key: The key to delete
        """
        pass

    @abstractmethod
    def keys(self) -> Iterator[str]:
        """Return an iterator over all keys in the store."""
        pass

    @abstractmethod
    def values(self) -> Iterator[Any]:
        """Return an iterator over all values in the store."""
        pass

    @abstractmethod
    def items(self) -> Iterator[tuple[str, Any]]:
        """Return an iterator over all (key, value) pairs in the store."""
        pass

    @abstractmethod
    def clear(self) -> None:
        """Remove all items from the store."""
        pass

    @abstractmethod
    def __contains__(self, key: str) -> bool:
        """Check if a key exists in the store."""
        pass

    @abstractmethod
    def __len__(self) -> int:
        """Return the number of items in the store."""
        pass

    def load(self) -> None:
        """Load data from persistent storage.

        This is called on startup to restore previous state.
        Default implementation does nothing (for backends that
        don't need explicit loading).
        """
        pass

    def save(self) -> None:
        """Explicitly save all data to persistent storage.

        This is called after modifications to ensure durability.
        Default implementation does nothing (for backends that
        persist automatically).
        """
        pass

    def close(self) -> None:
        """Close any open connections or resources.

        This is called on shutdown. Default implementation does nothing.
        """
        pass
