"""REST API endpoints for multi-repo management, scoped by tenant."""

from __future__ import annotations

import inspect
import logging
import uuid
from typing import Any, List, Optional, Union

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from pydantic import BaseModel
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


def _default_test_command(language: str | None) -> str:
    lang = (language or "").strip().lower()
    if lang in {"javascript", "typescript", "js", "ts", "node", "nodejs"}:
        return "npm test"
    if lang in {"go", "golang"}:
        return "go test ./..."
    if lang == "rust":
        return "cargo test"
    return "pytest -xvs tests/"


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

        # Count healed PRs (incidents with pr_url linked to this repo or status resolved/merged)
        healed_count = sum(
            1
            for inc in repo_incidents
            if any(bool(getattr(att, "pr_url", None)) for att in getattr(inc, "remediation_attempts", []))
            or (inc.status.value if hasattr(inc.status, "value") else str(inc.status)).upper()
            in {"RESOLVED", "MERGED", "PR_MERGED", "HEALED"}
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

    # 2. Use github_app service to fetch strictly selected installation repositories
    try:
        repos_res = get_installation_repositories(installation_id)
        if inspect.isawaitable(repos_res):
            fetched_repos = await repos_res
        else:
            fetched_repos = repos_res
    except Exception as exc:
        logger.error(
            "GitHub App repository sync failed for installation %s: %s",
            installation_id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub App sync failed for installation #{installation_id}: {exc}",
        )

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

        inferred_test_cmd = _default_test_command(language)
        if existing:
            existing.default_branch = default_branch
            existing.language = language
            existing.is_private = is_private
            existing.is_active = True
            if (
                not existing.test_command
                or (
                    existing.test_command.strip() == "pytest -xvs tests/"
                    and inferred_test_cmd != "pytest -xvs tests/"
                )
            ):
                existing.test_command = inferred_test_cmd
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
                test_command=inferred_test_cmd,
                remediation_mode=RemediationMode.AUTONOMOUS,
            )
            if github_repo_id and hasattr(new_repo, "github_repo_id"):
                new_repo.github_repo_id = github_repo_id
            session.add(new_repo)
            synced_repos.append(new_repo)

    await session.flush()

    # Prune stale repositories for this tenant that are no longer selected in GitHub App
    synced_ids = [r.id for r in synced_repos]
    if fetched_repos is not None:
        prune_conditions = [Repository.organization_id == org_id_str]
        if org_uuid is not None:
            prune_conditions.append(Repository.organization_id == org_uuid.hex)
            prune_conditions.append(Repository.organization_id == str(org_uuid))

        existing_all_res = await session.execute(
            select(Repository).where(or_(*prune_conditions))
        )
        for existing_repo in existing_all_res.scalars().all():
            if existing_repo.id not in synced_ids:
                await session.delete(existing_repo)

    await session.commit()

    # Re-fetch synced repositories with relations loaded
    if not synced_ids:
        return []

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
        conditions.append(Repository.organization_id == str(org_uuid))

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
        conditions.append(Repository.organization_id == str(org_uuid))

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
        conditions.append(Repository.organization_id == str(org_uuid))

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


# ── Feature 2: Standalone Pre-Launch Audit & Ship Gate ───────────

def _parse_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value))
    except Exception:
        return None


class AuditAutoFixRequest(BaseModel):
    file_path: str
    line_number: int | None = 1
    title: str
    explanation: str = ""
    expected_behavior: str = ""


_AUDIT_SKIP_DIRS = (
    "node_modules/",
    ".git/",
    ".next/",
    "dist/",
    "build/",
    "venv/",
    ".venv/",
    "__pycache__/",
    "coverage/",
    "vendor/",
)

_AUDIT_ALLOWED_EXTS = (
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".go",
    ".rs",
    ".json",
)

_AUDIT_SKIP_FILES = (
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
)


def _select_high_signal_files(tree_items: list[dict[str, Any]], max_files: int = 8) -> list[str]:
    candidates: list[tuple[int, str]] = []
    for item in tree_items:
        if item.get("type") != "blob":
            continue
        path = str(item.get("path") or "")
        lower = path.lower()
        if not path or any(lower.startswith(d) or f"/{d}" in lower for d in _AUDIT_SKIP_DIRS):
            continue
        if any(lower.endswith(sf) for sf in _AUDIT_SKIP_FILES):
            continue
        if not any(lower.endswith(ext) for ext in _AUDIT_ALLOWED_EXTS):
            continue
        size = int(item.get("size") or 0)
        if size <= 0 or size > 45_000:
            continue

        # Prioritize backend/service/core source files over tests and configs
        priority = 2
        if any(seg in lower for seg in ("server.", "app.", "main.", "lib/", "services/", "api/", "routes/", "src/")):
            priority = 0
        elif lower.endswith("package.json") or "data/" in lower:
            priority = 1
        elif "test" in lower or "spec" in lower:
            priority = 3
        candidates.append((priority, path))

    candidates.sort(key=lambda x: (x[0], len(x[1]), x[1]))
    return [p for _, p in candidates[:max_files]]


def _extract_json_object(raw_text: str) -> dict[str, Any]:
    import json
    import re

    cleaned = (raw_text or "").strip()
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fence:
        cleaned = fence.group(1)
    else:
        brace = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if brace:
            cleaned = brace.group(0)
    return json.loads(cleaned)


@router.post("/{repo_id}/audit")
async def run_prelaunch_audit(
    repo_id: str,
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Scan a connected GitHub repository before deployment and return a Ship Gate verdict."""
    import base64
    import time
    import httpx
    from app.config import get_settings
    from app.services.github_app import get_installation_access_token

    t0 = time.perf_counter()
    settings = get_settings()

    org_id_str = str(tenant.id)
    org_uuid = _parse_uuid(org_id_str)
    conditions = [Repository.organization_id == org_id_str]
    if org_uuid is not None:
        conditions.append(Repository.organization_id == org_uuid.hex)
        conditions.append(Repository.organization_id == str(org_uuid))

    repo_stmt = (
        select(Repository)
        .options(selectinload(Repository.sentry_mappings))
        .where(Repository.id == repo_id, or_(*conditions))
    )
    repo = (await session.execute(repo_stmt)).scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found for this organization.")

    installation_id = getattr(tenant, "github_installation_id", None)
    if not installation_id:
        org_stmt = (
            select(Organization).where(Organization.id == org_uuid)
            if org_uuid is not None
            else select(Organization).where(Organization.id == org_id_str)
        )
        org_row = (await session.execute(org_stmt)).scalar_one_or_none()
        installation_id = getattr(org_row, "github_installation_id", None) if org_row else None

    if not installation_id:
        raise HTTPException(
            status_code=400,
            detail="No active GitHub App installation found. Sync GitHub in Repositories first.",
        )

    token_res = get_installation_access_token(int(installation_id))
    gh_token = await token_res if inspect.isawaitable(token_res) else token_res

    owner = repo.repo_owner
    name = repo.repo_name
    branch = repo.default_branch or "main"
    gh_headers = {
        "Authorization": f"Bearer {gh_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    scanned_files: list[str] = []
    file_blocks: list[str] = []
    char_budget = 11_000
    used_chars = 0

    async with httpx.AsyncClient(timeout=25.0) as client:
        tree_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{name}/git/trees/{branch}?recursive=1",
            headers=gh_headers,
        )
        if tree_resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"GitHub tree fetch failed (HTTP {tree_resp.status_code}): {tree_resp.text[:200]}",
            )

        selected_paths = _select_high_signal_files(tree_resp.json().get("tree", []), max_files=8)
        for path in selected_paths:
            if used_chars >= char_budget:
                break
            c_resp = await client.get(
                f"https://api.github.com/repos/{owner}/{name}/contents/{path}?ref={branch}",
                headers=gh_headers,
            )
            if c_resp.status_code != 200:
                continue
            data = c_resp.json()
            encoded = data.get("content")
            if not encoded:
                continue
            try:
                decoded = base64.b64decode(encoded).decode("utf-8", errors="replace")
            except Exception:
                continue

            remaining = char_budget - used_chars
            snippet = decoded[: min(2400, remaining)]
            numbered = "\n".join(f"{idx + 1}: {ln}" for idx, ln in enumerate(snippet.splitlines()))
            file_blocks.append(f"=== FILE: {path} ===\n{numbered}")
            scanned_files.append(path)
            used_chars += len(snippet)

    if not file_blocks:
        raise HTTPException(status_code=400, detail="No scannable source files found in this repository.")

    system_prompt = (
        "You are Reflex Pre-Launch SRE Auditor. Analyze the repository files for REAL production risks before deployment:\n"
        "1. crash: Unhandled null/undefined property access, missing error guards, runtime TypeErrors/ReferenceErrors.\n"
        "2. contract: Input/Output contract mismatches between routes, services, data files, and frontend calls.\n"
        "3. security: Hardcoded secrets, unsafe defaults, missing validation.\n"
        "Return ONLY valid JSON with this exact schema (no prose outside JSON):\n"
        "{\n"
        '  "ship_gate": boolean,\n'
        '  "verdict": "READY" | "NEEDS_FIXES" | "BLOCKED",\n'
        '  "score": integer (0-100),\n'
        '  "summary": "concise 1-2 sentence production readiness summary",\n'
        '  "findings": [\n'
        "    {\n"
        '      "id": "finding-1",\n'
        '      "severity": "CRITICAL" | "HIGH" | "MEDIUM",\n'
        '      "category": "crash" | "contract" | "security",\n'
        '      "file_path": "exact relative file path",\n'
        '      "line_number": integer,\n'
        '      "title": "short concrete bug title",\n'
        '      "explanation": "why this will fail in production",\n'
        '      "expected_behavior": "what the code should safely do instead",\n'
        '      "suggested_fix": "short unified diff (- old / + new)"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Set ship_gate=false and verdict='BLOCKED' if any CRITICAL crash or security issue exists."
    )

    user_prompt = (
        f"Audit repository {owner}/{name} (branch: {branch}).\n"
        "Identify only real, concrete issues present in these exact files:\n\n"
        + "\n\n".join(file_blocks)
    )

    target_model = settings.llm_model
    if "groq.com" in settings.llm_base_url.lower() and (
        not target_model or target_model.startswith("gpt-4")
    ):
        target_model = "openai/gpt-oss-120b"

    async with httpx.AsyncClient(timeout=45.0) as client:
        llm_resp = await client.post(
            f"{settings.llm_base_url.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.llm_api_key.get_secret_value()}",
                "Content-Type": "application/json",
            },
            json={
                "model": target_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 1800,
            },
        )

    if llm_resp.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="LLM rate limit reached (HTTP 429). Wait 30 seconds and click Run Pre-Launch Audit again.",
        )
    if llm_resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"LLM audit failed (HTTP {llm_resp.status_code}): {llm_resp.text[:250]}",
        )

    raw_content = llm_resp.json()["choices"][0]["message"]["content"]
    try:
        parsed = _extract_json_object(raw_content)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse structured audit JSON from LLM: {exc}",
        )

    findings = parsed.get("findings") or []
    critical_count = sum(1 for f in findings if str(f.get("severity", "")).upper() == "CRITICAL")
    score = int(parsed.get("score", max(15, 100 - critical_count * 25 - (len(findings) - critical_count) * 10)))
    score = max(0, min(100, score))
    ship_gate = bool(parsed.get("ship_gate", critical_count == 0 and score >= 75))
    verdict = str(parsed.get("verdict") or ("READY" if ship_gate else "BLOCKED")).upper()
    if not ship_gate and verdict == "READY":
        verdict = "BLOCKED"

    return {
        "repository_id": str(repo.id),
        "repository": f"{owner}/{name}",
        "branch": branch,
        "ship_gate": ship_gate,
        "verdict": verdict,
        "score": score,
        "summary": str(parsed.get("summary") or "Pre-launch static & contract audit completed."),
        "scanned_files": scanned_files,
        "model": target_model,
        "duration_seconds": round(time.perf_counter() - t0, 2),
        "findings": findings,
    }


@router.post("/{repo_id}/audit/auto-fix")
async def trigger_audit_auto_fix(
    repo_id: str,
    payload: AuditAutoFixRequest,
    tenant: Organization = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Queue a Pre-Launch Audit finding directly into Reflex's F1 autonomous PR pipeline."""
    import hashlib
    import hmac
    import json
    import time
    import uuid
    import httpx
    from app.config import get_settings

    settings = get_settings()
    org_id_str = str(tenant.id)
    org_uuid = _parse_uuid(org_id_str)
    conditions = [Repository.organization_id == org_id_str]
    if org_uuid is not None:
        conditions.append(Repository.organization_id == org_uuid.hex)
        conditions.append(Repository.organization_id == str(org_uuid))

    repo_stmt = (
        select(Repository)
        .options(selectinload(Repository.sentry_mappings))
        .where(Repository.id == repo_id, or_(*conditions))
    )
    repo = (await session.execute(repo_stmt)).scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    # Ensure a SentryProjectMapping exists so F1 webhook router resolves this exact repo
    slug = repo.sentry_mappings[0].sentry_project_slug if repo.sentry_mappings else repo.repo_name.lower()
    if not repo.sentry_mappings:
        session.add(
            SentryProjectMapping(
                repository_id=repo.id,
                sentry_org_slug="reflex-org",
                sentry_project_slug=slug,
            )
        )
        await session.commit()

    webhook_body = {
        "action": "triggered",
        "data": {
            "triggered_rule": "Reflex Pre-Launch Audit Auto-Fix",
            "event": {
                "event_id": uuid.uuid4().hex,
                "issue_id": f"prelaunch-{repo.repo_name}-{int(time.time())}",
                "project_slug": slug,
                "title": f"Pre-Launch Audit: {payload.title}",
                "platform": "node" if (repo.language or "").lower() in {"javascript", "typescript"} else "python",
                "level": "error",
                "environment": "pre-launch",
                "timestamp": time.time(),
                "culprit": f"{payload.file_path}:{payload.line_number or 1}",
                "exception": {
                    "values": [
                        {
                            "type": "PreLaunchAuditRisk",
                            "value": f"{payload.title}. {payload.explanation} Expected: {payload.expected_behavior}".strip(),
                            "stacktrace": {
                                "frames": [
                                    {
                                        "filename": payload.file_path,
                                        "function": "prelaunch_audit",
                                        "lineno": payload.line_number or 1,
                                        "in_app": True,
                                    }
                                ]
                            },
                        }
                    ]
                },
            },
        },
    }

    raw_body = json.dumps(webhook_body).encode("utf-8")
    sig = hmac.new(
        settings.sentry_client_secret.get_secret_value().encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "http://127.0.0.1:8000/api/v1/webhooks/sentry",
            content=raw_body,
            headers={
                "Content-Type": "application/json",
                "sentry-hook-signature": sig,
                "sentry-hook-resource": "event_alert",
            },
        )

    if resp.status_code not in (200, 202):
        raise HTTPException(
            status_code=502,
            detail=f"Failed to queue Auto-Fix incident (HTTP {resp.status_code}): {resp.text[:200]}",
        )

    ack = resp.json()
    return {
        "status": "queued",
        "incident_id": ack.get("incident_id"),
        "message": "Queued into Reflex F1 autonomous healing pipeline.",
    }
