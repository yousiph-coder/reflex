"""
Application configuration via Pydantic Settings.

Loads from environment variables (or .env file) with validation.
Every secret is typed as ``SecretStr`` so it is never accidentally
serialised into logs or API responses.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised, validated application settings.

    Reads values from the process environment first, falling back
    to a ``.env`` file located at the project root.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────────
    app_name: str = Field(default="auto-heal-ai", description="Service name for logs & traces")
    app_env: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Runtime environment",
    )
    debug: bool = Field(default=False, description="Enable FastAPI debug mode")
    log_level: str = Field(default="INFO", description="Root log level")
    jwt_secret_key: str = Field(
        default="dev-secret-key-change-in-production",
        description="Secret key for JWT token verification (HS256). Use public key for RS256/Supabase.",
    )

    # ── Supabase Auth ───────────────────────────────────────────
    supabase_url: str = Field(
        default="https://olzjjxeuhbjtvsrtdbpe.supabase.co",
        description="Supabase project base URL",
    )
    supabase_key: SecretStr = Field(
        default=SecretStr(""),
        description="Supabase public/anon publishable key (set via SUPABASE_KEY env var)",
    )
    supabase_service_role_key: SecretStr = Field(
        default=SecretStr(""),
        description="Supabase service role secret key (set via SUPABASE_SERVICE_ROLE_KEY env var)",
    )

    # ── PostgreSQL (async) ──────────────────────────────────────
    database_url: str = Field(
        ...,
        description=(
            "Async-compatible PostgreSQL DSN. "
            "Must start with postgresql+asyncpg:// "
        ),
    )
    db_pool_size: int = Field(default=20, ge=1, le=100, description="SQLAlchemy pool size")
    db_max_overflow: int = Field(default=10, ge=0, le=50, description="Pool max overflow")
    db_pool_timeout: int = Field(default=30, ge=5, description="Pool checkout timeout (s)")
    db_echo: bool = Field(default=False, description="Echo SQL to stdout (dev only)")

    # ── Redis ───────────────────────────────────────────────────
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection string",
    )
    redis_max_connections: int = Field(default=50, ge=1, description="Redis connection-pool cap")
    dedup_ttl_seconds: int = Field(default=60, ge=1, description="Deduplication lock TTL")

    # ── Sentry Webhook ──────────────────────────────────────────
    sentry_client_secret: SecretStr = Field(
        ...,
        description="Sentry integration client secret for HMAC signature verification",
    )

    # ── GitHub ──────────────────────────────────────────────────
    github_token: SecretStr = Field(
        default=SecretStr(""),
        description="GitHub PAT (optional if GitHub App credentials are used)",
    )
    github_owner: str = Field(..., description="GitHub org or user that owns the target repo")
    github_repo: str = Field(..., description="Target repository name")
    github_default_branch: str = Field(default="main", description="Base branch for PRs")
    github_app_id: str | None = Field(
        default="5193276",
        description="GitHub App ID for production App authentication",
    )
    github_app_slug: str = Field(
        default="auto-heal",
        description="GitHub App Slug name",
    )
    github_app_private_key_path: str | None = Field(
        default=None,
        description="Path to GitHub App private key PEM file",
    )
    github_private_key: SecretStr | None = Field(
        default=None,
        description="GitHub App Private Key in PEM format for RS256 JWT signing",
    )
    github_webhook_secret: SecretStr | None = Field(
        default=None,
        description="GitHub App Webhook Secret for HMAC-SHA256 signature verification",
    )

    # ── LLM Provider ────────────────────────────────────────────
    llm_api_key: SecretStr = Field(..., description="API key for the LLM provider")
    llm_model: str = Field(
        default="gpt-4o",
        description="Default LLM model identifier",
    )
    llm_base_url: str = Field(
        default="https://api.openai.com/v1",
        description="LLM API base URL (supports OpenAI-compatible providers)",
    )
    llm_max_tokens: int = Field(default=4096, ge=256, description="Max response tokens")
    llm_temperature: float = Field(default=0.1, ge=0.0, le=2.0, description="Sampling temperature")

    # ── CORS ────────────────────────────────────────────────────
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins",
    )

    # ── Stripe Billing & Frontend ───────────────────────────────
    stripe_secret_key: SecretStr = Field(
        default=SecretStr("sk_test_mockStripeSecretKey1234567890"),
        description="Stripe API secret key",
    )
    stripe_webhook_secret: SecretStr = Field(
        default=SecretStr("whsec_mockWebhookSecret1234567890"),
        description="Stripe webhook endpoint signing secret",
    )
    stripe_pro_price_id: str = Field(
        default="price_1MockProPriceIdMonthly29",
        description="Stripe Pro plan monthly recurring price ID",
    )
    frontend_url: str = Field(
        default="http://localhost:3000",
        description="Frontend application base URL for checkout redirect flows",
    )

    # ── Validators ──────────────────────────────────────────────
    @field_validator("database_url")
    @classmethod
    def _validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "database_url must use the async driver: "
                "postgresql+asyncpg://user:pass@host:port/dbname"
            )
        return v

    @field_validator("log_level")
    @classmethod
    def _normalise_log_level(cls, v: str) -> str:
        normalised = v.upper()
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if normalised not in valid:
            raise ValueError(f"log_level must be one of {valid}")

    @field_validator("supabase_url")
    @classmethod
    def _normalise_supabase_url(cls, v: str) -> str:
        clean = v.strip().rstrip("/")
        if clean.endswith("/rest/v1"):
            clean = clean[:-8].rstrip("/")
        return clean

    @field_validator("github_private_key", mode="before")
    @classmethod
    def _load_github_private_key(cls, v: Any) -> Any:
        if isinstance(v, str):
            cleaned = v.strip().strip("'\"")
            if os.path.isfile(cleaned):
                with open(cleaned, "r", encoding="utf-8") as f:
                    return f.read().strip()
            if cleaned.startswith("-----BEGIN"):
                return cleaned

        key_path_env = os.environ.get("GITHUB_APP_PRIVATE_KEY_PATH")
        if key_path_env:
            for candidate in [key_path_env, os.path.join("backend", key_path_env)]:
                if os.path.isfile(candidate):
                    with open(candidate, "r", encoding="utf-8") as f:
                        return f.read().strip()

        for candidate in [
            os.path.join("backend", "secrets", "github_app.pem"),
            os.path.join("secrets", "github_app.pem"),
        ]:
            if os.path.isfile(candidate):
                with open(candidate, "r", encoding="utf-8") as f:
                    return f.read().strip()

        return v
    @property
    def is_github_app_configured(self) -> bool:
        """Return True if GitHub App ID and private key are configured."""
        return bool(
            self.github_app_id
            and self.github_private_key
            and self.github_private_key.get_secret_value().strip()
        )

    @property
    def SUPABASE_URL(self) -> str:
        """Supabase base URL string."""
        return self.supabase_url

    @property
    def SUPABASE_KEY(self) -> str:
        """Supabase public/anon publishable key string."""
        return (
            self.supabase_key.get_secret_value()
            if hasattr(self.supabase_key, "get_secret_value")
            else str(self.supabase_key)
        )

    @property
    def SUPABASE_SERVICE_ROLE_KEY(self) -> str:
        """Supabase service role secret key string."""
        return (
            self.supabase_service_role_key.get_secret_value()
            if hasattr(self.supabase_service_role_key, "get_secret_value")
            else str(self.supabase_service_role_key)
        )

    @property
    def STRIPE_SECRET_KEY(self) -> str:
        """Stripe API secret key."""
        return (
            self.stripe_secret_key.get_secret_value()
            if hasattr(self.stripe_secret_key, "get_secret_value")
            else str(self.stripe_secret_key)
        )

    @property
    def STRIPE_WEBHOOK_SECRET(self) -> str:
        """Stripe webhook signing secret."""
        return (
            self.stripe_webhook_secret.get_secret_value()
            if hasattr(self.stripe_webhook_secret, "get_secret_value")
            else str(self.stripe_webhook_secret)
        )

    @property
    def STRIPE_PRO_PRICE_ID(self) -> str:
        """Stripe Pro plan price ID."""
        return self.stripe_pro_price_id

    @property
    def FRONTEND_URL(self) -> str:
        """Frontend application URL."""
        return self.frontend_url


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached ``Settings`` singleton.

    Using ``lru_cache`` avoids re-parsing the environment on every
    dependency injection call while still allowing tests to clear the
    cache via ``get_settings.cache_clear()``.
    """
    return Settings()  # type: ignore[call-arg]
