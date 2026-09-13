"""TronGrid adapter for native TRX and TRC-20 transfer observations."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.providers.contracts import BalanceSnapshot, ProviderError, ProviderPage, TransferCandidate
from app.providers.http import JsonHttpTransport, utc_now


class TronGridProvider:
    chain = "TRON"
    provider_name = "trongrid"

    def __init__(self, *, api_key: str, base_url: str, transport: JsonHttpTransport, finality_confirmations: int = 19):
        self.api_key, self.base_url, self.transport = api_key, base_url.rstrip("/"), transport
        self.finality_confirmations = finality_confirmations

    @property
    def configured(self) -> bool:
        return bool(self.api_key and "placeholder" not in self.api_key.lower())

    def fetch_address(self, address: str, *, cursor: str | None = None, page_size: int = 100) -> ProviderPage:
        if not self.configured:
            raise ProviderError("PROVIDER_CREDENTIALS_MISSING", "TRON provider credentials are missing", retryable=False)
        if page_size < 1 or page_size > 200:
            raise ProviderError("INVALID_PROVIDER_CURSOR", "TronGrid page size is invalid", retryable=False)
        params = {"limit": page_size, "only_confirmed": "true", "order_by": "block_timestamp,desc"}
        if cursor:
            params["fingerprint"] = cursor
        headers = {"TRON-PRO-API-KEY": self.api_key}
        native = self._get(f"/v1/accounts/{address}/transactions", params, headers)
        token = self._get(f"/v1/accounts/{address}/transactions/trc20", params, headers)
        candidates = self._parse_native(native) + self._parse_token(token)
        next_cursor = _fingerprint(token) or _fingerprint(native)
        return ProviderPage(provider=self.provider_name, chain=self.chain, address=address, transfers=tuple(candidates),
                            raw_payload={"native": native, "trc20": token}, source_uri=f"{self.base_url}/v1/accounts/{address}",
                            next_cursor=next_cursor, coverage_state="complete", fetched_at=utc_now())

    def balance(self, address: str) -> BalanceSnapshot:
        payload = self._get(f"/v1/accounts/{address}", {}, {"TRON-PRO-API-KEY": self.api_key})
        data = payload.get("data")
        if not isinstance(data, list) or not data or not isinstance(data[0], dict):
            raise ProviderError("PROVIDER_MALFORMED_RESPONSE", "TronGrid account response was invalid", retryable=False)
        raw = str(data[0].get("balance", ""))
        if not raw.isdigit():
            raise ProviderError("PROVIDER_MALFORMED_RESPONSE", "TRX balance was invalid", retryable=False)
        return BalanceSnapshot(self.provider_name, self.chain, address, raw, 6, "TRX", None, utc_now(), f"{self.base_url}/v1/accounts/{address}")

    def health(self) -> dict[str, object]:
        return {"provider": self.provider_name, "chain": self.chain,
                "state": "configured" if self.configured else "missing_credentials"}

    def _get(self, path: str, params: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
        payload = self.transport.get(f"{self.base_url}{path}", params=params, headers=headers)
        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
            raise ProviderError("PROVIDER_MALFORMED_RESPONSE", "TronGrid response did not contain data", retryable=False)
        return payload

    def _parse_native(self, payload: dict[str, Any]) -> list[TransferCandidate]:
        result: list[TransferCandidate] = []
        for item in payload["data"]:
            contract = ((item.get("raw_data") or {}).get("contract") or [{}])[0]
            parameter = ((contract.get("parameter") or {}).get("value") or {})
            amount = str(parameter.get("amount", "0"))
            if not amount.isdigit() or amount == "0":
                continue
            sender, recipient = parameter.get("owner_address"), parameter.get("to_address")
            tx_hash = item.get("txID")
            timestamp = _timestamp(item.get("block_timestamp"))
            if not all(isinstance(v, str) and v for v in (sender, recipient, tx_hash)) or timestamp is None:
                raise ProviderError("PROVIDER_MALFORMED_RESPONSE", "TRON native transfer was malformed", retryable=False)
            result.append(TransferCandidate(self.chain, tx_hash, f"native:{item.get('contractRet', '0')}", sender, recipient,
                                            "TRX", None, 6, amount, timestamp, "millisecond",
                                            str(item.get("block_number")) if item.get("block_number") is not None else None,
                                            item.get("block_hash"), None, "finalized", "successful", "native"))
        return result

    def _parse_token(self, payload: dict[str, Any]) -> list[TransferCandidate]:
        result: list[TransferCandidate] = []
        for index, item in enumerate(payload["data"]):
            info = item.get("token_info") or {}
            amount = str(item.get("value", ""))
            timestamp = _timestamp(item.get("block_timestamp"))
            sender, recipient, tx_hash = item.get("from"), item.get("to"), item.get("transaction_id")
            decimals = info.get("decimals")
            if not amount.isdigit() or timestamp is None or not all(isinstance(v, str) and v for v in (sender, recipient, tx_hash)):
                raise ProviderError("PROVIDER_MALFORMED_RESPONSE", "TRC-20 transfer was malformed", retryable=False)
            try:
                decimals = int(str(decimals))
            except (TypeError, ValueError) as exc:
                raise ProviderError("PROVIDER_MALFORMED_RESPONSE", "TRC-20 decimals were invalid", retryable=False) from exc
            if not 0 <= decimals <= 36:
                raise ProviderError("PROVIDER_MALFORMED_RESPONSE", "TRC-20 decimals were out of range", retryable=False)
            result.append(TransferCandidate(self.chain, tx_hash, f"trc20:{index}", sender, recipient,
                                            str(info.get("symbol") or "TRC20"), str(info.get("address") or "") or None,
                                            decimals, amount, timestamp, "millisecond",
                                            str(item.get("block_number")) if item.get("block_number") is not None else None,
                                            item.get("block_hash"), None, "finalized", "successful", "token"))
        return result


def _fingerprint(payload: dict[str, Any]) -> str | None:
    meta = payload.get("meta") or {}
    value = meta.get("fingerprint") if isinstance(meta, dict) else None
    return str(value) if value else None


def _timestamp(value: Any) -> datetime | None:
    try:
        return datetime.fromtimestamp(int(str(value)) / 1000, tz=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None
