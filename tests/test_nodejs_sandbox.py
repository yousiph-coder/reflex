"""
Integration tests for Node.js / JavaScript sandbox execution and agent orchestrator prompts.
"""

import unittest
from app.schemas.remediation import (
    FileContext,
    FilePatch,
    IncidentContext,
    PatchAction,
    UnitTestSpec,
)
from app.services.agent_orchestrator import AgentOrchestrator
from app.services.sandbox_runner import SandboxRunner


class TestNodeJsSandboxExecution(unittest.IsolatedAsyncioTestCase):
    """Test ephemeral sandbox patch validation for Node.js / JavaScript."""

    async def test_validate_nodejs_patch_success(self):
        runner = SandboxRunner(timeout=30)

        # Original JavaScript code with unhandled null dereference bug
        original_auth_js = """\
export function getCurrentUser(session) {
  const userId = session.user.id;
  return userId;
}
"""

        # Patch: defensively check session and session.user
        patch = FilePatch(
            file_path="src/auth.mjs",
            search_block="  const userId = session.user.id;\n  return userId;",
            replace_block=(
                "  if (!session || typeof session !== 'object' || !session.user) {\n"
                "    throw new TypeError(\"Malformed session context: 'user' is missing or empty\");\n"
                "  }\n"
                "  return session.user.id;"
            ),
            action=PatchAction.MODIFY,
            explanation="Defensively check session object before accessing user.id",
        )

        # Unit test using Node.js built-in test runner (node:test)
        unit_test = UnitTestSpec(
            test_file_path="tests/auth.test.mjs",
            test_code="""\
import test from 'node:test';
import assert from 'node:assert';
import { getCurrentUser } from '../src/auth.mjs';

test('getCurrentUser returns user.id for valid session', () => {
  const session = { user: { id: 'usr_abc123' } };
  assert.strictEqual(getCurrentUser(session), 'usr_abc123');
});

test('getCurrentUser throws TypeError for null session', () => {
  assert.throws(() => getCurrentUser(null), TypeError);
});

test('getCurrentUser throws TypeError for empty session', () => {
  assert.throws(() => getCurrentUser({}), TypeError);
});
""",
            test_command="node --test tests/auth.test.mjs",
            test_framework="node",
        )

        result = await runner.validate_patch(
            file_patches=[patch],
            unit_test=unit_test,
            original_files={"src/auth.mjs": original_auth_js},
        )

        self.assertTrue(result.success, f"Sandbox failed with stderr: {result.stderr}, stdout: {result.stdout}")
        self.assertEqual(result.exit_code, 0)
        self.assertFalse(result.timed_out)

    async def test_validate_nodejs_patch_fails_on_broken_test(self):
        runner = SandboxRunner(timeout=30)

        original_code = "export function add(a, b) { return a + b; }\n"
        patch = FilePatch(
            file_path="src/calc.mjs",
            search_block="return a + b;",
            replace_block="return a - b;",  # Intentionally wrong patch
            action=PatchAction.MODIFY,
        )

        unit_test = UnitTestSpec(
            test_file_path="tests/calc.test.mjs",
            test_code="""\
import test from 'node:test';
import assert from 'node:assert';
import { add } from '../src/calc.mjs';

test('add 2 + 2 = 4', () => {
  assert.strictEqual(add(2, 2), 4);
});
""",
            test_command="node --test tests/calc.test.mjs",
            test_framework="node",
        )

        result = await runner.validate_patch(
            file_patches=[patch],
            unit_test=unit_test,
            original_files={"src/calc.mjs": original_code},
        )

        self.assertFalse(result.success)
        self.assertNotEqual(result.exit_code, 0)


class TestNodeJsAgentOrchestratorPrompts(unittest.TestCase):
    """Test language detection and prompt customization for JavaScript/TypeScript."""

    def setUp(self):
        self.orchestrator = AgentOrchestrator()

    def test_language_detection_from_context_language(self):
        ctx_ts = IncidentContext(
            incident_id="inc-1",
            sentry_issue_id="ISSUE-TS-1",
            title="TypeError in service.ts",
            error_type="TypeError",
            language="typescript",
        )
        self.assertEqual(self.orchestrator._detect_language(ctx_ts), "typescript")

        ctx_js = IncidentContext(
            incident_id="inc-2",
            sentry_issue_id="ISSUE-JS-1",
            title="ReferenceError in app.js",
            error_type="ReferenceError",
            language="javascript",
        )
        self.assertEqual(self.orchestrator._detect_language(ctx_js), "javascript")

    def test_language_detection_from_file_path_and_platform(self):
        ctx_node = IncidentContext(
            incident_id="inc-3",
            sentry_issue_id="ISSUE-NODE-1",
            title="TypeError: undefined is not a function",
            error_type="TypeError",
            platform="node",
            file_path="src/controllers/userController.js",
        )
        self.assertEqual(self.orchestrator._detect_language(ctx_node), "javascript")

    def test_system_prompt_for_javascript(self):
        ctx = IncidentContext(
            incident_id="inc-4",
            sentry_issue_id="ISSUE-JS-2",
            title="TypeError in auth.js",
            error_type="TypeError",
            language="javascript",
        )
        system_prompt = self.orchestrator._build_system_prompt(ctx)
        self.assertIn("Target repository programming language: **javascript**", system_prompt)
        self.assertIn("jest", system_prompt)
        self.assertIn("node --test", system_prompt)

    def test_user_prompt_for_typescript(self):
        ctx = IncidentContext(
            incident_id="inc-5",
            sentry_issue_id="ISSUE-TS-2",
            title="Unhandled rejection in api.ts",
            error_type="UnhandledPromiseRejection",
            language="typescript",
            repo_owner="acme-corp",
            repo_name="ts-backend",
        )
        user_prompt = self.orchestrator._build_user_prompt(ctx)
        self.assertIn("- **Programming Language**: `typescript`", user_prompt)
        self.assertIn("Test Framework Instructions (Node.js)", user_prompt)
        self.assertIn("node --test", user_prompt)

    def test_rule_based_remediation_for_node(self):
        messages = [
            {"role": "system", "content": "Target repository programming language: **javascript**"},
            {"role": "user", "content": "## Incident: TypeError: Cannot read properties of undefined in auth.js"},
        ]
        output, usage = self.orchestrator._synthesize_rule_based_remediation(messages)
        self.assertEqual(output.unit_test.test_framework, "node")
        self.assertIn("node --test", output.unit_test.test_command)
        self.assertTrue(output.file_patches[0].file_path.endswith((".js", ".mjs")))


if __name__ == "__main__":
    unittest.main()
