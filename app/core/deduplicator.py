"""
Redis-based incident deduplication / debouncing.

Generates a deterministic SHA-256 fingerprint from
``(sentry_issue_id, file_path, error_type)`` and uses a Redis
``SET NX`` with a configurable TTL (default 60 s) as a distributed
lock to prevent the same incident from being processed more than
once within the debounce window.

This module is fully async and safe for concurrent use.
"""

from __future__ import annotations

import hashlib
import logging
from typing import TYPE_CHECKING

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None  # type: ignore

from app.config import get_settings

if TYPE_CHECKING:
    import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

_REDIS_KEY_PREFIX = "autoheal:dedup:"


class IncidentDeduplicator:
    """Async Redis-backed deduplication guard.

    Usage::

        dedup = IncidentDeduplicator(redis_client)

        fingerprint = dedup.fingerprint(issue_id, file_path, error_type)
        is_new = await dedup.is_new(fingerprint)
        if not is_new:
            return  # skip duplicate
    """

    def __init__(self, redis: aioredis.Redis, *, ttl: int | None = None) -> None:
        """
        Parameters
        ----------
        redis:
            An initialised ``redis.asyncio.Redis`` client.
        ttl:
            Lock TTL in seconds.  Falls back to
            ``settings.dedup_ttl_seconds`` (default 60).
        """
        self._redis = redis
        self._ttl = ttl if ttl is not None else get_settings().dedup_ttl_seconds

    # ── Fingerprinting ──────────────────────────────────────────
    @staticmethod
    def fingerprint(
        sentry_issue_id: str,
        file_path: str | None,
        error_type: str,
    ) -> str:
        """Compute a deterministic SHA-256 hex digest.

        The three input fields are normalised (stripped, lowered) and
        joined with ``|`` before hashing to ensure stable fingerprints
        regardless of casing or surrounding whitespace.

        Parameters
        ----------
        sentry_issue_id:
            The Sentry issue/group ID.
        file_path:
            Primary file path from the top in-app stack frame.
            ``None`` is normalised to the literal string ``"<none>"``.
        error_type:
            Fully-qualified exception class name.

        Returns
        -------
        str
            64-character lowercase hex SHA-256 digest.
        """
        normalised_issue = sentry_issue_id.strip().lower()
        normalised_path = (file_path or "<none>").strip().lower()
        normalised_type = error_type.strip().lower()

        raw = f"{normalised_issue}|{normalised_path}|{normalised_type}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    # ── Dedup check ─────────────────────────────────────────────
    async def is_new(self, fingerprint: str) -> bool:
        """Attempt to acquire a dedup lock for *fingerprint*.

        Returns ``True`` **only** when the lock was freshly acquired
        (i.e. this is a genuinely new incident within the TTL window).
        Returns ``False`` when the fingerprint has already been seen.
        """
        key = f"{_REDIS_KEY_PREFIX}{fingerprint}"

        # SET key 1 NX EX ttl — atomic "set if not exists" with expiry
        acquired: bool | None = await self._redis.set(
            name=key,
            value="1",
            nx=True,
            ex=self._ttl,
        )

        if acquired:
            logger.debug(
                "Dedup PASS — new fingerprint %s (TTL=%ds)",
                fingerprint[:16],
                self._ttl,
            )
            return True

        logger.info(
            "Dedup BLOCK — duplicate fingerprint %s within %ds window",
            fingerprint[:16],
            self._ttl,
        )
        return False

    async def release(self, fingerprint: str) -> bool:
        """Manually release a dedup lock (e.g. after a processing failure).

        Returns ``True`` if the key was deleted, ``False`` if it had
        already expired or didn't exist.
        """
        key = f"{_REDIS_KEY_PREFIX}{fingerprint}"
        deleted = await self._redis.delete(key)
        return deleted > 0

    async def remaining_ttl(self, fingerprint: str) -> int:
        """Return the remaining TTL in seconds for a fingerprint lock.

        Returns ``-2`` if the key does not exist, ``-1`` if the key
        has no expiry (shouldn't happen with this module).
        """
        key = f"{_REDIS_KEY_PREFIX}{fingerprint}"
        return await self._redis.ttl(key)


# ── Module-level factory ────────────────────────────────────────
_redis_pool: aioredis.Redis | None = None


async def init_redis() -> aioredis.Redis:
    """Create (or return the existing) module-level Redis connection pool.

    Called during application startup.
    """
    global _redis_pool  # noqa: PLW0603
    if _redis_pool is None:
        settings = get_settings()
        _redis_pool = aioredis.from_url(
            settings.redis_url,
            max_connections=settings.redis_max_connections,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        # Verify connectivity
        await _redis_pool.ping()
        logger.info("Redis connection pool initialised (%s)", settings.redis_url)
    return _redis_pool


async def close_redis() -> None:
    """Close the Redis connection pool.  Called during application shutdown."""
    global _redis_pool  # noqa: PLW0603
    if _redis_pool is not None:
        await _redis_pool.aclose()
        logger.info("Redis connection pool closed")
        _redis_pool = None


def get_redis() -> aioredis.Redis:
    """Return the active Redis client (raises if uninitialised)."""
    if _redis_pool is None:
        raise RuntimeError("Redis is not initialised. Call init_redis() first.")
    return _redis_pool
