"""
Multi-channel notification dispatcher supporting Slack (Block Kit) and Discord (Embeds).

Dispatches rich, asynchronous, non-blocking webhook notifications when:
- An incident is detected
- An automated remediation PR is successfully opened
- A remediation attempt exhausts retries and fails
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=5.0, read=10.0, write=10.0, pool=5.0)
_MAX_RETRIES = 2


class Notifier:
    """Multi-channel webhook notification service.

    Usage::

        notifier = Notifier(
            slack_webhook_url="https://hooks.slack.com/services/...",
            discord_webhook_url="https://discord.com/api/webhooks/...",
        )

        await notifier.notify_pr_opened(
            incident_title="KeyError in auth.py",
            error_type="KeyError",
            file_path="app/services/auth.py",
            root_cause_summary="Unchecked dict subscript 'user_id' in get_current_user",
            sandbox_test_results="Passed 5/5 unit tests in 0.31s",
            confidence_score=0.98,
            pr_url="https://github.com/org/repo/pull/1",
            pr_number=1,
        )
    """

    def __init__(
        self,
        *,
        slack_webhook_url: str | None = None,
        discord_webhook_url: str | None = None,
    ) -> None:
        self._slack_url = slack_webhook_url
        self._discord_url = discord_webhook_url
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    # ── Notification Handlers ───────────────────────────────────

    async def notify_pr_opened(
        self,
        *,
        incident_title: str,
        error_type: str,
        file_path: str,
        root_cause_summary: str,
        sandbox_test_results: str,
        confidence_score: float,
        pr_url: str,
        pr_number: int | None = None,
    ) -> None:
        """Dispatch notifications when an automated remediation PR is created."""
        tasks = []

        if self._slack_url:
            slack_payload = self._build_slack_pr_opened_payload(
                incident_title=incident_title,
                error_type=error_type,
                file_path=file_path,
                root_cause_summary=root_cause_summary,
                sandbox_test_results=sandbox_test_results,
                confidence_score=confidence_score,
                pr_url=pr_url,
                pr_number=pr_number,
            )
            tasks.append(self._post_webhook(self._slack_url, slack_payload, "Slack"))

        if self._discord_url:
            discord_payload = self._build_discord_pr_opened_payload(
                incident_title=incident_title,
                error_type=error_type,
                file_path=file_path,
                root_cause_summary=root_cause_summary,
                sandbox_test_results=sandbox_test_results,
                confidence_score=confidence_score,
                pr_url=pr_url,
                pr_number=pr_number,
            )
            tasks.append(self._post_webhook(self._discord_url, discord_payload, "Discord"))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        else:
            logger.debug("No notification webhooks configured for PR notification")

    async def notify_incident_detected(
        self,
        *,
        incident_id: str,
        title: str,
        error_type: str,
        file_path: str | None = None,
        environment: str | None = None,
    ) -> None:
        """Dispatch alert when an incident is ingested."""
        tasks = []

        if self._slack_url:
            slack_payload = {
                "attachments": [
                    {
                        "color": "#E74C3C",
                        "blocks": [
                            {
                                "type": "header",
                                "text": {"type": "plain_text", "text": "🚨 Incident Detected", "emoji": True},
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": f"*{title}*\n*Error Type:* `{error_type}`\n*Location:* `{file_path or 'unknown'}`\n*Environment:* `{environment or 'production'}`",
                                },
                            },
                            {
                                "type": "context",
                                "elements": [{"type": "mrkdwn", "text": f"Incident ID: `{incident_id}`"}],
                            },
                        ],
                    }
                ]
            }
            tasks.append(self._post_webhook(self._slack_url, slack_payload, "Slack"))

        if self._discord_url:
            discord_payload = {
                "username": "Auto-Heal AI",
                "embeds": [
                    {
                        "title": f"🚨 Incident Detected: {title}"[:256],
                        "color": 0xE74C3C,
                        "fields": [
                            {"name": "Error Type", "value": f"`{error_type}`", "inline": True},
                            {"name": "Location", "value": f"`{file_path or 'unknown'}`", "inline": True},
                            {"name": "Environment", "value": f"`{environment or 'production'}`", "inline": True},
                        ],
                        "footer": {"text": f"Incident ID: {incident_id}"},
                    }
                ],
            }
            tasks.append(self._post_webhook(self._discord_url, discord_payload, "Discord"))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def notify_remediation_failed(
        self,
        *,
        incident_id: str,
        title: str,
        reason: str,
        attempts: int,
    ) -> None:
        """Dispatch alert when autonomous remediation attempts are exhausted."""
        tasks = []

        if self._slack_url:
            slack_payload = {
                "attachments": [
                    {
                        "color": "#F39C12",
                        "blocks": [
                            {
                                "type": "header",
                                "text": {"type": "plain_text", "text": "⚠️ Remediation Failed", "emoji": True},
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": f"Auto-Heal exhausted {attempts} attempt(s) for *{title}* without passing sandbox tests.\n*Reason:* ```{reason[:300]}```",
                                },
                            },
                            {
                                "type": "context",
                                "elements": [{"type": "mrkdwn", "text": f"Incident ID: `{incident_id}`"}],
                            },
                        ],
                    }
                ]
            }
            tasks.append(self._post_webhook(self._slack_url, slack_payload, "Slack"))

        if self._discord_url:
            discord_payload = {
                "username": "Auto-Heal AI",
                "embeds": [
                    {
                        "title": f"⚠️ Remediation Failed: {title}"[:256],
                        "description": f"Exhausted {attempts} attempt(s) without passing sandbox tests.",
                        "color": 0xF39C12,
                        "fields": [
                            {"name": "Reason", "value": f"```{reason[:300]}```", "inline": False},
                            {"name": "Incident ID", "value": f"`{incident_id}`", "inline": True},
                        ],
                        "footer": {"text": "Manual intervention required"},
                    }
                ],
            }
            tasks.append(self._post_webhook(self._discord_url, discord_payload, "Discord"))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    # ── Slack Block Kit Formatter ───────────────────────────────

    def _build_slack_pr_opened_payload(
        self,
        *,
        incident_title: str,
        error_type: str,
        file_path: str,
        root_cause_summary: str,
        sandbox_test_results: str,
        confidence_score: float,
        pr_url: str,
        pr_number: int | None,
    ) -> dict[str, Any]:
        pr_display = f"#{pr_number}" if pr_number else "Pull Request"
        confidence_pct = f"{confidence_score * 100:.0f}%"

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🤖 Auto-Heal AI — Remediation PR Opened",
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*Incident:* {incident_title}\n"
                        f"*Error Type:* `{error_type}`\n"
                        f"*Target File:* `{file_path}`"
                    ),
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Root Cause Summary:*\n{root_cause_summary[:600]}",
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Confidence Score:*\n`{confidence_pct}`"},
                    {"type": "mrkdwn", "text": f"*Sandbox Validation:*\n`{sandbox_test_results[:100]}`"},
                ],
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": f"View GitHub PR ({pr_display})", "emoji": True},
                        "url": pr_url,
                        "style": "primary",
                    }
                ],
            },
            {"type": "divider"},
        ]

        return {"attachments": [{"color": "#2ECC71", "blocks": blocks}]}

    # ── Discord Embeds Formatter ────────────────────────────────

    def _build_discord_pr_opened_payload(
        self,
        *,
        incident_title: str,
        error_type: str,
        file_path: str,
        root_cause_summary: str,
        sandbox_test_results: str,
        confidence_score: float,
        pr_url: str,
        pr_number: int | None,
    ) -> dict[str, Any]:
        pr_display = f"PR #{pr_number}" if pr_number else "Pull Request"
        confidence_pct = f"{confidence_score * 100:.0f}%"

        embed = {
            "title": f"🤖 Auto-Heal AI: Remediation {pr_display} Opened"[:256],
            "description": f"An autonomous fix has been verified and opened for **{incident_title}**.",
            "url": pr_url,
            "color": 0x2ECC71,  # Emerald Green
            "fields": [
                {"name": "Error Type", "value": f"`{error_type}`", "inline": True},
                {"name": "Target File", "value": f"`{file_path}`", "inline": True},
                {"name": "Confidence Score", "value": f"`{confidence_pct}`", "inline": True},
                {"name": "Sandbox Verification", "value": f"`{sandbox_test_results[:120]}`", "inline": True},
                {"name": "Root Cause Analysis", "value": root_cause_summary[:1000], "inline": False},
                {"name": "GitHub Pull Request", "value": f"[Open {pr_display} on GitHub]({pr_url})", "inline": False},
            ],
            "footer": {"text": "Auto-Heal AI • Autonomous SRE Closed-Loop Engine"},
        }

        return {
            "username": "Auto-Heal AI",
            "embeds": [embed],
        }

    # ── Transport Execution ─────────────────────────────────────

    async def _post_webhook(
        self,
        url: str,
        payload: dict[str, Any],
        channel_name: str,
    ) -> None:
        """Send asynchronous webhook HTTP request with retry logic."""
        client = await self._get_client()

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code in (200, 204):
                    logger.info("Delivered %s webhook notification successfully", channel_name)
                    return

                if resp.status_code == 429:
                    retry_after = float(resp.headers.get("Retry-After", "2.0"))
                    logger.warning("%s rate limited; sleeping %.1fs", channel_name, retry_after)
                    await asyncio.sleep(retry_after)
                    continue

                logger.warning("%s webhook returned unexpected HTTP %d: %s", channel_name, resp.status_code, resp.text[:200])
            except httpx.HTTPError as exc:
                logger.warning("%s webhook HTTP error (attempt %d/%d): %s", channel_name, attempt, _MAX_RETRIES, exc)
                await asyncio.sleep(1.5 ** attempt)
            except Exception as exc:
                logger.error("Unexpected error delivering %s webhook: %s", channel_name, exc, exc_info=True)
                break
