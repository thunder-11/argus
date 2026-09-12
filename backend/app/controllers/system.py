"""Controller functions for service health without HTTP-specific state."""

from app.core.config import Settings


def liveness_payload(settings: Settings) -> dict:
    return {"status": "ok", "service": "sih26183-backend", "version": settings.app_version}


def readiness_payload(settings: Settings) -> dict:
    providers = settings.provider_status()
    unavailable = [chain for chain, state in providers.items() if state != "configured"]
    return {
        "status": "ready" if settings.fixture_data_enabled or not unavailable else "degraded",
        "data_mode": settings.data_mode,
        "providers": providers,
        "warnings": [f"Missing provider configuration: {', '.join(unavailable)}"] if unavailable else [],
    }
