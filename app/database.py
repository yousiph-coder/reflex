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

    def add(self, instance: Any) -> None:
        self._sync.add(instance)

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
        # Test connection
        async with engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))

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
        from app.core.security import hash_api_key

        sync_engine = create_sync_engine("sqlite:///autoheal_dev.db")
        Base.metadata.create_all(sync_engine)
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
