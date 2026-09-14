"""
Application configuration via Pydantic Settings.

Loads from environment variables (or .env file) with validation.
Every secret is typed as ``SecretStr`` so it is never accidentally
serialised into logs or API responses.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

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
        default=None,
        description="GitHub App ID for production App authentication",
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
    @property
    def is_github_app_configured(self) -> bool:
        """Return True if GitHub App ID and private key are configured."""
        return bool(
            self.github_app_id
            and self.github_private_key
            and self.github_private_key.get_secret_value().strip()
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached ``Settings`` singleton.

    Using ``lru_cache`` avoids re-parsing the environment on every
    dependency injection call while still allowing tests to clear the
    cache via ``get_settings.cache_clear()``.
    """
    return Settings()  # type: ignore[call-arg]
