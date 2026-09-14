"""
Slack & Discord webhook notification dispatcher.

Sends rich, structured messages for:
- New incident detection
- Remediation PR opened
- Remediation failure (exhausted retries)

All HTTP calls are async via ``httpx`` with retry logic.
Notification delivery is best-effort — failures are logged but
never propagate to the caller so the core pipeline is unaffected.
"""

from __future__ import annotations

import logging
from enum import Enum
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=5.0, read=10.0, write=10.0, pool=5.0)
_MAX_RETRIES = 2


class NotificationType(str, Enum):
    INCIDENT_CREATED = "incident_created"
    PR_OPENED = "pr_opened"
    REMEDIATION_FAILED = "remediation_failed"


# ── Colour palette ──────────────────────────────────────────────
_COLORS = {
    NotificationType.INCIDENT_CREATED: {"slack": "#E74C3C", "discord": 0xE74C3C},
    NotificationType.PR_OPENED: {"slack": "#2ECC71", "discord": 0x2ECC71},
    NotificationType.REMEDIATION_FAILED: {"slack": "#F39C12", "discord": 0xF39C12},
}

_EMOJIS = {
    NotificationType.INCIDENT_CREATED: "🚨",
    NotificationType.PR_OPENED: "✅",
    NotificationType.REMEDIATION_FAILED: "⚠️",
}


# ═════════════════════════════════════════════════════════════════
# Notification Dispatcher
# ═════════════════════════════════════════════════════════════════

class NotificationDispatcher:
    """Async Slack / Discord notification sender.

    Usage::

        dispatcher = NotificationDispatcher(
            slack_webhook_url="https://hooks.slack.com/services/...",
            discord_webhook_url="https://discord.com/api/webhooks/...",
        )
        await dispatcher.notify_pr_opened(
            incident_id="abc-123",
            title="NullPointerException in OrderService",
            pr_url="https://github.com/org/repo/pull/42",
            confidence=0.87,
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

    # ── High-level convenience methods ──────────────────────────

    async def notify_incident_created(
        self,
        *,
        incident_id: str,
        title: str,
        error_type: str,
        file_path: str | None = None,
        environment: str | None = None,
    ) -> None:
        """Send an alert for a newly ingested incident."""
        fields = {
            "Incident ID": f"`{incident_id}`",
            "Error Type": f"`{error_type}`",
        }
        if file_path:
            fields["File"] = f"`{file_path}`"
        if environment:
            fields["Environment"] = environment

        await self._dispatch(
            notification_type=NotificationType.INCIDENT_CREATED,
            title=f"New Incident: {title}",
            description=(
                f"Auto-Heal AI detected a new error and is beginning analysis.\n"
                f"**{error_type}** in `{file_path or 'unknown'}`"
            ),
            fields=fields,
        )

    async def notify_pr_opened(
        self,
        *,
        incident_id: str,
        title: str,
        pr_url: str,
        pr_number: int | None = None,
        confidence: float = 0.0,
        post_mortem: str = "",
    ) -> None:
        """Send a notification when a remediation PR is opened."""
        fields = {
            "Incident ID": f"`{incident_id}`",
            "Pull Request": f"<{pr_url}|#{pr_number}>" if pr_number else pr_url,
            "Confidence": f"{confidence:.0%}",
        }
        description = f"A remediation PR has been opened automatically."
        if post_mortem:
            # Truncate for notification display
            summary = post_mortem[:500] + ("…" if len(post_mortem) > 500 else "")
            description += f"\n\n**Summary:** {summary}"

        await self._dispatch(
            notification_type=NotificationType.PR_OPENED,
            title=f"PR Opened: {title}",
            description=description,
            fields=fields,
            url=pr_url,
        )

    async def notify_remediation_failed(
        self,
        *,
        incident_id: str,
        title: str,
        reason: str,
        attempts: int,
    ) -> None:
        """Send a notification when remediation has exhausted all retries."""
        fields = {
            "Incident ID": f"`{incident_id}`",
            "Attempts": str(attempts),
            "Reason": reason[:300],
        }
        await self._dispatch(
            notification_type=NotificationType.REMEDIATION_FAILED,
            title=f"Remediation Failed: {title}",
            description=(
                f"Auto-Heal AI was unable to produce a passing fix "
                f"after {attempts} attempt(s). Manual intervention required."
            ),
            fields=fields,
        )

    # ── Core dispatch ───────────────────────────────────────────

    async def _dispatch(
        self,
        *,
        notification_type: NotificationType,
        title: str,
        description: str,
        fields: dict[str, str] | None = None,
        url: str | None = None,
    ) -> None:
        """Fan-out to all configured channels."""
        if self._slack_url:
            await self._send_slack(
                notification_type=notification_type,
                title=title,
                description=description,
                fields=fields or {},
                url=url,
            )
        if self._discord_url:
            await self._send_discord(
                notification_type=notification_type,
                title=title,
                description=description,
                fields=fields or {},
                url=url,
            )
        if not self._slack_url and not self._discord_url:
            logger.debug(
                "No notification channels configured; skipping %s for '%s'",
                notification_type.value,
                title,
            )

    # ── Slack (Block Kit) ───────────────────────────────────────

    async def _send_slack(
        self,
        *,
        notification_type: NotificationType,
        title: str,
        description: str,
        fields: dict[str, str],
        url: str | None,
    ) -> None:
        emoji = _EMOJIS.get(notification_type, "ℹ️")
        color = _COLORS.get(notification_type, {}).get("slack", "#808080")

        # Build Block Kit blocks
        blocks: list[dict[str, Any]] = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {title}"[:150],
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": description[:3000],
                },
            },
        ]

        if fields:
            field_blocks = [
                {"type": "mrkdwn", "text": f"*{k}*\n{v}"}
                for k, v in fields.items()
            ]
            # Slack allows max 10 fields per section
            for i in range(0, len(field_blocks), 10):
                blocks.append({
                    "type": "section",
                    "fields": field_blocks[i : i + 10],
                })

        if url:
            blocks.append({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "View PR"},
                        "url": url,
                        "style": "primary",
                    }
                ],
            })

        blocks.append({"type": "divider"})

        payload = {
            "attachments": [{"color": color, "blocks": blocks}],
        }

        await self._post_webhook(self._slack_url, payload, "Slack")  # type: ignore[arg-type]

    # ── Discord (Embeds) ────────────────────────────────────────

    async def _send_discord(
        self,
        *,
        notification_type: NotificationType,
        title: str,
        description: str,
        fields: dict[str, str],
        url: str | None,
    ) -> None:
        emoji = _EMOJIS.get(notification_type, "ℹ️")
        color = _COLORS.get(notification_type, {}).get("discord", 0x808080)

        embed: dict[str, Any] = {
            "title": f"{emoji} {title}"[:256],
            "description": description[:4096],
            "color": color,
            "fields": [
                {"name": k, "value": v, "inline": True}
                for k, v in (fields or {}).items()
            ],
            "footer": {"text": "Auto-Heal AI"},
        }
        if url:
            embed["url"] = url

        payload = {
            "username": "Auto-Heal AI",
            "embeds": [embed],
        }

        await self._post_webhook(self._discord_url, payload, "Discord")  # type: ignore[arg-type]

    # ── HTTP posting with retry ─────────────────────────────────

    async def _post_webhook(
        self,
        url: str,
        payload: dict[str, Any],
        channel_name: str,
    ) -> None:
        """POST JSON to a webhook URL with basic retry."""
        client = await self._get_client()
        last_error: Exception | None = None

        for attempt in range(1, _MAX_RETRIES + 2):
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code in (200, 204):
                    logger.info(
                        "%s notification delivered (status=%d)",
                        channel_name,
                        resp.status_code,
                    )
                    return
                if resp.status_code == 429:
                    retry_after = float(resp.headers.get("Retry-After", "2"))
                    logger.warning(
                        "%s rate-limited; retrying in %.1fs",
                        channel_name,
                        retry_after,
                    )
                    import asyncio
                    await asyncio.sleep(retry_after)
                    continue
                logger.warning(
                    "%s webhook returned %d: %s",
                    channel_name,
                    resp.status_code,
                    resp.text[:500],
                )
                last_error = RuntimeError(
                    f"{channel_name} returned {resp.status_code}"
                )
            except httpx.HTTPError as exc:
                last_error = exc
                logger.warning(
                    "%s webhook attempt %d/%d failed: %s",
                    channel_name,
                    attempt,
                    _MAX_RETRIES + 1,
                    exc,
                )
            except Exception as exc:
                last_error = exc
                logger.error(
                    "%s webhook unexpected error: %s",
                    channel_name,
                    exc,
                    exc_info=True,
                )
                break  # Don't retry unknown errors

        logger.error(
            "%s notification delivery failed after %d attempts: %s",
            channel_name,
            _MAX_RETRIES + 1,
            last_error,
        )
