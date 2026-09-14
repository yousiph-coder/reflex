"""
FastAPI application entry point.

Sets up:
- Async lifespan (DB + Redis init / teardown)
- Structured JSON logging
- CORS middleware
- Request-ID middleware (injects ``X-Request-ID`` header)
- Health-check endpoint
- API v1 router mount
"""

from __future__ import annotations

import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import (
    analytics_router,
    incidents_router,
    organizations_router,
    webhooks_router,
)
from app.config import get_settings
from app.core.deduplicator import close_redis, init_redis
from app.database import close_db, init_db


# ── Logging ─────────────────────────────────────────────────────

def _configure_logging() -> None:
    """Set up structured logging to stdout."""
    settings = get_settings()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt=(
                '{"time":"%(asctime)s","level":"%(levelname)s",'
                '"logger":"%(name)s","message":"%(message)s"}'
            ),
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    )

    root = logging.getLogger()
    root.setLevel(settings.log_level)
    root.handlers.clear()
    root.addHandler(handler)

    # Quieten noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.db_echo else logging.WARNING
    )


# ── Lifespan ────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup / shutdown lifecycle manager."""
    logger = logging.getLogger("app.lifespan")

    # ── Startup ──
    _configure_logging()
    logger.info("Starting Auto-Heal AI …")

    try:
        await init_db()
        logger.info("PostgreSQL connection pool ready")
    except Exception as exc:
        logger.warning("PostgreSQL connection pool could not be established: %s", exc)

    try:
        await init_redis()
        logger.info("Redis connection pool ready")
    except Exception as exc:
        logger.warning("Redis connection could not be established: %s", exc)

    yield  # hand control to the running application

    # ── Shutdown ──
    logger.info("Shutting down Auto-Heal AI …")
    try:
        await close_redis()
    except Exception:
        pass
    try:
        await close_db()
    except Exception:
        pass
    logger.info("Shutdown complete")


# ── Application factory ────────────────────────────────────────

def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Auto-Heal AI",
        description=(
            "Autonomous SRE & incident remediation agent. "
            "Receives Sentry alerts, analyses root causes via LLM, "
            "and opens GitHub PRs with fixes."
        ),
        version="0.1.0",
        debug=settings.debug,
        lifespan=lifespan,
        docs_url="/docs" if settings.app_env != "production" else None,
        redoc_url="/redoc" if settings.app_env != "production" else None,
    )

    # ── CORS ────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # ── Request-ID + timing middleware ──────────────────────────
    @app.middleware("http")
    async def request_context_middleware(
        request: Request,
        call_next,
    ) -> Response:
        """Inject a unique request ID and measure latency."""
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start = time.perf_counter()

        # Stash on request state so handlers can read it
        request.state.request_id = request_id

        response: Response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"

        logger = logging.getLogger("app.http")
        logger.info(
            "%s %s → %d (%.1fms) [%s]",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id[:8],
        )
        return response

    # ── Global exception handler ────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """Catch-all handler that prevents stack traces from leaking."""
        request_id = getattr(request.state, "request_id", "unknown")
        logger = logging.getLogger("app.error")
        logger.exception(
            "Unhandled exception [request_id=%s]: %s",
            request_id,
            exc,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": request_id,
            },
        )

    # ── Routes ──────────────────────────────────────────────────
    @app.get(
        "/health",
        tags=["infra"],
        summary="Health check",
    )
    async def health_check() -> dict:
        """Shallow liveness probe for load-balancers / k8s."""
        return {
            "status": "healthy",
            "service": settings.app_name,
            "environment": settings.app_env,
        }

    @app.get(
        "/ready",
        tags=["infra"],
        summary="Readiness check",
    )
    async def readiness_check() -> dict:
        """Deep readiness probe — verifies DB and Redis connectivity."""
        from app.core.deduplicator import get_redis
        from app.database import get_engine

        errors: list[str] = []

        # Check DB
        try:
            engine = get_engine()
            async with engine.connect() as conn:
                await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        except Exception as exc:
            errors.append(f"database: {exc}")

        # Check Redis
        try:
            redis = get_redis()
            await redis.ping()
        except Exception as exc:
            errors.append(f"redis: {exc}")

        if errors:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "errors": errors,
                },
            )

        return {"status": "ready"}

    # Mount API v1
    app.include_router(webhooks_router, prefix="/api/v1")
    app.include_router(incidents_router, prefix="/api/v1")
    app.include_router(analytics_router, prefix="/api/v1")
    app.include_router(organizations_router, prefix="/api/v1")

    return app


# ── Module-level app instance for ``uvicorn app.main:app`` ─────
app = create_app()
