"""Provider contract that new blockchain integrations must implement."""

from abc import ABC, abstractmethod
from typing import Any


class BlockchainProvider(ABC):
    chain: str
    provider_name: str

    @abstractmethod
    async def get_transactions(self, address: str, cursor: str | None = None) -> dict[str, Any]:
        """Return a provider page with raw records, provenance, and next cursor."""

    @abstractmethod
    async def health(self) -> dict[str, Any]:
        """Return configuration and readiness without exposing credentials."""
