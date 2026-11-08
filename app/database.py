"""
Async SQLAlchemy 2.0 engine and session factory for PostgreSQL.

Provides:
- ``async_engine`` — the shared ``AsyncEngine`` instance.
- ``async_session_factory`` — a pre-configured ``async_sessionmaker``.
- ``get_db_session`` — an async-generator FastAPI dependency that yields
  a transactional ``AsyncSession`` and rolls back on unhandled exceptions.
- ``init_db`` / ``close_db`` — lifecycle helpers called from the FastAPI
  lifespan context manager.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

logger = logging.getLogger(__name__)


# ── Declarative base ────────────────────────────────────────────
class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


# ── Engine & session factory (module-level singletons) ──────────
_engine: Any = None
_session_factory: Any = None


class AsyncSessionAdapter:
    """Async wrapper around a synchronous SQLAlchemy session for dev fallback."""

    def __init__(self, sync_session: Any) -> None:
        self._sync = sync_session

    async def execute(self, statement: Any, *args: Any, **kwargs: Any) -> Any:
        import asyncio
        return await asyncio.to_thread(self._sync.execute, statement, *args, **kwargs)

    async def scalar(self, statement: Any, *args: Any, **kwargs: Any) -> Any:
        import asyncio
        return await asyncio.to_thread(self._sync.scalar, statement, *args, **kwargs)

    async def scalars(self, statement: Any, *args: Any, **kwargs: Any) -> Any:
        import asyncio
        return await asyncio.to_thread(self._sync.scalars, statement, *args, **kwargs)

    def add(self, instance: Any) -> None:
        self._sync.add(instance)

    async def delete(self, instance: Any) -> None:
        import asyncio
        await asyncio.to_thread(self._sync.delete, instance)

    async def refresh(self, instance: Any, *args: Any, **kwargs: Any) -> None:
        import asyncio
        await asyncio.to_thread(self._sync.refresh, instance, *args, **kwargs)

    async def get(self, entity: Any, ident: Any, *args: Any, **kwargs: Any) -> Any:
        import asyncio
        return await asyncio.to_thread(self._sync.get, entity, ident, *args, **kwargs)

    async def flush(self) -> None:
        import asyncio
        await asyncio.to_thread(self._sync.flush)

    async def commit(self) -> None:
        import asyncio
        await asyncio.to_thread(self._sync.commit)

    async def rollback(self) -> None:
        import asyncio
        await asyncio.to_thread(self._sync.rollback)

    async def close(self) -> None:
        import asyncio
        await asyncio.to_thread(self._sync.close)

    async def __aenter__(self) -> "AsyncSessionAdapter":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if exc_type is not None:
            await self.rollback()
        await self.close()


async def init_db() -> None:
    """Create the async engine and session factory.

    Attempts connection to PostgreSQL. If PostgreSQL is offline, seamlessly
    falls back to SQLite for local development and testing.
    """
    global _engine, _session_factory  # noqa: PLW0603

    settings = get_settings()

    # Try connecting to configured async PostgreSQL
    use_fallback = False
    try:
        engine = create_async_engine(
            settings.database_url,
            echo=settings.db_echo,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=2,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        # Test connection & ensure columns exist
        async with engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
            try:
                await conn.execute(text("""
                    ALTER TABLE organizations 
                    ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT,
                    ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
                    ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT TRUE;
                """))
                await conn.commit()
            except Exception:
                pass

        _engine = engine
        _session_factory = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        logger.info(
            "PostgreSQL database engine initialised (pool_size=%d, max_overflow=%d)",
            settings.db_pool_size,
            settings.db_max_overflow,
        )
    except Exception as exc:
        logger.warning(
            "PostgreSQL connection unavailable (%s); falling back to local SQLite database (autoheal_dev.db).",
            exc,
        )
        use_fallback = True

    if use_fallback:
        from sqlalchemy import create_engine as create_sync_engine
        from sqlalchemy.orm import sessionmaker as sync_sessionmaker
        from app.models.organization import Organization, APIKey, PlanTier
        from app.models.repository import Repository, SentryProjectMapping, RemediationMode
        from app.models.tenant import User, OrganizationMember, MemberRole
        from app.core.security import hash_api_key

        sync_engine = create_sync_engine("sqlite:///autoheal_dev.db")
        Base.metadata.create_all(sync_engine)
        with sync_engine.connect() as conn:
            from sqlalchemy import text
            try:
                conn.execute(text("ALTER TABLE organizations ADD COLUMN github_installation_id INTEGER"))
                conn.commit()
            except Exception:
                pass
            for col_stmt in [
                "ALTER TABLE organizations ADD COLUMN plan VARCHAR(32) DEFAULT 'free'",
                "ALTER TABLE organizations ADD COLUMN stripe_customer_id VARCHAR(256)",
                "ALTER TABLE organizations ADD COLUMN stripe_subscription_id VARCHAR(256)",
                "ALTER TABLE organizations ADD COLUMN monthly_heals_used INTEGER DEFAULT 0",
                "ALTER TABLE organizations ADD COLUMN subscription_status VARCHAR(32) DEFAULT 'active'",
                "ALTER TABLE organizations ADD COLUMN discord_webhook_url TEXT",
                "ALTER TABLE organizations ADD COLUMN slack_webhook_url TEXT",
                "ALTER TABLE organizations ADD COLUMN alerts_enabled BOOLEAN DEFAULT 1",
            ]:
                try:
                    conn.execute(text(col_stmt))
                    conn.commit()
                except Exception:
                    pass
            try:
                conn.execute(text("ALTER TABLE repositories ADD COLUMN github_repo_id INTEGER"))
                conn.commit()
            except Exception:
                pass
        sync_factory = sync_sessionmaker(bind=sync_engine)

        # Ensure default org & API key exist
        with sync_factory() as s:
            org = s.query(Organization).first()
            if not org:
                org = Organization(name="Default Organization", slug="default-org", plan_tier=PlanTier.PRO)
                s.add(org)
                s.flush()
            key_hash = hash_api_key("ah_live_test_secret_key_123456")
            key = s.query(APIKey).filter(APIKey.hashed_key == key_hash).first()
            if not key:
                key = APIKey(
                    organization_id=org.id,
                    name="Default Admin Key",
                    key_prefix="ah_live_test_sec",
                    hashed_key=key_hash,
                    scopes=["incidents:read", "incidents:write", "webhooks:write", "analytics:read"],
                    is_active=True,
                )
                s.add(key)
            repo = s.query(Repository).first()
            if not repo:
                repo = Repository(
                    organization_id=str(org.id),
                    repo_owner="yousiph-coder",
                    repo_name="autoheal-target-demo",
                    default_branch="main",
                    language="python",
                    is_private=False,
                    monorepo_path="/",
                    remediation_mode=RemediationMode.AUTONOMOUS,
                    test_command="pytest -xvs tests/",
                    llm_model="gpt-4o",
                    is_active=True,
                    open_prs_count=1,
                    merged_prs_count=0,
                )
                s.add(repo)
                s.flush()
                mapping = SentryProjectMapping(
                    repository_id=repo.id,
                    sentry_org_slug="autoheal-org",
                    sentry_project_slug="autoheal-target-demo",
                    environment="production",
                    path_prefix="/",
                )
                s.add(mapping)

            # Seed mock dev user + membership for MOCK_AUTH mode
            import uuid as _uuid
            mock_user_id = _uuid.UUID("00000000-0000-0000-0000-000000000001")
            dev_user = s.query(User).filter(User.id == mock_user_id).first()
            if not dev_user:
                dev_user = User(
                    id=mock_user_id,
                    email="dev@autoheal.local",
                    name="Dev User",
                )
                s.add(dev_user)
                s.flush()
            dev_membership = (
                s.query(OrganizationMember)
                .filter(
                    OrganizationMember.user_id == mock_user_id,
                    OrganizationMember.organization_id == org.id,
                )
                .first()
            )
            if not dev_membership:
                s.add(OrganizationMember(
                    user_id=mock_user_id,
                    organization_id=org.id,
                    role=MemberRole.OWNER,
                ))

            s.commit()

        _engine = sync_engine
        _session_factory = lambda: AsyncSessionAdapter(sync_factory())
        logger.info("SQLite fallback engine initialised with active schema & seeded credentials.")


async def close_db() -> None:
    """Dispose of the engine's connection pool."""
    global _engine, _session_factory  # noqa: PLW0603
    if _engine is not None:
        if hasattr(_engine, "dispose"):
            res = _engine.dispose()
            if asyncio.iscoroutine(res):
                await res
        logger.info("Database engine disposed")
        _engine = None
        _session_factory = None


def get_engine() -> Any:
    """Return the current engine (or raise if uninitialised)."""
    if _engine is None:
        raise RuntimeError("Database engine is not initialised. Call init_db() first.")
    return _engine


def get_session_factory() -> Any:
    """Return the current session factory (or raise if uninitialised)."""
    if _session_factory is None:
        raise RuntimeError("Session factory is not initialised. Call init_db() first.")
    return _session_factory


async def get_db_session() -> AsyncGenerator[Any, None]:
    """FastAPI dependency that provides a scoped session."""
    factory = get_session_factory()
    session = factory()
    async with session as s:
        try:
            yield s
            await s.commit()
        except Exception:
            await s.rollback()
            raise
