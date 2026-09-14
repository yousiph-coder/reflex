"""
Pydantic schemas for LLM structured remediation output.

These models enforce the exact JSON contract between the agent
orchestrator and every downstream consumer (sandbox runner, GitHub
service, notification dispatcher, and the persistence layer).

Every field carries validation constraints so malformed LLM output
is caught immediately rather than silently corrupting the pipeline.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ── Enums ───────────────────────────────────────────────────────

class ConfidenceLevel(str, Enum):
    """Human-readable confidence bucket derived from the raw score."""

    CRITICAL = "critical"   # ≥ 0.9 — near-certain fix
    HIGH = "high"           # 0.75 – 0.89
    MEDIUM = "medium"       # 0.50 – 0.74
    LOW = "low"             # 0.25 – 0.49
    SPECULATIVE = "speculative"  # < 0.25

    @classmethod
    def from_score(cls, score: float) -> "ConfidenceLevel":
        if score >= 0.9:
            return cls.CRITICAL
        if score >= 0.75:
            return cls.HIGH
        if score >= 0.50:
            return cls.MEDIUM
        if score >= 0.25:
            return cls.LOW
        return cls.SPECULATIVE


class PatchAction(str, Enum):
    """What kind of modification a file patch represents."""

    MODIFY = "modify"
    CREATE = "create"
    DELETE = "delete"


# ── File Patch ──────────────────────────────────────────────────

class FilePatch(BaseModel):
    """A single search-and-replace code transformation.

    ``search_block`` must appear *exactly once* in the target file.
    ``replace_block`` is the verbatim replacement text.
    For new files ``search_block`` is empty and ``action`` is ``create``.
    """

    model_config = ConfigDict(extra="forbid")

    file_path: str = Field(
        ...,
        min_length=1,
        max_length=1024,
        description="Repository-relative file path",
    )
    search_block: str = Field(
        default="",
        description="Exact text to locate in the file (empty for new files)",
    )
    replace_block: str = Field(
        ...,
        description="Replacement text",
    )
    action: PatchAction = Field(
        default=PatchAction.MODIFY,
        description="Type of file operation",
    )
    explanation: str = Field(
        default="",
        description="Brief explanation of why this change is needed",
    )

    @field_validator("file_path")
    @classmethod
    def _normalise_path(cls, v: str) -> str:
        """Strip leading slashes and normalise separators."""
        return v.lstrip("/").replace("\\", "/")

    @model_validator(mode="after")
    def _validate_patch_consistency(self) -> "FilePatch":
        if self.action == PatchAction.MODIFY and not self.search_block:
            raise ValueError(
                "search_block must not be empty for 'modify' patches"
            )
        if self.action == PatchAction.CREATE and self.search_block:
            raise ValueError(
                "search_block must be empty for 'create' patches"
            )
        return self


# ── Unit Test ───────────────────────────────────────────────────

class UnitTestSpec(BaseModel):
    """A unit test generated to validate the remediation patch."""

    model_config = ConfigDict(extra="forbid")

    test_file_path: str = Field(
        ...,
        min_length=1,
        max_length=1024,
        description="Repository-relative path for the test file",
    )
    test_code: str = Field(
        ...,
        min_length=10,
        description="Complete, self-contained test source code",
    )
    test_command: str = Field(
        default="pytest -xvs",
        description="Shell command to execute the test",
    )
    test_framework: str = Field(
        default="pytest",
        description="Test framework identifier (pytest, unittest, jest, …)",
    )

    @field_validator("test_file_path")
    @classmethod
    def _normalise_path(cls, v: str) -> str:
        return v.lstrip("/").replace("\\", "/")


# ── Top-level LLM Output ───────────────────────────────────────

class RemediationOutput(BaseModel):
    """Complete structured output from the LLM remediation agent.

    This is the schema that ``agent_orchestrator`` requests via
    JSON-mode / structured-output and validates on receipt.
    """

    model_config = ConfigDict(extra="ignore")

    root_cause_analysis: str = Field(
        ...,
        min_length=20,
        description=(
            "Detailed technical explanation of the root cause — "
            "what went wrong, which code path triggered the error, "
            "and why."
        ),
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model's self-assessed confidence in the proposed fix (0.0–1.0)",
    )
    file_patches: list[FilePatch] = Field(
        ...,
        min_length=1,
        description="Ordered list of code patches to apply",
    )
    unit_test: UnitTestSpec = Field(
        ...,
        description="Validation test for the patch",
    )
    post_mortem_summary: str = Field(
        ...,
        min_length=20,
        description=(
            "Markdown-formatted post-mortem summary suitable for a "
            "GitHub PR description and Slack/Discord notification."
        ),
    )
    suggested_preventions: list[str] = Field(
        default_factory=list,
        description="Optional list of long-term preventive measures",
    )

    @property
    def confidence_level(self) -> ConfidenceLevel:
        """Derive a human-readable confidence bucket."""
        return ConfidenceLevel.from_score(self.confidence_score)

    @property
    def total_patch_files(self) -> int:
        return len(self.file_patches)

    def to_pr_body(self) -> str:
        """Render a Markdown PR description from this output."""
        patches_section = "\n".join(
            f"- `{p.file_path}` — {p.explanation or p.action.value}"
            for p in self.file_patches
        )
        preventions = "\n".join(
            f"- {p}" for p in self.suggested_preventions
        ) if self.suggested_preventions else "_None suggested._"

        return (
            f"## 🤖 Auto-Heal AI — Automated Remediation\n\n"
            f"### Root Cause Analysis\n\n{self.root_cause_analysis}\n\n"
            f"### Confidence: {self.confidence_score:.0%} "
            f"({self.confidence_level.value})\n\n"
            f"### Changes\n\n{patches_section}\n\n"
            f"### Validation\n\n"
            f"Test file: `{self.unit_test.test_file_path}`\n"
            f"Command: `{self.unit_test.test_command}`\n\n"
            f"### Post-Mortem\n\n{self.post_mortem_summary}\n\n"
            f"### Suggested Preventions\n\n{preventions}\n\n"
            f"---\n"
            f"_Generated by Auto-Heal AI with "
            f"{self.confidence_score:.0%} confidence._\n"
        )


# ── Sandbox Execution Result ───────────────────────────────────

class SandboxResult(BaseModel):
    """Outcome of running the remediation patch inside the Docker sandbox."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(
        ...,
        description="True when exit_code == 0 and no timeout",
    )
    exit_code: int = Field(
        ...,
        description="Process exit code (0 = pass)",
    )
    stdout: str = Field(
        default="",
        description="Captured standard output",
    )
    stderr: str = Field(
        default="",
        description="Captured standard error",
    )
    duration_seconds: float = Field(
        ...,
        ge=0.0,
        description="Wall-clock execution time",
    )
    timed_out: bool = Field(
        default=False,
        description="True when execution exceeded the timeout",
    )
    container_id: str | None = Field(
        default=None,
        description="Docker container ID (for audit)",
    )

    @property
    def combined_output(self) -> str:
        """Merge stdout and stderr for error feedback to the LLM."""
        parts: list[str] = []
        if self.stdout.strip():
            parts.append(f"=== STDOUT ===\n{self.stdout.strip()}")
        if self.stderr.strip():
            parts.append(f"=== STDERR ===\n{self.stderr.strip()}")
        if self.timed_out:
            parts.append("=== TIMEOUT === Execution exceeded the allowed time limit.")
        return "\n\n".join(parts) if parts else "(no output captured)"

    def truncated_output(self, max_chars: int = 4000) -> str:
        """Return combined output truncated to *max_chars* for LLM context."""
        full = self.combined_output
        if len(full) <= max_chars:
            return full
        half = max_chars // 2
        return (
            full[:half]
            + f"\n\n... [{len(full) - max_chars} chars truncated] ...\n\n"
            + full[-half:]
        )


# ── LLM Retry Feedback ─────────────────────────────────────────

class RetryContext(BaseModel):
    """Context passed to the LLM when a previous attempt failed sandbox validation."""

    model_config = ConfigDict(extra="ignore")

    attempt_number: int = Field(
        ...,
        ge=1,
        description="Which retry iteration this is (1-indexed)",
    )
    previous_patch: RemediationOutput = Field(
        ...,
        description="The full previous remediation output that failed",
    )
    sandbox_result: SandboxResult = Field(
        ...,
        description="Sandbox execution result showing why it failed",
    )
    feedback_instructions: str = Field(
        default="",
        description="Additional human or system guidance for the retry",
    )


# ── File Context (from GitHub) ──────────────────────────────────

class FileContext(BaseModel):
    """Source file context fetched from GitHub for LLM consumption."""

    model_config = ConfigDict(extra="ignore")

    file_path: str
    content: str = Field(description="Full or windowed file content")
    start_line: int = Field(default=1, description="First line number in the content window")
    end_line: int = Field(default=0, description="Last line number in the content window")
    language: str = Field(default="", description="Detected programming language")
    sha: str = Field(default="", description="Git blob SHA")


class BlameInfo(BaseModel):
    """Git blame and recent change history for a file region."""

    model_config = ConfigDict(extra="ignore")

    file_path: str
    blame_entries: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Blame data per line (author, date, commit SHA)",
    )
    recent_commits: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Recent commits touching this file",
    )


# ── Orchestrator Input Bundle ───────────────────────────────────

class IncidentContext(BaseModel):
    """Everything the agent orchestrator needs to generate a fix."""

    model_config = ConfigDict(extra="ignore")

    incident_id: str
    sentry_issue_id: str
    title: str
    error_type: str
    error_message: str = ""
    stack_trace: str = ""
    file_path: str | None = None
    function_name: str | None = None
    line_number: int | None = None
    environment: str | None = None
    platform: str | None = None
    level: str = "error"
    file_contexts: list[FileContext] = Field(default_factory=list)
    blame_info: BlameInfo | None = None
    retry_context: RetryContext | None = None
    repo_owner: str = ""
    repo_name: str = ""
    default_branch: str = "main"
