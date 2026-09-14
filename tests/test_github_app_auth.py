"""
Unit and integration tests for GitHub App authentication, JWT generation,
webhook signature verification, and lifecycle event handling.
"""

import hashlib
import hmac
import json
import time
import unittest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.models.incident import Incident, IncidentStatus, RemediationAttempt, RemediationStatus
from app.services.github_service import GitHubService, _normalize_private_key


def _generate_test_rsa_pem() -> str:
    """Generate a test 2048-bit RSA private key in PEM format."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    pem_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return pem_bytes.decode("utf-8")


class TestGitHubAppAuth(unittest.TestCase):
    """Test RS256 JWT generation and key normalization."""

    @classmethod
    def setUpClass(cls):
        cls.rsa_pem = _generate_test_rsa_pem()

    def test_normalize_private_key_escaped_newlines(self):
        escaped = self.rsa_pem.replace("\n", "\\n")
        normalized = _normalize_private_key(escaped)
        self.assertIn("-----BEGIN PRIVATE KEY-----", normalized)
        self.assertIn("\n", normalized)
        self.assertNotIn("\\n", normalized)

    def test_generate_app_jwt(self):
        svc = GitHubService(
            app_id="998877",
            app_private_key=self.rsa_pem,
            owner="test-owner",
            repo="test-repo",
        )
        token = svc._generate_app_jwt()
        self.assertIsInstance(token, str)

        # Decode without verification to inspect claims
        claims = jwt.decode(token, options={"verify_signature": False})
        self.assertEqual(claims["iss"], "998877")
        self.assertIn("iat", claims)
        self.assertIn("exp", claims)
        self.assertEqual(claims["exp"] - claims["iat"], 600)

    def test_generate_app_jwt_missing_credentials(self):
        svc = GitHubService(
            app_id="",
            app_private_key="",
            owner="test-owner",
            repo="test-repo",
        )
        with self.assertRaises(RuntimeError):
            svc._generate_app_jwt()

    def test_verify_webhook_signature(self):
        secret = "super-secret-webhook-key-123"
        payload = b'{"action":"created","installation":{"id":12345}}'

        # Compute valid signature
        valid_digest = hmac.new(
            key=secret.encode("utf-8"),
            msg=payload,
            digestmod=hashlib.sha256,
        ).hexdigest()

        # Valid with sha256= prefix
        self.assertTrue(
            GitHubService.verify_webhook_signature(
                payload_body=payload,
                signature_header=f"sha256={valid_digest}",
                secret=secret,
            )
        )

        # Valid without sha256= prefix
        self.assertTrue(
            GitHubService.verify_webhook_signature(
                payload_body=payload,
                signature_header=valid_digest,
                secret=secret,
            )
        )

        # Invalid signature
        self.assertFalse(
            GitHubService.verify_webhook_signature(
                payload_body=payload,
                signature_header="sha256=invalid_hex_digest",
                secret=secret,
            )
        )

        # Missing signature
        self.assertFalse(
            GitHubService.verify_webhook_signature(
                payload_body=payload,
                signature_header=None,
                secret=secret,
            )
        )


class TestGitHubWebhookEndpoint(unittest.TestCase):
    """Test FastAPI GitHub webhook route handling."""

    def setUp(self):
        self.secret = "test-webhook-secret"
        self.app = create_app()

        # Mock db session dependency
        from app.config import get_settings
        from app.database import get_db_session

        async def mock_get_db():
            mock_session = AsyncMock()
            mock_res = MagicMock()
            mock_res.scalars.return_value.first.return_value = None
            mock_res.scalar_one_or_none.return_value = None
            mock_session.execute.return_value = mock_res
            yield mock_session

        def mock_settings():
            settings = MagicMock()
            settings.github_webhook_secret.get_secret_value.return_value = self.secret
            return settings

        self.app.dependency_overrides[get_db_session] = mock_get_db
        self.app.dependency_overrides[get_settings] = mock_settings
        self.client = TestClient(self.app)

    def tearDown(self):
        self.app.dependency_overrides.clear()

    def _sign_payload(self, body: bytes) -> str:
        digest = hmac.new(
            key=self.secret.encode("utf-8"),
            msg=body,
            digestmod=hashlib.sha256,
        ).hexdigest()
        return f"sha256={digest}"

    @patch("app.api.v1.webhooks.get_settings")
    def test_github_webhook_ping_event(self, mock_settings):
        settings = MagicMock()
        settings.github_webhook_secret.get_secret_value.return_value = self.secret
        mock_settings.return_value = settings

        body = json.dumps({"zen": "Keep it logically awesome.", "hook_id": 42}).encode()
        sig = self._sign_payload(body)

        response = self.client.post(
            "/api/v1/webhooks/github",
            content=body,
            headers={
                "Content-Type": "application/json",
                "x-hub-signature-256": sig,
                "x-github-event": "ping",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "pong")
        self.assertEqual(data["zen"], "Keep it logically awesome.")

    @patch("app.api.v1.webhooks.get_settings")
    def test_github_webhook_invalid_signature_raises_401(self, mock_settings):
        settings = MagicMock()
        settings.github_webhook_secret.get_secret_value.return_value = self.secret
        mock_settings.return_value = settings

        body = json.dumps({"action": "created"}).encode()

        response = self.client.post(
            "/api/v1/webhooks/github",
            content=body,
            headers={
                "Content-Type": "application/json",
                "x-hub-signature-256": "sha256=wrongsignature",
                "x-github-event": "installation",
            },
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid GitHub webhook signature", response.json()["detail"])

    @patch("app.api.v1.webhooks.get_settings")
    def test_github_webhook_installation_created(self, mock_settings):
        settings = MagicMock()
        settings.github_webhook_secret.get_secret_value.return_value = self.secret
        mock_settings.return_value = settings

        body = json.dumps({
            "action": "created",
            "installation": {"id": 88123, "account": {"login": "acme-corp"}},
        }).encode()
        sig = self._sign_payload(body)

        response = self.client.post(
            "/api/v1/webhooks/github",
            content=body,
            headers={
                "Content-Type": "application/json",
                "x-hub-signature-256": sig,
                "x-github-event": "installation",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "processed")
        self.assertEqual(data["action"], "created")
        self.assertEqual(data["installation_id"], 88123)
        self.assertEqual(data["account"], "acme-corp")


if __name__ == "__main__":
    unittest.main()
