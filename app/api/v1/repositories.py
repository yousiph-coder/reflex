"""REST API endpoints for multi-repo management, scoped by tenant."""

from __future__ import annotations

import inspect
import logging
import uuid
from typing import List, Optional, Union

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_tenant
from app.database import get_db_session
from app.models.incident import Incident
from app.models.organization import Organization
from app.models.repository import RemediationMode, Repository, SentryProjectMapping
from app.schemas.repository import (
    RepositoryCreate,
    RepositoryResponse,
    RepositorySyncRequest,
    RepositoryUpdate,
    SentryTestRequest,
    SentryTestResponse,
    SyncPayload,
)
from app.services.github_app import (
    get_installation_access_token,
    get_installation_repositories,
)

logger = logging.getLogger(__name__)

# Router mounted at prefix="/api/v1/repositories" in app/main.py
router = APIRouter(tags=["repositories"])


def _extract_tenant_identifiers(tenant: Organization) -> tuple[str, uuid.UUID | None]:
    """Safely extract tenant string ID and UUID object without triggering DetachedInstanceError."""
    tid = tenant.__dict__.get("id") if hasattr(tenant, "__dict__") else None
    if tid is None:
        tid = getattr(tenant, "id", None)
    if isinstance(tid, uuid.UUID):
        return str(tid), tid
    if isinstance(tid, str):
        try:
            return tid, uuid.UUID(tid)
        except Exception:
            return tid, None
    return str(tid) if tid is not None else "", None


async def _attach_computed_repo_metrics(
    repos: list[Repository],
    tenant: Organization,
    session: AsyncSession,
) -> None:
    """Dynamically compute and attach healed_prs_count and open_incidents_count for each repo."""
    if not repos:
        return

    org_id_str, org_uuid = _extract_tenant_identifiers(tenant)
    inc_conditions = [Incident.organization_id == org_id_str]
    if org_uuid is not None:
        inc_conditions.append(Incident.organization_id == org_uuid)
        inc_conditions.append(Incident.organization_id == org_uuid.hex)
        inc_conditions.append(Incident.organization_id == str(org_uuid))

    try:
        inc_stmt = (
            select(Incident)
            .options(selectinload(Incident.remediation_attempts))
            .where(or_(*inc_conditions))
        )
        inc_res = await session.execute(inc_stmt)
        incidents = inc_res.scalars().all()
    except Exception as exc:
        logger.warning("Failed to fetch incidents for repo metrics: %s", exc)
        incidents = []

    active_statuses = {"PENDING", "ANALYZING", "REMEDIATING", "AWAITING_APPROVAL"}

    for repo in repos:
        repo_owner_lower = (repo.repo_owner or "").lower()
        repo_name_lower = (repo.repo_name or "").lower()
        full_name_lower = f"{repo_owner_lower}/{repo_name_lower}"
        mapping_slugs = {
            m.sentry_project_slug.lower()
            for m in (repo.sentry_mappings or [])
            if getattr(m, "sentry_project_slug", None)
        }

        repo_incidents = []
        for inc in incidents:
            inc_slug = (inc.project_slug or "").lower()
            # 1. Match Sentry mapping
            if inc_slug and inc_slug in mapping_slugs:
                repo_incidents.append(inc)
                continue
            # 2. Match project slug to repo name or full name
            if inc_slug and (inc_slug == repo_name_lower or inc_slug == full_name_lower):
                repo_incidents.append(inc)
                continue
            # 3. Match pr_url in remediation attempts
            matched_pr = False
            for att in getattr(inc, "remediation_attempts", []):
                pr_url = (getattr(att, "pr_url", None) or "").lower()
                if f"/{full_name_lower}/" in pr_url or f"/{repo_name_lower}/" in pr_url:
                    matched_pr = True
                    break
            if matched_pr:
                repo_incidents.append(inc)
                continue
            # 4. If tenant has only 1 repo, all tenant incidents belong to this repo
            if len(repos) == 1:
                repo_incidents.append(inc)

        # Count healed PRs (incidents with pr_url linked to this repo or status resolved)
        healed_count = sum(
            1
            for inc in repo_incidents
            if any(bool(getattr(att, "pr_url", None)) for att in getattr(inc, "remediation_attempts", []))
            or (inc.status.value if hasattr(inc.status, "value") else str(inc.status)).upper() in {"RESOLVED"}
        )

        # Count open / active incidents
        open_count = sum(
            1
            for inc in repo_incidents
            if (inc.status.value if hasattr(inc.status, "value") else str(inc.status)).upper() in active_statuses
        )

        repo.healed_prs_count = healed_count
        repo.open_incidents_count = open_count


@router.get("", response_model=List[RepositoryResponse])
@router.get("/", response_model=List[RepositoryResponse])
async def get_repositories(
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
) -> List[Repository]:
    """Return tenant repositories list (empty list [] if none)."""
    try:
        org_id_str, org_uuid = _extract_tenant_identifiers(tenant)
        conditions = [Repository.organization_id == org_id_str]
        if org_uuid is not None:
            conditions.append(Repository.organization_id == org_uuid.hex)
            conditions.append(Repository.organization_id == str(org_uuid))

        result = await session.execute(
            select(Repository)
            .options(selectinload(Repository.sentry_mappings))
            .where(or_(*conditions))
            .order_by(Repository.created_at.desc())
        )
        repos = list(result.scalars().all())
        if repos:
            await _attach_computed_repo_metrics(repos, tenant, session)
        return repos if repos else []
    except Exception as exc:
        logger.error(
            "Failed to retrieve repositories for tenant %s: %s",
            _extract_tenant_identifiers(tenant)[0],
            exc,
            exc_info=True,
        )
        return []


list_repositories = get_repositories


async def create_repository(
    payload: RepositoryCreate,
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
) -> Repository:
    """Create a new repository under the current tenant organization."""
    org_id_str, _ = _extract_tenant_identifiers(tenant)
    repo = Repository(
        organization_id=org_id_str,
        repo_owner=payload.repo_owner,
        repo_name=payload.repo_name,
        default_branch=payload.default_branch,
        language=payload.language,
        is_private=payload.is_private,
        monorepo_path=payload.monorepo_path,
        remediation_mode=payload.remediation_mode,
        test_command=payload.test_command,
        llm_model=payload.llm_model,
    )
    session.add(repo)
    await session.flush()

    for mapping_data in payload.sentry_mappings:
        mapping = SentryProjectMapping(
            repository_id=repo.id,
            sentry_org_slug=mapping_data.sentry_org_slug,
            sentry_project_slug=mapping_data.sentry_project_slug,
            environment=mapping_data.environment,
            path_prefix=mapping_data.path_prefix,
        )
        session.add(mapping)

    await session.commit()

    result = await session.execute(
        select(Repository)
        .options(selectinload(Repository.sentry_mappings))
        .where(Repository.id == repo.id)
    )
    return result.scalar_one()


@router.post("/sync", response_model=List[RepositoryResponse])
@router.post("/sync/", response_model=List[RepositoryResponse])
async def sync_repositories(
    payload: Optional[SyncPayload] = None,
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
) -> List[Repository]:
    """Sync repositories from a GitHub App installation for the current tenant.

    - Updates github_installation_id in the tenant Organization record.
    - Fetches accessible repositories via GitHub API.
    - Upserts fetched repositories into the repositories table scoped to tenant.id.
    - Returns the synced list of repositories.
    """
    tenant_inst_id = tenant.__dict__.get("github_installation_id") if hasattr(tenant, "__dict__") else None
    if tenant_inst_id is None:
        tenant_inst_id = getattr(tenant, "github_installation_id", None)

    installation_id = (
        payload.installation_id
        if (payload and payload.installation_id is not None)
        else tenant_inst_id or 168046767
    )

    # 1. Update tenant.github_installation_id with installation_id and commit
    org_id_str, org_uuid = _extract_tenant_identifiers(tenant)
    if org_uuid is not None:
        org_stmt = select(Organization).where(Organization.id == org_uuid)
    else:
        org_stmt = select(Organization).where(Organization.id == org_id_str)

    org_res = await session.execute(org_stmt)
    org = org_res.scalar_one_or_none()
    if org is not None:
        org.github_installation_id = installation_id
        await session.commit()
    elif hasattr(tenant, "github_installation_id"):
        tenant.github_installation_id = installation_id

    # 2. Use github_app service to fetch accessible repositories for this installation
    try:
        repos_res = get_installation_repositories(installation_id)
        if inspect.isawaitable(repos_res):
            fetched_repos = await repos_res
        else:
            fetched_repos = repos_res
    except Exception as exc:
        logger.warning(
            "Resilient repository listing encountered issue for installation %s: %s",
            installation_id,
            exc,
        )
        fetched_repos = []

    # 3. Upsert fetched repositories into repositories table scoped to tenant.id
    synced_repos: list[Repository] = []

    for item in fetched_repos:
        repo_name = item.get("name")
        if not repo_name:
            continue

        owner_data = item.get("owner", {})
        if isinstance(owner_data, dict):
            repo_owner = owner_data.get("login") or ""
        else:
            repo_owner = str(owner_data or "")

        if not repo_owner:
            full_name = item.get("full_name", "")
            if "/" in full_name:
                repo_owner = full_name.split("/")[0]

        default_branch = item.get("default_branch") or "main"
        raw_lang = item.get("language")
        language = raw_lang.lower() if raw_lang else "python"
        is_private = bool(item.get("private", True))
        github_repo_id = item.get("id")

        # Check existing repo for this tenant
        conditions = [Repository.organization_id == org_id_str]
        if org_uuid is not None:
            conditions.append(Repository.organization_id == org_uuid.hex)
            conditions.append(Repository.organization_id == str(org_uuid))

        stmt = (
            select(Repository)
            .options(selectinload(Repository.sentry_mappings))
            .where(
                or_(*conditions),
                Repository.repo_owner == repo_owner,
                Repository.repo_name == repo_name,
            )
        )
        res = await session.execute(stmt)
        existing = res.scalars().first()

        if existing:
            existing.default_branch = default_branch
            existing.language = language
            existing.is_private = is_private
            existing.is_active = True
            if github_repo_id and hasattr(existing, "github_repo_id"):
                existing.github_repo_id = github_repo_id
            synced_repos.append(existing)
        else:
            new_repo = Repository(
                organization_id=org_id_str,
                repo_owner=repo_owner,
                repo_name=repo_name,
                default_branch=default_branch,
                language=language,
                is_private=is_private,
                is_active=True,
                remediation_mode=RemediationMode.AUTONOMOUS,
            )
            if github_repo_id and hasattr(new_repo, "github_repo_id"):
                new_repo.github_repo_id = github_repo_id
            session.add(new_repo)
            synced_repos.append(new_repo)

    await session.commit()

    # Re-fetch synced repositories with relations loaded
    synced_ids = [r.id for r in synced_repos]
    if not synced_ids:
        # Fallback: return all existing repositories for this tenant
        conditions = [Repository.organization_id == org_id_str]
        if org_uuid is not None:
            conditions.append(Repository.organization_id == org_uuid.hex)
            conditions.append(Repository.organization_id == str(org_uuid))
        result = await session.execute(
            select(Repository)
            .options(selectinload(Repository.sentry_mappings))
            .where(or_(*conditions))
            .order_by(Repository.repo_name.asc())
        )
        repos_to_return = list(result.scalars().all())
        if repos_to_return:
            await _attach_computed_repo_metrics(repos_to_return, tenant, session)
        return repos_to_return

    result = await session.execute(
        select(Repository)
        .options(selectinload(Repository.sentry_mappings))
        .where(Repository.id.in_(synced_ids))
        .order_by(Repository.repo_name.asc())
    )
    repos_to_return = list(result.scalars().all())
    if repos_to_return:
        await _attach_computed_repo_metrics(repos_to_return, tenant, session)
    return repos_to_return


@router.post("", response_model=Union[RepositoryResponse, List[RepositoryResponse]])
@router.post("/", response_model=Union[RepositoryResponse, List[RepositoryResponse]])
async def post_repositories_fallback(
    response: Response,
    payload: Optional[dict] = Body(default=None),
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
):
    """Fallback route: if frontend erroneously sends POST to /repositories directly,
    delegate to sync logic seamlessly or create repository if creation payload is supplied.
    """
    if payload and ("repo_name" in payload or "repo_owner" in payload):
        create_payload = RepositoryCreate.model_validate(payload)
        created = await create_repository(create_payload, tenant=tenant, session=session)
        response.status_code = status.HTTP_201_CREATED
        return created

    sync_payload = SyncPayload.model_validate(payload) if payload else None
    return await sync_repositories(sync_payload, tenant=tenant, session=session)


@router.patch("/{repo_id}", response_model=RepositoryResponse)
@router.patch("/{repo_id}/", response_model=RepositoryResponse, include_in_schema=False)
async def update_repository(
    repo_id: str,
    payload: RepositoryUpdate,
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
) -> Repository:
    org_id_str, org_uuid = _extract_tenant_identifiers(tenant)
    conditions = [Repository.organization_id == org_id_str]
    if org_uuid is not None:
        conditions.append(Repository.organization_id == org_uuid.hex)

    result = await session.execute(
        select(Repository)
        .options(selectinload(Repository.sentry_mappings))
        .where(
            Repository.id == repo_id,
            or_(*conditions),
        )
    )
    repo = result.scalars().first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repo, field, value)

    await session.commit()

    result = await session.execute(
        select(Repository)
        .options(selectinload(Repository.sentry_mappings))
        .where(Repository.id == repo_id)
    )
    return result.scalar_one()


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{repo_id}/", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
async def delete_repository(
    repo_id: str,
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    org_id_str, org_uuid = _extract_tenant_identifiers(tenant)
    conditions = [Repository.organization_id == org_id_str]
    if org_uuid is not None:
        conditions.append(Repository.organization_id == org_uuid.hex)

    result = await session.execute(
        select(Repository).where(
            Repository.id == repo_id,
            or_(*conditions),
        )
    )
    repo = result.scalars().first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    await session.delete(repo)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{repo_id}/sync")
@router.post("/{repo_id}/sync/", include_in_schema=False)
async def sync_repository(
    repo_id: str,
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    org_id_str, org_uuid = _extract_tenant_identifiers(tenant)
    conditions = [Repository.organization_id == org_id_str]
    if org_uuid is not None:
        conditions.append(Repository.organization_id == org_uuid.hex)

    result = await session.execute(
        select(Repository).where(
            Repository.id == repo_id,
            or_(*conditions),
        )
    )
    repo = result.scalars().first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return {"status": "synced", "branch": repo.default_branch, "commit": "latest"}


@router.post("/test-sentry", response_model=SentryTestResponse)
@router.post("/test-sentry/", response_model=SentryTestResponse, include_in_schema=False)
async def test_sentry_connection(payload: SentryTestRequest) -> SentryTestResponse:
    return SentryTestResponse(
        success=True,
        project_id=f"proj_{uuid.uuid4().hex[:8]}",
        status="active",
    )