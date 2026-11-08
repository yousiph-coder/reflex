"""
FastAPI authentication and tenant-isolation dependencies.

Supports TWO authentication modes:

1. **JWT Bearer Token** (primary) — validates a Bearer JWT from
   Supabase Auth.  Resolves the ``User``
   and verifies organization membership.

2. **API Key** (legacy / webhooks) — validates the ``X-API-Key``
   header using SHA-256 hash lookup, returning the ``Organization``
   directly.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Sequence

from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.core.security import hash_api_key
from app.database import get_db_session
from app.models.organization import APIKey, Organization, PlanTier
from app.models.tenant import MemberRole, OrganizationMember, User

logger = logging.getLogger(__name__)

# ── Security schemes ────────────────────────────────────────────
bearer_scheme = HTTPBearer(auto_error=False, description="JWT Bearer token (Supabase Auth)")
api_key_header = APIKeyHeader(
    name="X-API-Key",
    auto_error=False,
    description="Tenant API key secret (e.g. ah_live_...)",
)


def get_supabase_client() -> Client:
    """Return a Supabase Client instance using core settings."""
    from supabase import Client, create_client
    from app.core.config import settings

    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


# ═══════════════════════════════════════════════════════════════
#  JWT-based Auth:  get_current_user  →  get_current_tenant
# ═══════════════════════════════════════════════════════════════

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """Validate a Supabase Bearer JWT token and return the authenticated ``User``.

    Validates the token against the Supabase Auth server. Auto-provisions
    the user and their default workspace organization (``{email}'s Org``)
    on first login.
    """
    if not credentials or not credentials.credentials or not credentials.credentials.strip():
        logger.warning("Missing Bearer token in request header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()

    # ── Direct Supabase Auth Validation ─────────────────────────
    try:
        from supabase import Client
        supabase_client: Client = get_supabase_client()
        user_response = supabase_client.auth.get_user(jwt=token)
    except Exception as exc:
        logger.warning("Supabase token validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if not user_response or not getattr(user_response, "user", None):
        logger.warning("Supabase returned empty user response")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sb_user = user_response.user
    sb_user_id_str = str(sb_user.id)
    try:
        user_uuid = uuid.UUID(sb_user_id_str)
    except ValueError:
        user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, sb_user_id_str)

    # Extract claims & metadata (supports Email/Password and GitHub OAuth)
    claims: dict = {}
    try:
        import jwt as pyjwt
        claims = pyjwt.decode(token, options={"verify_signature": False})
    except Exception:
        claims = {}

    user_metadata = getattr(sb_user, "user_metadata", {}) or claims.get("user_metadata", {}) or {}
    sb_email = (
        sb_user.email
        or claims.get("email")
        or user_metadata.get("email")
        or f"{user_uuid}@supabase.local"
    )
    sb_name = (
        user_metadata.get("name")
        or user_metadata.get("full_name")
        or user_metadata.get("user_name")
        or (sb_email.split("@")[0] if "@" in sb_email else "")
    )

    # Extract GitHub user ID if present (GitHub OAuth)
    github_id = None
    identities = getattr(sb_user, "identities", []) or []
    for identity in identities:
        provider = getattr(identity, "provider", None) or (identity.get("provider") if isinstance(identity, dict) else None)
        if provider == "github":
            ident_id = getattr(identity, "id", None) or (identity.get("id") if isinstance(identity, dict) else None)
            if ident_id:
                github_id = str(ident_id)
                break
    if not github_id and (user_metadata.get("provider_id") or claims.get("provider_id")):
        github_id = str(user_metadata.get("provider_id") or claims.get("provider_id"))

    # 1. Check if user exists in the local database users table. If not, create it.
    stmt = select(User).where(User.id == user_uuid)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user is None:
        stmt_email = select(User).where(User.email == sb_email)
        res_email = await db.execute(stmt_email)
        user = res_email.scalar_one_or_none()

    if user is None and github_id:
        stmt_gh = select(User).where(User.github_id == github_id)
        res_gh = await db.execute(stmt_gh)
        user = res_gh.scalar_one_or_none()

    is_first_login = False
    if user is None:
        user = User(
            id=user_uuid,
            email=sb_email,
            name=sb_name,
            github_id=github_id,
        )
        db.add(user)
        await db.flush()
        is_first_login = True
        logger.info("Auto-provisioned new user %s (%s) from Supabase Auth", user.id, user.email)
    else:
        # Keep name and github_id updated if newly available
        updated = False
        if not user.github_id and github_id:
            user.github_id = github_id
            updated = True
        if not user.name and sb_name:
            user.name = sb_name
            updated = True
        if updated:
            await db.flush()

    # 2. Check if the user has an active organization.
    member_stmt = (
        select(OrganizationMember)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .where(
            OrganizationMember.user_id == user.id,
            Organization.is_active.is_(True),
        )
        .limit(1)
    )
    member_res = await db.execute(member_stmt)
    has_active_org = member_res.scalar_one_or_none() is not None

    # 3. If not, auto-create a default workspace organization:
    #    Organization(name=f"{email.split('@')[0]}'s Workspace", slug=..., plan="free")
    #    Add user to OrganizationMember as owner.
    if is_first_login or not has_active_org:
        raw_prefix = sb_email.split("@")[0] if "@" in sb_email else "user"
        clean_prefix = raw_prefix.lower()
        org_slug = f"{clean_prefix[:20]}-workspace-{uuid.uuid4().hex[:6]}"
        org_name = f"{raw_prefix}'s Workspace"
        new_org = Organization(
            id=uuid.uuid4(),
            name=org_name,
            slug=org_slug,
            plan_tier=PlanTier.FREE,
        )
        db.add(new_org)
        await db.flush()

        new_membership = OrganizationMember(
            id=uuid.uuid4(),
            user_id=user.id,
            organization_id=new_org.id,
            role=MemberRole.OWNER,
        )
        db.add(new_membership)
        await db.commit()
        logger.info("Created default workspace organization '%s' (%s) for user %s", org_name, new_org.id, user.id)

    return user


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> User | None:
    """Optional wrapper around get_current_user that returns None instead of raising 401."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_tenant(
    user: Optional[User] = Depends(get_optional_current_user),
    raw_api_key: str | None = Security(api_key_header),
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    x_org_id: Optional[str] = Header(None, alias="X-Org-Id"),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    db: AsyncSession = Depends(get_db_session),
) -> Organization:
    """Resolve and validate the caller's tenant organization.

    Supports:
    1. Authenticated Supabase User (resolves membership / default org).
    2. API Key authentication via X-API-Key or Bearer token header.
    """
    requested_org_id: Optional[str] = None
    if isinstance(x_org_id, str) and x_org_id.strip():
        requested_org_id = x_org_id.strip()
    elif isinstance(x_organization_id, str) and x_organization_id.strip():
        requested_org_id = x_organization_id.strip()

    # 1. If an Authorization Bearer header was supplied
    if isinstance(credentials, HTTPAuthorizationCredentials) and credentials.credentials:
        token_str = credentials.credentials.strip()
        # Check if caller provided an API key in the Authorization header
        if token_str.startswith("ah_"):
            return await get_current_org(raw_api_key=token_str, db=db)
        # Otherwise, the token is expected to be a Supabase JWT.
        # If user validation failed, reject with 401 immediately.
        if not isinstance(user, User):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 2. Supabase Authenticated User (from Bearer token or explicit dependency injection)
    if isinstance(user, User):
        if requested_org_id:
            try:
                org_uuid = uuid.UUID(requested_org_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid organization ID header format",
                )

            # Check if the requested organization exists in DB
            stmt = select(Organization).where(Organization.id == org_uuid)
            res = await db.execute(stmt)
            target_org = res.scalar_one_or_none()

            if target_org is None:
                logger.warning(
                    "Access denied: organization %s does not exist",
                    requested_org_id,
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied for current organization workspace.",
                )

            if not target_org.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization account is suspended or inactive",
                )

            # Check if OrganizationMember exists for this user and organization
            member_stmt = select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.organization_id == target_org.id,
            )
            member_res = await db.execute(member_stmt)
            membership = member_res.scalar_one_or_none()

            # IF NOT FOUND: Automatically auto-heal membership as owner and commit
            if membership is None:
                new_membership = OrganizationMember(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    organization_id=target_org.id,
                    role=MemberRole.OWNER,
                )
                db.add(new_membership)
                await db.commit()
                logger.info(
                    "Auto-healed workspace membership: assigned user %s as OWNER to org '%s' (%s)",
                    user.id,
                    target_org.name,
                    target_org.id,
                )

            return target_org

        # Fallback: If no organization ID is provided in headers, default to the user's first available organization
        stmt = (
            select(OrganizationMember)
            .options(selectinload(OrganizationMember.organization))
            .where(OrganizationMember.user_id == user.id)
            .order_by(OrganizationMember.created_at.asc())
            .limit(1)
        )
        res = await db.execute(stmt)
        membership = res.scalar_one_or_none()

        if membership is not None and membership.organization is not None:
            org = membership.organization
            if not org.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization account is suspended or inactive",
                )
            return org

        # Fallback: check first available active organization in DB
        fallback_stmt = (
            select(Organization)
            .where(Organization.is_active.is_(True))
            .order_by(Organization.created_at.asc())
            .limit(1)
        )
        fallback_res = await db.execute(fallback_stmt)
        first_org = fallback_res.scalar_one_or_none()

        if first_org is not None:
            new_membership = OrganizationMember(
                id=uuid.uuid4(),
                user_id=user.id,
                organization_id=first_org.id,
                role=MemberRole.OWNER,
            )
            db.add(new_membership)
            await db.commit()
            logger.info(
                "Auto-healed default workspace membership: assigned user %s as OWNER to first available org '%s' (%s)",
                user.id,
                first_org.name,
                first_org.id,
            )
            return first_org

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no active organizations",
        )

    # 3. API Key authentication fallback (X-API-Key)
    if isinstance(raw_api_key, str) and raw_api_key.strip():
        return await get_current_org(raw_api_key=raw_api_key.strip(), db=db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ═══════════════════════════════════════════════════════════════
#  API-Key Auth (legacy / webhooks):  get_current_org
# ═══════════════════════════════════════════════════════════════

async def get_current_org(
    raw_api_key: str | None = Security(api_key_header),
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> Organization:
    """FastAPI dependency that validates the ``X-API-Key`` header (or Bearer key).

    Returns the authenticated ``Organization`` tenant model.

    Raises
    ------
    HTTPException(401)
        If the header is missing, invalid, inactive, or expired.
    HTTPException(403)
        If the organization itself is deactivated.
    """
    if not raw_api_key and isinstance(credentials, HTTPAuthorizationCredentials) and credentials.credentials:
        raw_api_key = credentials.credentials

    if not raw_api_key:
        logger.warning("Authentication failed: Missing X-API-Key or Bearer token header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing 'X-API-Key' or 'Authorization' authentication header",
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
        credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
        db: AsyncSession = Depends(get_db_session),
    ) -> Organization:
        if not raw_api_key and credentials and credentials.credentials:
            raw_api_key = credentials.credentials
        org = await get_current_org(raw_api_key=raw_api_key, credentials=credentials, db=db)
        if not self.required_scopes:
            return org

        # Fetch API key again to verify scopes
        hashed = hash_api_key(raw_api_key.strip())  # type: ignore[union-attr]
        stmt = select(APIKey.scopes).where(APIKey.hashed_key == hashed)
        res = await db.execute(stmt)
        scopes: Sequence[str] = res.scalar_one_or_none() or []
        key_scopes = set(scopes)

        # Wildcard scope ('*' or 'admin') grants full access
        if "*" in key_scopes or "admin" in key_scopes:
            return org

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
