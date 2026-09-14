# ─────────────────────────────────────────────────────────────────
# Auto-Heal AI — Ephemeral Sandbox Test Runner
#
# Lightweight Python image pre-loaded with common test tooling.
# Containers built from this image are spun up per-incident,
# receive the patched code via a bind-mount at /workspace,
# run the test suite, and are destroyed immediately after.
# ─────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

LABEL maintainer="auto-heal-ai"
LABEL description="Ephemeral sandbox for validating remediation patches"

# ── OS-level deps ───────────────────────────────────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git \
        curl \
        gcc \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*

# ── Python test tooling ────────────────────────────────────────
RUN pip install --no-cache-dir \
    pytest==8.3.4 \
    pytest-cov==6.0.0 \
    pytest-asyncio==0.24.0 \
    pytest-timeout==2.3.1 \
    coverage==7.6.10 \
    mypy==1.14.1 \
    ruff==0.8.6 \
    httpx==0.28.1 \
    requests==2.32.3 \
    pydantic==2.10.4 \
    sqlalchemy==2.0.36 \
    fastapi==0.115.6

# ── Non-root user ──────────────────────────────────────────────
RUN groupadd --gid 1000 sandbox && \
    useradd --uid 1000 --gid sandbox --shell /bin/bash --create-home sandbox

# ── Workspace ──────────────────────────────────────────────────
RUN mkdir -p /workspace && chown sandbox:sandbox /workspace
WORKDIR /workspace

USER sandbox

# Default entrypoint: run pytest against whatever is mounted
ENTRYPOINT ["python", "-m", "pytest"]
CMD ["-xvs", "--timeout=55"]
