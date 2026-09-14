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
# These are initialised lazily by ``init_db()`` and torn down by
# ``close_db()`` so that configuration is fully loaded before the
# engine is created.

_engine = None
_session_factory = None


async def init_db() -> None:
    """Create the async engine and session factory.

    Must be called once during application startup (see ``main.py``).
    """
    global _engine, _session_factory  # noqa: PLW0603

    settings = get_settings()

    _engine = create_async_engine(
        settings.database_url,
        echo=settings.db_echo,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    logger.info(
        "Database engine initialised (pool_size=%d, max_overflow=%d)",
        settings.db_pool_size,
        settings.db_max_overflow,
    )


async def close_db() -> None:
    """Dispose of the engine's connection pool.

    Must be called during application shutdown.
    """
    global _engine, _session_factory  # noqa: PLW0603
    if _engine is not None:
        await _engine.dispose()
        logger.info("Database engine disposed")
        _engine = None
        _session_factory = None


def get_engine():
    """Return the current async engine (or raise if uninitialised)."""
    if _engine is None:
        raise RuntimeError(
            "Database engine is not initialised. Call init_db() first."
        )
    return _engine


def get_session_factory():
    """Return the current session factory (or raise if uninitialised)."""
    if _session_factory is None:
        raise RuntimeError(
            "Session factory is not initialised. Call init_db() first."
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides a scoped ``AsyncSession``.

    The session is committed automatically when the route handler
    returns without error.  On any exception the transaction is
    rolled back and the error re-raised so FastAPI's exception
    handlers can deal with it.

    Usage::

        @router.post("/things")
        async def create_thing(
            db: AsyncSession = Depends(get_db_session),
        ):
            ...
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
