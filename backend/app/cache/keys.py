"""Canonical cache keys with mandatory tenant and provider isolation."""

from __future__ import annotations

import hashlib
import json


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:24]


def transaction_cache_key(
    *,
    chain: str,
    wallet_address: str,
    provider: str,
    case_id: str,
    query: dict | None = None,
) -> str:
    if not all((chain, wallet_address, provider, case_id)):
        raise ValueError("chain, wallet_address, provider, and case_id are required")
    query_json = json.dumps(query or {}, sort_keys=True, separators=(",", ":"), default=str)
    return ":".join((
        "sih26183", "tx", chain.upper(), provider.lower(), case_id,
        _digest(wallet_address.strip()), _digest(query_json),
    ))


def registry_cache_key(*, registry: str, version: str, chain: str) -> str:
    if not all((registry, version, chain)):
        raise ValueError("registry, version, and chain are required")
    return f"sih26183:registry:{registry.lower()}:{version}:{chain.upper()}"
