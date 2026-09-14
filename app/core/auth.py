"""
FastAPI authentication and tenant-isolation dependencies.

Validates incoming requests using the ``X-API-Key`` header, verifies the
key's SHA-256 hash against the database, checks active status and expiration,
and provides the authenticated ``Organization`` tenant context.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Sequence

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_api_key
from app.database import get_db_session
from app.models.organization import APIKey, Organization

logger = logging.getLogger(__name__)

# Standard OpenAPI security scheme for API Key header
api_key_header = APIKeyHeader(
    name="X-API-Key",
    auto_error=False,
    description="Tenant API key secret (e.g. ah_live_...)",
)


async def get_current_org(
    raw_api_key: str | None = Security(api_key_header),
    db: AsyncSession = Depends(get_db_session),
) -> Organization:
    """FastAPI dependency that validates the ``X-API-Key`` header.

    Returns the authenticated ``Organization`` tenant model.

    Raises
    ------
    HTTPException(401)
        If the header is missing, invalid, inactive, or expired.
    HTTPException(403)
        If the organization itself is deactivated.
    """
    if not raw_api_key:
        logger.warning("Authentication failed: Missing X-API-Key header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing 'X-API-Key' authentication header",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Hash the inbound key for constant-time index lookup
    hashed = hash_api_key(raw_api_key.strip())

    query = (
        select(APIKey)
        .options(selectinload(APIKey.organization))
        .where(APIKey.hashed_key == hashed)
    )
    result = await db.execute(query)
    api_key = result.scalar_one_or_none()

    if api_key is None:
        logger.warning("Authentication failed: Invalid API key hash")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if not api_key.is_active:
        logger.warning("Authentication failed: API key %s is deactivated", api_key.key_prefix)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has been deactivated",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Expiration check
    now = datetime.now(timezone.utc)
    if api_key.expires_at and api_key.expires_at < now:
        logger.warning("Authentication failed: API key %s expired on %s", api_key.key_prefix, api_key.expires_at)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has expired",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    org = api_key.organization
    if not org or not org.is_active:
        logger.warning("Authentication failed: Organization %s is inactive", org.id if org else "unknown")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account is suspended or inactive",
        )

    # Touch last_used_at timestamp non-blockingly
    api_key.last_used_at = now

    return org


class RequireScopes:
    """Dependency callable to verify that the active API key has required scopes."""

    def __init__(self, *required_scopes: str) -> None:
        self.required_scopes = set(required_scopes)

    async def __call__(
        self,
        raw_api_key: str | None = Security(api_key_header),
        db: AsyncSession = Depends(get_db_session),
    ) -> Organization:
        org = await get_current_org(raw_api_key=raw_api_key, db=db)
        if not self.required_scopes:
            return org

        # Fetch API key again to verify scopes
        hashed = hash_api_key(raw_api_key.strip())  # type: ignore[union-attr]
        stmt = select(APIKey.scopes).where(APIKey.hashed_key == hashed)
        res = await db.execute(stmt)
        scopes: Sequence[str] = res.scalar_one_or_none() or []
        key_scopes = set(scopes)

        missing = self.required_scopes - key_scopes
        if missing:
            logger.warning(
                "Access denied for org %s: Key missing required scopes: %s",
                org.slug,
                missing,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"API key missing required permission scope(s): {', '.join(missing)}",
            )

        return org
