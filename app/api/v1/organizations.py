"""
API endpoints for managing the authenticated organization and API keys.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import RequireScopes, get_current_org
from app.core.security import generate_api_key
from app.database import get_db_session
from app.models.organization import APIKey, Organization
from app.schemas.incident import (
    APIKeyCreatedResponse,
    APIKeyCreateRequest,
    APIKeyResponse,
    OrganizationResponse,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/me", response_model=OrganizationResponse, summary="Get current organization")
async def get_my_organization(
    org: Organization = Depends(get_current_org),
) -> OrganizationResponse:
    """Return the profile and plan tier of the currently authenticated organization."""
    return OrganizationResponse.model_validate(org)


@router.get("/api-keys", response_model=list[APIKeyResponse], summary="List organization API keys")
async def list_api_keys(
    org: Organization = Depends(RequireScopes("api_keys:read", "webhooks:write")),
    db: AsyncSession = Depends(get_db_session),
) -> list[APIKeyResponse]:
    """List public metadata for all active and revoked API keys."""
    stmt = select(APIKey).where(APIKey.organization_id == org.id).order_by(APIKey.created_at.desc())
    res = await db.execute(stmt)
    keys = res.scalars().all()
    return [APIKeyResponse.model_validate(k) for k in keys]


@router.post("/api-keys", response_model=APIKeyCreatedResponse, status_code=status.HTTP_201_CREATED, summary="Create new API key")
async def create_api_key(
    payload: APIKeyCreateRequest,
    org: Organization = Depends(RequireScopes("api_keys:write", "webhooks:write")),
    db: AsyncSession = Depends(get_db_session),
) -> APIKeyCreatedResponse:
    """Generate a new secure API key. The plaintext raw_key is returned only once."""
    raw_key, prefix, hashed = generate_api_key(prefix="ah_live_")

    expires_at: datetime | None = None
    if payload.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days)

    api_key = APIKey(
        organization_id=org.id,
        name=payload.name,
        key_prefix=prefix,
        hashed_key=hashed,
        scopes=payload.scopes,
        expires_at=expires_at,
    )
    db.add(api_key)
    await db.flush()

    return APIKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        scopes=api_key.scopes,
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
        raw_key=raw_key,
    )
