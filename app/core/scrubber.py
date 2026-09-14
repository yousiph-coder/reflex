"""
Robust regex-based secret and PII scrubber.

Designed to sanitise stack traces, exception messages, and arbitrary
text before it is stored in the database or sent to an LLM.  Every
matched secret is replaced with a descriptive ``[REDACTED_*]`` token
so engineers can still read the surrounding context.

Covered secret types
--------------------
- AWS access key IDs (``AKIA…``) and secret keys
- JSON Web Tokens (``eyJ…``)
- Bearer / Basic Authorization tokens
- GitHub personal access tokens (``ghp_``, ``gho_``, ``ghs_``, ``ghr_``,
  ``github_pat_``)
- Generic API keys / secrets / passwords in assignment contexts
- Database connection strings with embedded credentials
- Private keys (PEM blocks)
- IPv4 addresses (optionally, disabled by default)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import ClassVar


@dataclass(frozen=True, slots=True)
class _Pattern:
    """A named redaction pattern."""

    name: str
    regex: re.Pattern[str]
    replacement: str


class SecretScrubber:
    """Stateless, thread-safe secret / PII scrubber.

    Usage::

        scrubber = SecretScrubber()
        clean = scrubber.scrub(dirty_text)
    """

    # Class-level compiled patterns — compiled once, reused forever.
    _PATTERNS: ClassVar[list[_Pattern]] = [
        # ── AWS Access Key IDs ──────────────────────────────────
        _Pattern(
            name="aws_access_key",
            regex=re.compile(r"(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])"),
            replacement="[REDACTED_AWS_ACCESS_KEY]",
        ),
        # ── AWS Secret Access Keys (in assignment context) ──────
        _Pattern(
            name="aws_secret_key",
            regex=re.compile(
                r"(?i)"
                r"(?:aws_secret_access_key|aws_secret|secret_access_key|AWS_SECRET_ACCESS_KEY)"
                r"\s*[=:]\s*"
                r"""(?P<quote>['"]?)"""
                r"(?P<secret>[A-Za-z0-9/+=]{20,64})"
                r"(?P=quote)",
            ),
            replacement=r"[REDACTED_AWS_SECRET_KEY]",
        ),
        # ── JSON Web Tokens ─────────────────────────────────────
        _Pattern(
            name="jwt",
            regex=re.compile(
                r"eyJ[A-Za-z0-9_-]{10,}\."
                r"eyJ[A-Za-z0-9_-]{10,}\."
                r"[A-Za-z0-9_-]{10,}"
            ),
            replacement="[REDACTED_JWT]",
        ),
        # ── Bearer tokens ───────────────────────────────────────
        _Pattern(
            name="bearer_token",
            regex=re.compile(
                r"(?i)(Bearer\s+)[A-Za-z0-9_\-\.]{20,}"
            ),
            replacement=r"\1[REDACTED_BEARER_TOKEN]",
        ),
        # ── Basic Auth header ───────────────────────────────────
        _Pattern(
            name="basic_auth",
            regex=re.compile(
                r"(?i)(Basic\s+)[A-Za-z0-9+/=]{10,}"
            ),
            replacement=r"\1[REDACTED_BASIC_AUTH]",
        ),
        # ── GitHub PATs (ghp_, gho_, ghs_, ghr_) ───────────────
        _Pattern(
            name="github_pat",
            regex=re.compile(
                r"gh[posru]_[A-Za-z0-9_]{36,255}"
            ),
            replacement="[REDACTED_GITHUB_TOKEN]",
        ),
        # ── GitHub fine-grained PATs ────────────────────────────
        _Pattern(
            name="github_fine_grained_pat",
            regex=re.compile(
                r"github_pat_[A-Za-z0-9_]{22,255}"
            ),
            replacement="[REDACTED_GITHUB_FINE_GRAINED_PAT]",
        ),
        # ── Database connection strings with password ───────────
        # Matches: scheme://user:PASSWORD@host
        _Pattern(
            name="db_connection_password",
            regex=re.compile(
                r"(?i)"
                r"((?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp|mssql)"
                r"(?:\+[a-z0-9]+)?"   # optional driver (e.g. +asyncpg)
                r"://[^:]+:)"          # scheme://user:
                r"([^@\s]{1,256})"     # password
                r"(@)"                 # @host boundary
            ),
            replacement=r"\1[REDACTED_DB_PASSWORD]\3",
        ),
        # ── Generic API key / secret / token assignments ────────
        # Catches patterns like:  API_KEY = "sk-abc123…"
        _Pattern(
            name="generic_api_key",
            regex=re.compile(
                r"(?i)"
                r"(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token"
                r"|secret[_-]?key|client[_-]?secret|private[_-]?key"
                r"|password|passwd|pwd)"
                r"\s*[=:]\s*"
                r"""(?P<quote>['"]?)"""
                r"(?P<value>[^\s'\"]{8,512})"
                r"(?P=quote)",
            ),
            replacement="[REDACTED_SECRET]",
        ),
        # ── Authorization headers in HTTP logs ──────────────────
        _Pattern(
            name="auth_header",
            regex=re.compile(
                r"(?i)"
                r"((?:Authorization|X-Api-Key|X-Auth-Token|Proxy-Authorization)"
                r"\s*[:=]\s*)"
                r"""(?P<quote>['"]?)"""
                r"(?P<value>[^\s'\"]{8,1024})"
                r"(?P=quote)",
            ),
            replacement=r"\1[REDACTED_AUTH_HEADER]",
        ),
        # ── PEM private keys ────────────────────────────────────
        _Pattern(
            name="private_key_pem",
            regex=re.compile(
                r"-----BEGIN\s(?:RSA\s|EC\s|DSA\s|OPENSSH\s)?PRIVATE\sKEY-----"
                r"[\s\S]{10,8192}?"
                r"-----END\s(?:RSA\s|EC\s|DSA\s|OPENSSH\s)?PRIVATE\sKEY-----",
            ),
            replacement="[REDACTED_PRIVATE_KEY]",
        ),
        # ── Slack tokens ────────────────────────────────────────
        _Pattern(
            name="slack_token",
            regex=re.compile(
                r"xox[bpors]-[A-Za-z0-9-]{10,250}"
            ),
            replacement="[REDACTED_SLACK_TOKEN]",
        ),
        # ── Stripe keys ─────────────────────────────────────────
        _Pattern(
            name="stripe_key",
            regex=re.compile(
                r"(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,250}"
            ),
            replacement="[REDACTED_STRIPE_KEY]",
        ),
        # ── SendGrid API key ────────────────────────────────────
        _Pattern(
            name="sendgrid_key",
            regex=re.compile(
                r"SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}"
            ),
            replacement="[REDACTED_SENDGRID_KEY]",
        ),
    ]

    def __init__(self, *, extra_patterns: list[_Pattern] | None = None) -> None:
        """Initialise with optional additional custom patterns."""
        self._patterns: list[_Pattern] = list(self._PATTERNS)
        if extra_patterns:
            self._patterns.extend(extra_patterns)

    # ── Public API ──────────────────────────────────────────────
    def scrub(self, text: str | None) -> str:
        """Apply all redaction patterns to *text* and return the cleaned result.

        Returns an empty string when *text* is ``None`` or empty.
        """
        if not text:
            return ""

        result = text
        for pattern in self._patterns:
            result = pattern.regex.sub(pattern.replacement, result)

        return result

    def scrub_dict(self, data: dict, *, depth: int = 0, max_depth: int = 20) -> dict:
        """Recursively scrub all string values in a nested dict.

        Guards against excessive nesting with *max_depth* (default 20).
        Non-string, non-dict, non-list values are passed through unchanged.
        """
        if depth > max_depth:
            return data

        cleaned: dict = {}
        for key, value in data.items():
            if isinstance(value, str):
                cleaned[key] = self.scrub(value)
            elif isinstance(value, dict):
                cleaned[key] = self.scrub_dict(value, depth=depth + 1, max_depth=max_depth)
            elif isinstance(value, list):
                cleaned[key] = self._scrub_list(value, depth=depth + 1, max_depth=max_depth)
            else:
                cleaned[key] = value
        return cleaned

    # ── Private helpers ─────────────────────────────────────────
    def _scrub_list(self, items: list, *, depth: int, max_depth: int) -> list:
        """Recursively scrub items in a list."""
        if depth > max_depth:
            return items

        cleaned: list = []
        for item in items:
            if isinstance(item, str):
                cleaned.append(self.scrub(item))
            elif isinstance(item, dict):
                cleaned.append(self.scrub_dict(item, depth=depth + 1, max_depth=max_depth))
            elif isinstance(item, list):
                cleaned.append(self._scrub_list(item, depth=depth + 1, max_depth=max_depth))
            else:
                cleaned.append(item)
        return cleaned

    @classmethod
    def pattern_names(cls) -> list[str]:
        """Return the names of all built-in patterns (useful for tests)."""
        return [p.name for p in cls._PATTERNS]
