"""
GitHub API integration service.

Provides async methods for:
- Fetching file content with line-context windowing
- Fetching git blame and recent commit history
- Creating remediation branches, committing patches, and opening PRs

Supports two authentication modes:
1. **GitHub App** — App ID + PEM private key → JWT → installation token
2. **Personal Access Token (PAT)** — direct ``Authorization: token …``

All HTTP calls go through a shared ``httpx.AsyncClient`` with retry
and rate-limit awareness.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import time
from typing import Any

import httpx

from app.config import get_settings
from app.schemas.remediation import BlameInfo, FileContext

logger = logging.getLogger(__name__)

_GITHUB_API = "https://api.github.com"
_TIMEOUT = httpx.Timeout(connect=10.0, read=30.0, write=30.0, pool=10.0)
_MAX_RETRIES = 3
_ACCEPT_JSON = "application/vnd.github+json"
_API_VERSION = "2022-11-28"


def _normalize_private_key(key: str | None) -> str | None:
    """Normalize multi-line RSA PEM private key from environment variables or file paths."""
    import os
    if key is None:
        default_path = os.path.join("backend", "secrets", "github_app.pem")
        if os.path.isfile(default_path):
            with open(default_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        return None
    cleaned = key.strip().strip("'\"")
    if not cleaned:
        return None
    if os.path.isfile(cleaned):
        with open(cleaned, "r", encoding="utf-8") as f:
            cleaned = f.read().strip()
    elif "\\n" in cleaned:
        cleaned = cleaned.replace("\\n", "\n")
    return cleaned


class GitHubService:
    """Async GitHub API client for the remediation pipeline.

    Supports:
    1. GitHub App authentication (App ID + PEM key -> RS256 JWT -> Installation Token)
    2. Personal Access Token (PAT) authentication (legacy / fallback)
    3. Webhook HMAC-SHA256 signature verification
    """

    def __init__(
        self,
        *,
        token: str | None = None,
        owner: str | None = None,
        repo: str | None = None,
        default_branch: str | None = None,
        app_id: str | None = None,
        app_private_key: str | None = None,
        installation_id: str | None = None,
        webhook_secret: str | None = None,
    ) -> None:
        settings = get_settings()
        self._token = token or (
            settings.github_token.get_secret_value() if settings.github_token else ""
        )
        self._owner = owner or settings.github_owner
        self._repo = repo or settings.github_repo
        self._default_branch = default_branch or settings.github_default_branch

        # GitHub App authentication credentials
        self._app_id = (
            str(app_id)
            if app_id is not None
            else str(settings.github_app_id or "")
        )
        raw_key = (
            app_private_key
            if app_private_key is not None
            else (
                settings.github_private_key.get_secret_value()
                if settings.github_private_key
                else None
            )
        )
        self._app_private_key = _normalize_private_key(raw_key)
        self._installation_id = str(installation_id or "") if installation_id else None
        self._webhook_secret = webhook_secret or (
            settings.github_webhook_secret.get_secret_value()
            if settings.github_webhook_secret
            else None
        )

        # Dynamic cache for installation access tokens: {installation_id: (token, expires_at)}
        self._installation_tokens: dict[str, tuple[str, float]] = {}
        self._installation_token: str | None = None
        self._installation_token_expires: float = 0.0

        self._client: httpx.AsyncClient | None = None

    def __repr__(self) -> str:
        app_auth = bool(self._app_id and self._app_private_key)
        return (
            f"<GitHubService owner='{self._owner}' repo='{self._repo}' "
            f"app_auth={app_auth} branch='{self._default_branch}'>"
        )

    # ── Lifecycle ───────────────────────────────────────────────

    async def init(self) -> None:
        """Initialise the HTTP client and optionally acquire an installation token."""
        self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        if self._app_id and self._app_private_key and self._installation_id:
            await self._refresh_installation_token()

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    # ── Auth helpers ────────────────────────────────────────────

    def _generate_app_jwt(self) -> str:
        """Create a short-lived RS256 JWT for GitHub App authentication."""
        if not self._app_id or not self._app_private_key:
            raise RuntimeError(
                "Cannot generate GitHub App JWT: GITHUB_APP_ID or GITHUB_PRIVATE_KEY is missing"
            )

        try:
            import jwt as pyjwt
        except ImportError as exc:
            raise RuntimeError(
                "PyJWT and cryptography are required for GitHub App auth. "
                "Install with: pip install PyJWT cryptography"
            ) from exc

        now = int(time.time())
        payload = {
            "iat": now - 60,       # 60s in the past to prevent clock skew errors
            "exp": now + (9 * 60), # 9 minutes validity (GitHub maximum is 10 minutes)
            "iss": self._app_id,
        }
        return pyjwt.encode(payload, self._app_private_key, algorithm="RS256")

    def generate_jwt(self) -> str:
        """Public method for generating RS256 GitHub App JWT."""
        return self._generate_app_jwt()

    async def get_repo_installation(
        self, owner: str | None = None, repo: str | None = None
    ) -> dict[str, Any] | None:
        """Dynamically fetch the installation metadata for a repository using the App JWT."""
        target_owner = owner or self._owner
        target_repo = repo or self._repo
        if not target_owner or not target_repo or not self._app_id or not self._app_private_key:
            return None

        app_jwt = self._generate_app_jwt()
        client = self._get_client()
        resp = await client.get(
            f"{_GITHUB_API}/repos/{target_owner}/{target_repo}/installation",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": _ACCEPT_JSON,
                "X-GitHub-Api-Version": _API_VERSION,
            },
        )
        if resp.status_code == 404:
            logger.info("GitHub App is not installed on repository %s/%s", target_owner, target_repo)
            return None
        resp.raise_for_status()
        return resp.json()

    async def list_app_installations(self) -> list[dict[str, Any]]:
        """List all GitHub App installations using the RS256 App JWT."""
        app_jwt = self._generate_app_jwt()
        client = self._get_client()
        resp = await client.get(
            f"{_GITHUB_API}/app/installations",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": _ACCEPT_JSON,
                "X-GitHub-Api-Version": _API_VERSION,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def list_installation_repositories(
        self, installation_id: str | int
    ) -> list[dict[str, Any]]:
        """List repositories accessible to a specific app installation."""
        token = await self.get_installation_token(installation_id)
        client = self._get_client()
        resp = await client.get(
            f"{_GITHUB_API}/installation/repositories",
            headers={
                "Authorization": f"token {token}",
                "Accept": _ACCEPT_JSON,
                "X-GitHub-Api-Version": _API_VERSION,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("repositories", [])

    async def get_installation_token(self, installation_id: str | int) -> str:
        """Dynamically exchange App JWT for an installation access token (cached for ~55 min)."""
        inst_key = str(installation_id)
        now = time.time()

        # Return cached token if valid for at least 5 more minutes
        if inst_key in self._installation_tokens:
            token, expires_at = self._installation_tokens[inst_key]
            if now < expires_at - 300:
                return token

        app_jwt = self._generate_app_jwt()
        client = self._get_client()
        resp = await client.post(
            f"{_GITHUB_API}/app/installations/{inst_key}/access_tokens",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": _ACCEPT_JSON,
                "X-GitHub-Api-Version": _API_VERSION,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        token = data["token"]

        # GitHub installation tokens expire in 1 hour; cache for 55 minutes
        self._installation_tokens[inst_key] = (token, now + 3300)
        logger.info("GitHub App installation access token acquired for installation %s", inst_key)
        return token

    async def _refresh_installation_token(self) -> None:
        """Exchange the App JWT for the configured installation's access token."""
        if not self._installation_id:
            return
        self._installation_token = await self.get_installation_token(self._installation_id)
        self._installation_token_expires = time.time() + 3300

    async def _get_auth_token(self) -> str:
        """Return the best available auth token (installation token or fallback PAT)."""
        if self._app_id and self._app_private_key:
            if not self._installation_id and self._owner and self._repo:
                try:
                    install_info = await self.get_repo_installation()
                    if install_info and "id" in install_info:
                        self._installation_id = str(install_info["id"])
                except Exception as exc:
                    logger.debug(
                        "Failed to dynamically look up installation for %s/%s: %s",
                        self._owner,
                        self._repo,
                        exc,
                    )

            if self._installation_id:
                return await self.get_installation_token(self._installation_id)

        if self._installation_token:
            if time.time() >= self._installation_token_expires:
                await self._refresh_installation_token()
            return self._installation_token

        return self._token

    @staticmethod
    def verify_webhook_signature(
        payload_body: bytes,
        signature_header: str | None,
        secret: str | None = None,
    ) -> bool:
        """Verify GitHub's HMAC-SHA256 webhook signature (X-Hub-Signature-256)."""
        if not signature_header:
            return False

        webhook_secret = secret or (
            get_settings().github_webhook_secret.get_secret_value()
            if get_settings().github_webhook_secret
            else None
        )
        if not webhook_secret:
            logger.warning("No GitHub webhook secret configured for signature verification")
            return False

        # GitHub sends 'sha256=<hex_digest>'
        sig = signature_header.strip()
        if sig.startswith("sha256="):
            sig = sig[7:]

        expected = hmac.new(
            key=webhook_secret.encode("utf-8"),
            msg=payload_body,
            digestmod=hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, sig)

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            raise RuntimeError("GitHubService not initialised — call init() first")
        return self._client

    async def _headers(self) -> dict[str, str]:
        token = await self._get_auth_token()
        return {
            "Authorization": f"token {token}",
            "Accept": _ACCEPT_JSON,
            "X-GitHub-Api-Version": _API_VERSION,
        }

    # ── Retry-aware request ─────────────────────────────────────

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict | list | None = None,
        params: dict | None = None,
    ) -> httpx.Response:
        """Issue an API request with retry and rate-limit backoff."""
        client = self._get_client()
        headers = await self._headers()
        url = f"{_GITHUB_API}{path}"
        last_exc: Exception | None = None

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                resp = await client.request(
                    method, url, headers=headers, json=json, params=params,
                )
                # Rate-limit handling
                if resp.status_code == 403:
                    remaining = resp.headers.get("X-RateLimit-Remaining", "1")
                    if remaining == "0":
                        reset_at = int(resp.headers.get("X-RateLimit-Reset", "0"))
                        wait = max(reset_at - int(time.time()), 1)
                        logger.warning(
                            "GitHub rate limit hit; sleeping %ds", wait,
                        )
                        import asyncio
                        await asyncio.sleep(min(wait, 120))
                        continue

                if resp.status_code == 404:
                    return resp  # Let caller handle 404 gracefully

                resp.raise_for_status()
                return resp

            except httpx.HTTPStatusError as exc:
                last_exc = exc
                if exc.response.status_code >= 500:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise
            except httpx.HTTPError as exc:
                last_exc = exc
                import asyncio
                await asyncio.sleep(2 ** attempt)

        raise RuntimeError(
            f"GitHub API request failed after {_MAX_RETRIES} retries: {last_exc}"
        )

    # ═════════════════════════════════════════════════════════════
    # Public API
    # ═════════════════════════════════════════════════════════════

    async def fetch_file_context(
        self,
        file_path: str,
        *,
        ref: str | None = None,
        line_number: int | None = None,
        context_lines: int = 50,
    ) -> FileContext:
        """Fetch file content from the repo, optionally windowed around a line.

        Parameters
        ----------
        file_path : str
            Repository-relative path (e.g. ``"app/services/orders.py"``).
        ref : str, optional
            Branch, tag, or commit SHA.  Defaults to the repo's default branch.
        line_number : int, optional
            Centre the context window around this line.
        context_lines : int
            Number of lines above and below ``line_number`` to include.
        """
        ref = ref or self._default_branch
        path = f"/repos/{self._owner}/{self._repo}/contents/{file_path}"
        resp = await self._request("GET", path, params={"ref": ref})

        if resp.status_code == 404:
            logger.warning("File not found: %s@%s", file_path, ref)
            return FileContext(
                file_path=file_path,
                content=f"# File not found: {file_path}",
                language=_guess_language(file_path),
            )

        data = resp.json()
        raw_content = base64.b64decode(data.get("content", "")).decode(
            "utf-8", errors="replace"
        )
        sha = data.get("sha", "")

        lines = raw_content.splitlines(keepends=True)
        total_lines = len(lines)

        if line_number and total_lines > 0:
            start = max(0, line_number - context_lines - 1)
            end = min(total_lines, line_number + context_lines)
            windowed = lines[start:end]
            content = "".join(windowed)
            start_line = start + 1
            end_line = end
        else:
            content = raw_content
            start_line = 1
            end_line = total_lines

        return FileContext(
            file_path=file_path,
            content=content,
            start_line=start_line,
            end_line=end_line,
            language=_guess_language(file_path),
            sha=sha,
        )

    async def fetch_recent_blame_and_diff(
        self,
        file_path: str,
        *,
        ref: str | None = None,
        line_start: int | None = None,
        line_end: int | None = None,
        max_commits: int = 5,
    ) -> BlameInfo:
        """Fetch git blame for a file region and recent commit history.

        Uses the GraphQL API for blame (REST doesn't expose it natively)
        and the Commits API for recent history.
        """
        ref = ref or self._default_branch
        blame_entries: list[dict[str, Any]] = []

        # ── Blame via GraphQL ───────────────────────────────────
        query = """
        query($owner: String!, $repo: String!, $ref: String!, $path: String!) {
          repository(owner: $owner, name: $repo) {
            object(expression: $ref) {
              ... on Commit {
                blame(path: $path) {
                  ranges {
                    startingLine
                    endingLine
                    age
                    commit {
                      oid
                      message
                      author {
                        name
                        email
                        date
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        variables = {
            "owner": self._owner,
            "repo": self._repo,
            "ref": ref,
            "path": file_path,
        }

        try:
            client = self._get_client()
            headers = await self._headers()
            gql_resp = await client.post(
                "https://api.github.com/graphql",
                headers=headers,
                json={"query": query, "variables": variables},
            )
            gql_resp.raise_for_status()
            gql_data = gql_resp.json()

            blame_obj = (
                gql_data.get("data", {})
                .get("repository", {})
                .get("object", {})
            )
            if blame_obj and "blame" in blame_obj:
                for rng in blame_obj["blame"].get("ranges", []):
                    s, e = rng["startingLine"], rng["endingLine"]
                    # Filter to requested line range if specified
                    if line_start and e < line_start:
                        continue
                    if line_end and s > line_end:
                        continue
                    commit = rng.get("commit", {})
                    blame_entries.append({
                        "start_line": s,
                        "end_line": e,
                        "commit_sha": commit.get("oid", ""),
                        "message": commit.get("message", ""),
                        "author": commit.get("author", {}).get("name", ""),
                        "email": commit.get("author", {}).get("email", ""),
                        "date": commit.get("author", {}).get("date", ""),
                        "age": rng.get("age", 0),
                    })
        except Exception as exc:
            logger.warning("GraphQL blame request failed: %s", exc)

        # ── Recent commits via REST ─────────────────────────────
        recent_commits: list[dict[str, Any]] = []
        try:
            path = f"/repos/{self._owner}/{self._repo}/commits"
            resp = await self._request(
                "GET",
                path,
                params={
                    "sha": ref,
                    "path": file_path,
                    "per_page": str(max_commits),
                },
            )
            if resp.status_code == 200:
                for item in resp.json():
                    recent_commits.append({
                        "sha": item.get("sha", ""),
                        "message": item.get("commit", {}).get("message", ""),
                        "author": (
                            item.get("commit", {})
                            .get("author", {})
                            .get("name", "")
                        ),
                        "date": (
                            item.get("commit", {})
                            .get("author", {})
                            .get("date", "")
                        ),
                    })
        except Exception as exc:
            logger.warning("Recent commits fetch failed: %s", exc)

        return BlameInfo(
            file_path=file_path,
            blame_entries=blame_entries,
            recent_commits=recent_commits,
        )

    async def create_remediation_pr(
        self,
        *,
        branch_name: str,
        file_patches: list[dict[str, str]],
        unit_test_code: str | None = None,
        unit_test_path: str | None = None,
        pr_title: str,
        pr_body: str,
    ) -> dict[str, Any]:
        """Create a branch, commit all patches + test file, and open a PR.

        Uses the low-level Git Data API for an atomic multi-file commit:
        1. Get the SHA of the default branch HEAD.
        2. Create a new branch ref.
        3. Build a tree with all modified/created blobs.
        4. Create a commit pointing at that tree.
        5. Update the branch ref.
        6. Open the Pull Request.

        Returns a dict with ``pr_url``, ``pr_number``, ``branch_name``.
        """
        base_branch = self._default_branch

        # 1. Get base branch HEAD SHA
        ref_resp = await self._request(
            "GET",
            f"/repos/{self._owner}/{self._repo}/git/ref/heads/{base_branch}",
        )
        base_sha = ref_resp.json()["object"]["sha"]

        # Get base commit to find its tree
        commit_resp = await self._request(
            "GET",
            f"/repos/{self._owner}/{self._repo}/git/commits/{base_sha}",
        )
        base_tree_sha = commit_resp.json()["tree"]["sha"]

        # 2. Create blobs for each patched file
        tree_items: list[dict[str, str]] = []

        for patch in file_patches:
            file_path = patch["file_path"]
            content = patch["content"]  # Already-patched full file content

            blob_resp = await self._request(
                "POST",
                f"/repos/{self._owner}/{self._repo}/git/blobs",
                json={"content": content, "encoding": "utf-8"},
            )
            tree_items.append({
                "path": file_path,
                "mode": "100644",
                "type": "blob",
                "sha": blob_resp.json()["sha"],
            })

        # Add unit test file if provided
        if unit_test_code and unit_test_path:
            test_blob_resp = await self._request(
                "POST",
                f"/repos/{self._owner}/{self._repo}/git/blobs",
                json={"content": unit_test_code, "encoding": "utf-8"},
            )
            tree_items.append({
                "path": unit_test_path,
                "mode": "100644",
                "type": "blob",
                "sha": test_blob_resp.json()["sha"],
            })

        # 3. Create tree
        tree_resp = await self._request(
            "POST",
            f"/repos/{self._owner}/{self._repo}/git/trees",
            json={"base_tree": base_tree_sha, "tree": tree_items},
        )
        new_tree_sha = tree_resp.json()["sha"]

        # 4. Create commit
        commit_msg = f"fix: {pr_title}\n\nAutomated remediation by Auto-Heal AI"
        new_commit_resp = await self._request(
            "POST",
            f"/repos/{self._owner}/{self._repo}/git/commits",
            json={
                "message": commit_msg,
                "tree": new_tree_sha,
                "parents": [base_sha],
            },
        )
        new_commit_sha = new_commit_resp.json()["sha"]

        # 5. Create branch ref
        await self._request(
            "POST",
            f"/repos/{self._owner}/{self._repo}/git/refs",
            json={
                "ref": f"refs/heads/{branch_name}",
                "sha": new_commit_sha,
            },
        )

        # 6. Open Pull Request
        pr_resp = await self._request(
            "POST",
            f"/repos/{self._owner}/{self._repo}/pulls",
            json={
                "title": pr_title,
                "body": pr_body,
                "head": branch_name,
                "base": base_branch,
            },
        )
        pr_data = pr_resp.json()

        result = {
            "pr_url": pr_data.get("html_url", ""),
            "pr_number": pr_data.get("number"),
            "branch_name": branch_name,
            "commit_sha": new_commit_sha,
        }

        logger.info(
            "Remediation PR created: %s (#%s)",
            result["pr_url"],
            result["pr_number"],
        )
        return result

    async def fetch_full_file(
        self,
        file_path: str,
        *,
        ref: str | None = None,
    ) -> str:
        """Fetch the complete raw content of a file.

        Returns the file content as a string, or raises on 404.
        """
        ref = ref or self._default_branch
        path = f"/repos/{self._owner}/{self._repo}/contents/{file_path}"
        resp = await self._request("GET", path, params={"ref": ref})

        if resp.status_code == 404:
            raise FileNotFoundError(
                f"File {file_path}@{ref} not found in {self._owner}/{self._repo}"
            )

        data = resp.json()
        return base64.b64decode(data.get("content", "")).decode(
            "utf-8", errors="replace"
        )


# ── Utility ─────────────────────────────────────────────────────

_EXTENSION_MAP: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".jsx": "javascript",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".rb": "ruby",
    ".php": "php",
    ".cs": "csharp",
    ".cpp": "cpp",
    ".c": "c",
    ".swift": "swift",
    ".scala": "scala",
    ".sql": "sql",
    ".sh": "bash",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".toml": "toml",
    ".xml": "xml",
    ".html": "html",
    ".css": "css",
}


def _guess_language(file_path: str) -> str:
    """Guess programming language from file extension."""
    for ext, lang in _EXTENSION_MAP.items():
        if file_path.endswith(ext):
            return lang
    return ""
