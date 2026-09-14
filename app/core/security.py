"""
Cryptographic security utilities for API key management and hashing.

Provides:
- Generation of high-entropy, prefixed API keys (e.g. ``ah_live_...``).
- Constant-time SHA-256 key hashing for safe storage and verification.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets


def generate_api_key(
    prefix: str = "ah_live_",
    entropy_bytes: int = 32,
) -> tuple[str, str, str]:
    """Generate a new secure API key with prefix and hash.

    Returns
    -------
    tuple[str, str, str]
        (raw_key, key_prefix, hashed_key)
        - ``raw_key``: The full plaintext secret shown to the user once (e.g. ``ah_live_a1b2...``).
        - ``key_prefix``: The public prefix for identification (e.g. ``ah_live_a1b2c3d4``).
        - ``hashed_key``: The SHA-256 hex digest to persist in PostgreSQL.
    """
    random_part = secrets.token_urlsafe(entropy_bytes)
    raw_key = f"{prefix}{random_part}"
    key_prefix = raw_key[:16]
    hashed_key = hash_api_key(raw_key)
    return raw_key, key_prefix, hashed_key


def hash_api_key(raw_key: str) -> str:
    """Compute a deterministic SHA-256 hex digest of the raw API key."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def verify_api_key(raw_key: str, hashed_key: str) -> bool:
    """Constant-time comparison between raw API key and stored hash."""
    computed = hash_api_key(raw_key)
    return hmac.compare_digest(computed, hashed_key)
