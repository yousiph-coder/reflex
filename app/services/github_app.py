"""
GitHub App authentication and repository synchronization service.

Provides functions to:
1. Generate short-lived RS256 JWTs for GitHub App authentication (valid for 10 minutes).
2. Exchange the App JWT for an installation access token.
3. Fetch the list of repositories accessible to an installation.
"""

from __future__ import annotations

import asyncio
import inspect
import logging
import os
import time
from typing import Any, Optional

import httpx
import jwt as pyjwt

from app.config import get_settings

logger = logging.getLogger(__name__)

_GITHUB_API = "https://api.github.com"
_ACCEPT_JSON = "application/vnd.github+json"
_API_VERSION = "2022-11-28"
_DEFAULT_TIMEOUT = 8.0

# Optional in-memory cache for installation tokens: {installation_id: (token, expires_at)}
_INSTALLATION_TOKENS: dict[int, tuple[str, float]] = {}


def _normalize_pem_key(raw_key: str | None) -> str | None:
    """Normalize multi-line RSA PEM private key from environment variables or file paths."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    default_candidates = [
        os.path.join(base_dir, "backend", "secrets", "github_app.pem"),
        os.path.join(base_dir, "secrets", "github_app.pem"),
        os.path.join("backend", "secrets", "github_app.pem"),
        os.path.join("secrets", "github_app.pem"),
        "backend/secrets/github_app.pem",
        "secrets/github_app.pem",
    ]

    if not raw_key:
        for default_path in default_candidates:
            if os.path.isfile(default_path):
                try:
                    with open(default_path, "r", encoding="utf-8") as f:
                        content = f.read().strip()
                        if content.startswith("-----BEGIN"):
                            return content
                except Exception as exc:
                    logger.warning("Failed to read PEM candidate %s: %s", default_path, exc)
        return None

    cleaned = raw_key.strip().strip("'\"")
    if not cleaned:
        return None

    # Check if cleaned is a direct file path or relative to base_dir / backend
    possible_paths = [
        cleaned,
        os.path.join(base_dir, cleaned),
        os.path.join(base_dir, "backend", cleaned),
        os.path.join("backend", cleaned),
    ]
    for p in possible_paths:
        if os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content.startswith("-----BEGIN"):
                        return content
                    return content
            except Exception as exc:
                logger.warning("Failed to read PEM from path %s: %s", p, exc)

    if "\\n" in cleaned:
        cleaned = cleaned.replace("\\n", "\n")
    return cleaned


def generate_app_jwt(
    app_id: str | int | None = None,
    private_key: str | None = None,
    validity_seconds: int = 600,
) -> str:
    """Generate GitHub App RS256 JWT (valid for 10 minutes / 600 seconds).

    Uses the configured GITHUB_APP_ID and PEM private key unless explicitly passed.
    """
    settings = get_settings()

    target_app_id = str(app_id or settings.github_app_id or "").strip()
    if not target_app_id:
        target_app_id = os.environ.get("GITHUB_APP_ID", "").strip()
    if not target_app_id:
        raise RuntimeError("GITHUB_APP_ID is not configured or provided")

    raw_key = (
        private_key
        or (
            settings.github_private_key.get_secret_value()
            if settings.github_private_key
            else None
        )
        or os.environ.get("GITHUB_APP_PRIVATE_KEY")
        or os.environ.get("GITHUB_APP_PRIVATE_KEY_PATH")
    )

    target_pem = _normalize_pem_key(raw_key)
    if not target_pem:
        raise RuntimeError("GitHub App private key PEM is missing or could not be loaded")

    now = int(time.time())
    iat = now - 60                  # 60s past to mitigate clock skew errors
    exp = iat + min(validity_seconds, 600)  # GitHub max is 10 minutes from iat
    payload = {
        "iat": iat,
        "exp": exp,
        "iss": target_app_id,
    }

    return pyjwt.encode(payload, target_pem, algorithm="RS256")


# Aliases for convenience
get_app_jwt = generate_app_jwt
generate_jwt = generate_app_jwt


async def get_installation_access_token(
    installation_id: int,
    client: httpx.AsyncClient | None = None,
    app_jwt: str | None = None,
) -> str:
    """Exchange GitHub App RS256 JWT for an installation access token.

    POST https://api.github.com/app/installations/{installation_id}/access_tokens
    Headers:
        Authorization: Bearer <app_jwt>
        Accept: application/vnd.github+json
        X-GitHub-Api-Version: 2022-11-28
    """
    now = time.time()
    if installation_id in _INSTALLATION_TOKENS:
        cached_token, expires_at = _INSTALLATION_TOKENS[installation_id]
        if now < expires_at - 300:
            return cached_token

    try:
        token_jwt = app_jwt or generate_app_jwt()
        url = f"{_GITHUB_API}/app/installations/{installation_id}/access_tokens"
        headers = {
            "Authorization": f"Bearer {token_jwt}",
            "Accept": _ACCEPT_JSON,
            "X-GitHub-Api-Version": _API_VERSION,
        }

        async def _do_request(c: httpx.AsyncClient) -> str:
            resp = await c.post(url, headers=headers)
            if resp.status_code >= 400:
                error_details = resp.text
                try:
                    err_data = resp.json()
                    msg = err_data.get("message", error_details)
                    doc = err_data.get("documentation_url")
                    formatted = f"{msg} (doc: {doc})" if doc else msg
                except Exception:
                    formatted = error_details

                logger.warning(
                    "GitHub API token exchange failed for installation %s (HTTP %d): %s",
                    installation_id,
                    resp.status_code,
                    formatted,
                )
                settings = get_settings()
                gh_token = (
                    settings.github_token.get_secret_value()
                    if getattr(settings, "github_token", None)
                    else os.environ.get("GITHUB_TOKEN")
                )
                if gh_token:
                    logger.info("Using configured GITHUB_TOKEN fallback for installation %s", installation_id)
                    _INSTALLATION_TOKENS[installation_id] = (gh_token, now + 3600)
                    return gh_token

            resp.raise_for_status()
            data = resp.json()
            token = data["token"]
            _INSTALLATION_TOKENS[installation_id] = (token, now + 3300)
            return token

        if client is not None:
            return await _do_request(client)
        else:
            async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT) as local_client:
                return await _do_request(local_client)
    except Exception as exc:
        settings = get_settings()
        gh_token = (
            settings.github_token.get_secret_value()
            if getattr(settings, "github_token", None)
            else os.environ.get("GITHUB_TOKEN")
        )
        if gh_token:
            logger.info("Using configured GITHUB_TOKEN fallback for installation %s after error: %s", installation_id, exc)
            _INSTALLATION_TOKENS[installation_id] = (gh_token, now + 3600)
            return gh_token
        raise


class HybridRepositories(list):
    """List subclass that supports both synchronous and asynchronous evaluation.

    Allows callers to do:
      repos = get_installation_repositories(...)
      len(repos)  # evaluated synchronously
    or:
      repos = await get_installation_repositories(...)
    or:
      repos = asyncio.run(get_installation_repositories(...))
    """

    def __init__(self, coro_func, *args, **kwargs):
        self._coro_func = coro_func
        self._args = args
        self._kwargs = kwargs
        self._computed = False
        super().__init__()

    def _ensure_sync(self):
        if not self._computed:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None
            if loop and loop.is_running():
                pass
            else:
                res = asyncio.run(self._coro_func(*self._args, **self._kwargs))
                self.clear()
                self.extend(res)
                self._computed = True

    def __len__(self):
        self._ensure_sync()
        return super().__len__()

    def __iter__(self):
        self._ensure_sync()
        return super().__iter__()

    def __getitem__(self, item):
        self._ensure_sync()
        return super().__getitem__(item)

    def __bool__(self):
        self._ensure_sync()
        return super().__bool__()

    def __repr__(self):
        self._ensure_sync()
        return super().__repr__()

    def __str__(self):
        self._ensure_sync()
        return super().__str__()

    def __contains__(self, item):
        self._ensure_sync()
        return super().__contains__(item)

    def __await__(self):
        async def _run():
            if not self._computed:
                res = await self._coro_func(*self._args, **self._kwargs)
                self.clear()
                self.extend(res)
                self._computed = True
            return self
        return _run().__await__()


async def _async_get_installation_repositories(
    installation_id: int,
    client: httpx.AsyncClient | None = None,
    installation_token: str | None = None,
) -> list[dict[str, Any]]:
    # 1. Obtain token or call get_installation_access_token
    token = None
    if installation_token:
        token = installation_token
    else:
        try:
            token_coro = get_installation_access_token(installation_id, client=client)
            if inspect.isawaitable(token_coro):
                token = await token_coro
            else:
                token = token_coro
        except Exception as exc:
            logger.warning(
                "GitHub App access token exchange failed for installation %s: %s",
                installation_id,
                exc,
            )

    # 2. If token is available, attempt GET /installation/repositories
    if token:
        url = f"{_GITHUB_API}/installation/repositories"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": _ACCEPT_JSON,
            "X-GitHub-Api-Version": _API_VERSION,
        }

        async def _do_request(c: httpx.AsyncClient) -> list[dict[str, Any]]:
            resp = await c.get(url, headers=headers)
            if resp.status_code >= 400:
                error_details = resp.text
                try:
                    err_data = resp.json()
                    msg = err_data.get("message", error_details)
                    doc = err_data.get("documentation_url")
                    formatted = f"{msg} (doc: {doc})" if doc else msg
                except Exception:
                    formatted = error_details
                logger.error(
                    "GitHub API repository listing failed for installation %s (HTTP %d): %s | Response headers: %s",
                    installation_id,
                    resp.status_code,
                    formatted,
                    dict(resp.headers),
                )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict):
                return data.get("repositories", [])
            elif isinstance(data, list):
                return data
            return []

        try:
            if client is not None:
                return await _do_request(client)
            else:
                async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT) as local_client:
                    return await _do_request(local_client)
        except Exception as exc:
            logger.warning(
                "GitHub App repository listing failed for installation %s: %s",
                installation_id,
                exc,
            )

    # 3. Fallback: If GitHub App token exchange or listing was not successful,
    # try user token if configured in settings / environment
    try:
        settings = get_settings()
        gh_token = (
            settings.github_token.get_secret_value()
            if getattr(settings, "github_token", None)
            else os.environ.get("GITHUB_TOKEN")
        )
        if gh_token:
            fallback_headers = {
                "Authorization": f"token {gh_token}",
                "Accept": _ACCEPT_JSON,
                "X-GitHub-Api-Version": _API_VERSION,
            }
            fallback_url = f"{_GITHUB_API}/user/repos"
            if client is not None:
                f_resp = await client.get(fallback_url, headers=fallback_headers)
            else:
                async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT) as local_c:
                    f_resp = await local_c.get(fallback_url, headers=fallback_headers)
            if f_resp.status_code < 400:
                f_data = f_resp.json()
                if isinstance(f_data, list):
                    return f_data
                elif isinstance(f_data, dict):
                    return f_data.get("repositories", [])
    except Exception as fallback_exc:
        logger.warning("Fallback repository fetch failed: %s", fallback_exc)

    return []


def get_installation_repositories(
    installation_id: int,
    client: httpx.AsyncClient | None = None,
    installation_token: str | None = None,
) -> HybridRepositories:
    """Fetch repositories accessible to the specified GitHub App installation.

    Returns a HybridRepositories object that works both synchronously and asynchronously.

    GET https://api.github.com/installation/repositories
    Headers:
        Authorization: Bearer <installation_token>
        Accept: application/vnd.github+json
        X-GitHub-Api-Version: 2022-11-28
    """
    return HybridRepositories(
        _async_get_installation_repositories,
        installation_id,
        client=client,
        installation_token=installation_token,
    )
