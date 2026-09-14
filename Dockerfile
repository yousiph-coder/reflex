# ─────────────────────────────────────────────────────────────────
# Auto-Heal AI — Production Multi-Stage Dockerfile
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: Build dependencies ────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build-essential for any wheels that need compilation
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Production runtime ────────────────────────────────
FROM python:3.11-slim AS runtime

# Security: run as non-root
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Runtime-only OS deps (libpq for asyncpg)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy pre-built Python packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy application code
COPY app/ ./app/

# Own everything by appuser
RUN chown -R appuser:appuser /app

USER appuser

# Expose the default port
EXPOSE 8000

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# ── Entrypoint ──────────────────────────────────────────────────
# Gunicorn with Uvicorn workers for production.
# Adjust --workers based on available CPU cores (2×CPU + 1 is a
# common heuristic, but for async workloads 1-2 workers per core
# is usually sufficient).
CMD ["gunicorn", \
     "app.main:app", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
