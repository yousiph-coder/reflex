import asyncio
import uuid
from datetime import datetime, timezone
from app.database import get_session_factory, init_db, close_db
from app.models.incident import Incident, IncidentStatus, RemediationAttempt, RemediationStatus
from app.models.organization import Organization
from sqlalchemy import select

async def seed_awaiting_incident():
    await init_db()
    factory = get_session_factory()
    async with factory() as db:
        res = await db.execute(select(Organization).where(Organization.slug == "autoheal-demo"))
        org = res.scalar_one_or_none()
        if not org:
            print("Org autoheal-demo not found!")
            return

        stmt = select(Incident).where(
            Incident.organization_id == org.id,
            Incident.status == IncidentStatus.AWAITING_APPROVAL
        )
        res_i = await db.execute(stmt)
        existing = res_i.scalar_one_or_none()
        if existing:
            print(f"Awaiting incident already exists: {existing.id} ({existing.title})")
            return

        inc_id = uuid.UUID("3d7a8c1e-9f2b-4e6a-8d0c-1a2b3c4d5e6f")
        diff_text = """--- a/app/services/analytics.py
+++ b/app/services/analytics.py
@@ -39,7 +39,11 @@ def calculate_conversion_rate(conversions: int, total_visitors: int) -> float:
-    rate = conversions / total_visitors
-    return round(rate, 4)
+    if total_visitors <= 0:
+        return 0.0
+    if conversions < 0:
+        raise ValueError("conversions cannot be negative")
+    rate = conversions / total_visitors
+    return round(rate, 4)"""

        rca_text = """### Root Cause Analysis (RCA)
In `calculate_conversion_rate`, the denominator `total_visitors` is evaluated directly without validating against zero or empty traffic periods. When zero visitors browse during off-peak window batches, the arithmetic expression `conversions / total_visitors` causes an immediate unhandled `ZeroDivisionError`.

### Proposed Solution
1. Add defensive guard: `if total_visitors <= 0: return 0.0`.
2. Validate `conversions` is non-negative.
3. Validate float rounding up to 4 decimal precision.
4. Verified with new test case in `tests/test_analytics.py`."""

        raw_event = {
            "sentry_id": "ISSUE-ANALYTICS-DIVZERO-701",
            "handled": False,
            "platform": "python",
            "sandbox_test_results": {
                "exit_code": 0,
                "passed": 5,
                "failed": 0,
                "runtime": "0.28s",
                "output": (
                    "tests/test_analytics.py::test_conversion_rate_zero_visitors PASSED [ 20%]\n"
                    "tests/test_analytics.py::test_conversion_rate_negative_conversions PASSED [ 40%]\n"
                    "tests/test_analytics.py::test_conversion_rate_normal PASSED [ 60%]\n"
                    "tests/test_analytics.py::test_rounding_precision PASSED [ 80%]\n"
                    "tests/test_analytics.py::test_idempotent_execution PASSED [100%]\n\n"
                    "============================== 5 passed in 0.28s =============================="
                )
            },
            "remediation_output": {
                "root_cause_analysis": (
                    "In calculate_conversion_rate, the denominator total_visitors is evaluated directly "
                    "without validating against zero or empty traffic periods. When zero visitors browse during "
                    "off-peak window batches, the arithmetic expression conversions / total_visitors causes "
                    "an immediate unhandled ZeroDivisionError."
                ),
                "confidence_score": 0.96,
                "file_patches": [
                    {
                        "file_path": "app/services/analytics.py",
                        "action": "modify",
                        "search_block": "    rate = conversions / total_visitors\n    return round(rate, 4)",
                        "replace_block": (
                            "    if total_visitors <= 0:\n"
                            "        return 0.0\n"
                            "    if conversions < 0:\n"
                            "        raise ValueError(\"conversions cannot be negative\")\n"
                            "    rate = conversions / total_visitors\n"
                            "    return round(rate, 4)"
                        ),
                        "explanation": "Add defensive check against total_visitors <= 0 and negative conversions."
                    }
                ],
                "unit_test": {
                    "test_file_path": "tests/test_analytics_hitl.py",
                    "test_code": (
                        "def test_calculate_conversion_rate_zero():\n"
                        "    from app.services.analytics import calculate_conversion_rate\n"
                        "    assert calculate_conversion_rate(0, 0) == 0.0\n"
                    )
                },
                "post_mortem_summary": (
                    "### Incident Post-Mortem: ZeroDivisionError in Conversion Rate\n\n"
                    "**Root Cause**: Unvalidated denominator during zero-traffic intervals.\n"
                    "**Remediation**: Added guard clause returning 0.0 when total_visitors <= 0."
                ),
                "suggested_preventions": [
                    "Add lint rule or type enforcement for boundary condition divisions."
                ]
            }
        }

        # Check if incident with ID exists
        stmt_existing_id = select(Incident).where(Incident.id == inc_id)
        res_existing_id = await db.execute(stmt_existing_id)
        old_inc = res_existing_id.scalar_one_or_none()
        if old_inc:
            old_inc.status = IncidentStatus.AWAITING_APPROVAL
            old_inc.raw_event = raw_event
            old_inc.updated_at = datetime.now(timezone.utc)
            await db.commit()
            print(f"Updated existing incident {inc_id} to AWAITING_APPROVAL.")
            return

        inc = Incident(
            id=inc_id,
            organization_id=org.id,
            sentry_issue_id="ISSUE-ANALYTICS-DIVZERO-701",
            sentry_event_id="evt_analytics_zero_div_701",
            fingerprint="divzero-analytics-calc-conv-rate",
            title="ZeroDivisionError: division by zero in calculate_conversion_rate",
            error_type="ZeroDivisionError",
            error_message="division by zero",
            file_path="app/services/analytics.py",
            function_name="calculate_conversion_rate",
            line_number=42,
            project_slug="autoheal-target-demo",
            environment="production",
            platform="python",
            level="error",
            status=IncidentStatus.AWAITING_APPROVAL,
            retry_count=0,
            stack_trace=(
                "Traceback (most recent call last):\n"
                "  File \"app/api/v1/analytics.py\", line 84, in get_conversion_metrics\n"
                "    rate = calculate_conversion_rate(conversions=0, total_visitors=0)\n"
                "  File \"app/services/analytics.py\", line 42, in calculate_conversion_rate\n"
                "    rate = conversions / total_visitors\n"
                "           ~~~~~~~~~~~~^~~~~~~~~~~~~~~~\n"
                "ZeroDivisionError: division by zero"
            ),
            raw_event=raw_event,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(inc)
        await db.flush()

        attempt = RemediationAttempt(
            id=uuid.uuid4(),
            organization_id=org.id,
            incident_id=inc.id,
            strategy="defensive_guard_patch",
            analysis=rca_text,
            diff=diff_text,
            status=RemediationStatus.IN_PROGRESS,
            llm_model="gpt-4o",
            llm_provider="openai",
            prompt_tokens=1250,
            completion_tokens=380,
            total_tokens=1630,
            cost_usd=0.0072,
            duration_seconds=0.28,
            created_at=datetime.now(timezone.utc)
        )
        db.add(attempt)
        await db.commit()
        print(f"Successfully seeded AWAITING_APPROVAL incident {inc.id}!")
    await close_db()

if __name__ == "__main__":
    asyncio.run(seed_awaiting_incident())
