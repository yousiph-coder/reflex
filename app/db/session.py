"""Database session factory providing sync SessionLocal."""

from __future__ import annotations

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings


def _get_sync_engine():
    settings = get_settings()
    db_url = settings.database_url
    if db_url.startswith("postgresql+asyncpg://"):
        sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        try:
            engine = create_engine(sync_url, pool_pre_ping=True)
            with engine.connect() as conn:
                pass
            return engine
        except Exception:
            pass

    # SQLite fallback
    sqlite_path = "autoheal_dev.db"
    return create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})


_sync_engine = _get_sync_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_sync_engine)

__all__ = ["SessionLocal", "_sync_engine"]
