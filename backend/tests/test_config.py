import pytest

from app.core.config import ConfigurationError, Settings


def test_explicit_fixture_mode_is_valid_for_tests():
    settings = Settings.from_env({
        "APP_ENV": "test",
        "DATA_MODE": "fixture",
        "DEMO_ENABLED": "true",
        "JWT_SECRET_KEY": "test-secret",
    })

    settings.validate_startup()
    assert settings.fixture_data_enabled is True


def test_production_rejects_default_secret_wildcard_cors_and_fixture_mode():
    settings = Settings.from_env({
        "APP_ENV": "production",
        "DATA_MODE": "fixture",
        "DEMO_ENABLED": "true",
        "CORS_ALLOWED_ORIGINS": "*",
    })

    with pytest.raises(ConfigurationError) as exc_info:
        settings.validate_startup()

    message = str(exc_info.value)
    assert "JWT_SECRET_KEY" in message
    assert "CORS_ALLOWED_ORIGINS" in message
    assert "fixture or demo data" in message


def test_production_rejects_missing_enabled_provider_credentials():
    settings = Settings.from_env({
        "APP_ENV": "production",
        "DATA_MODE": "live",
        "DEMO_ENABLED": "false",
        "JWT_SECRET_KEY": "a-secure-production-secret-that-is-long-enough",
        "CORS_ALLOWED_ORIGINS": "https://investigator.example",
        "ENABLED_CHAINS": "ETH,TRON",
    })

    with pytest.raises(ConfigurationError) as exc_info:
        settings.validate_startup()

    assert "['ETH', 'TRON']" in str(exc_info.value)


def test_invalid_runtime_mode_is_rejected():
    settings = Settings.from_env({"APP_ENV": "test", "DATA_MODE": "automatic", "DEMO_ENABLED": "false"})

    with pytest.raises(ConfigurationError, match="DATA_MODE"):
        settings.validate_startup()
