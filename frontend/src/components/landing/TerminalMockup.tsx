"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Lock,
  Play,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepData {
  id: string;
  badge: string;
  badgeColor: string;
  activeColorClass: string;
  glowClass: string;
  title: string;
  subtitle: string;
  code: string;
  meta: { label: string; value: string }[];
  actionLink?: { text: string; url: string };
}

const STEPS: StepData[] = [
  {
    id: "ingest",
    badge: "01. Crash Ingestion",
    badgeColor: "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20",
    activeColorClass: "border-b-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/5",
    glowClass: "shadow-glow-crimson",
    title: "Sentry Alert Ingested & PII Redacted",
    subtitle: "Inbound HMAC-SHA256 validated webhook. Sensitive JWTs and tokens scrubbed.",
    code: `[16:42:11] SENTRY WEBHOOK RECEIVED (X-Hub-Signature-256: 3a9f... valid)
[16:42:11] Event: KeyError: 'user_id' in app/services/auth.py:42
[16:42:11] Raw Context: {"session_token": "[REDACTED_SECRET]", "user_id": missing}
[16:42:12] Dedup Lock: Acquired (Fingerprint: 8f4b... TTL: 60s)
[16:42:12] Status: Persisted as PENDING (Tenant: Acme Corp)`,
    meta: [
      { label: "Trigger", value: "KeyError: 'user_id'" },
      { label: "Location", value: "app/services/auth.py:42" },
      { label: "PII Scrubber", value: "100% Sanitized" },
    ],
  },
  {
    id: "reason",
    badge: "02. AI Root Cause",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    activeColorClass: "border-b-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/5",
    glowClass: "shadow-[0_0_15px_rgba(168,85,247,0.35)]",
    title: "AST Context Retrieval & Patch Synthesis",
    subtitle: "Fetched GitHub blame & AST file window. Synthesized safe dictionary lookup.",
    code: `--- a/app/services/auth.py
+++ b/app/services/auth.py
@@ -40,4 +40,7 @@ def get_current_user(session_data: Dict[str, Any]) -> str:
-    # CRASH: Direct key access raises KeyError when session lacks user_id
-    user_id = session_data["user_id"]
+    # FIX: Defensive get() with explicit exception or anonymous fallback
+    user_id = session_data.get("user_id")
+    if not user_id:
+        raise ValueError("Invalid session: 'user_id' is required")
     return user_id`,
    meta: [
      { label: "LLM Model", value: "gpt-4o" },
      { label: "Latency", value: "0.28s" },
      { label: "Confidence", value: "98.4%" },
    ],
  },
  {
    id: "sandbox",
    badge: "03. Sandbox Runner",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    activeColorClass: "border-b-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5",
    glowClass: "shadow-glow-amber",
    title: "Docker Ephemeral Container Verification",
    subtitle: "Executed patch in isolated sandbox with dropped privileges and network disabled.",
    code: `[SANDBOX] Spawning container: autoheal-sandbox-8f4b7a
[SANDBOX] Profile: memory=512MB, network=disabled, cap_drop=ALL
[SANDBOX] Applying unified diff patch to app/services/auth.py... OK
[SANDBOX] Running pytest tests/test_auth.py
============================= test session starts ==============================
rootdir: /workspace, collected 5 items
tests/test_auth.py .....                                                 [100%]
============================== 5 passed in 0.31s ===============================
[SANDBOX] Exit Code: 0 (Regression Free Verification)`,
    meta: [
      { label: "Environment", value: "Docker Ephemeral" },
      { label: "Test Status", value: "5/5 Passed (100%)" },
      { label: "Sandbox Time", value: "0.31s" },
    ],
  },
  {
    id: "pr",
    badge: "04. Automated PR",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    activeColorClass: "border-b-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    glowClass: "shadow-glow-emerald",
    title: "Atomic Branch Committed & PR Opened",
    subtitle: "PR opened on target repository. Multi-channel notifications delivered.",
    code: `[GITHUB] Git Data API: Blob created (SHA: 4d28e7...)
[GITHUB] Git Data API: Tree & commit created on branch autoheal/fix-auth-keyerror
[GITHUB] Pull Request #1 Opened: "fix(auth): prevent KeyError on missing user_id"
[NOTIFIER] Slack Block Kit dispatched to #alerts-production
[NOTIFIER] Discord Embed dispatched to #incident-room
[STATE] Incident status updated: RESOLVED (MTTR: 18.2 seconds)`,
    meta: [
      { label: "PR Link", value: "#1 yousiph-coder/autoheal-target-demo" },
      { label: "MTTR", value: "18.2s (-98.5%)" },
      { label: "Status", value: "Ready for Merge" },
    ],
    actionLink: {
      text: "View Pull Request on GitHub",
      url: "https://github.com/yousiph-coder/autoheal-target-demo/pull/1",
    },
  },
];

export function TerminalMockup() {
  const [activeTab, setActiveTab] = useState("pr");

  const currentStep = STEPS.find((s) => s.id === activeTab) || STEPS[3];

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl border border-zinc-200 dark:border-white/10 liquid-glass-elevated shadow-2xl overflow-hidden transition-all text-left">
      {/* ── Terminal Chrome Header ───────────────────────────────── */}
      <div className="px-4 py-3 bg-zinc-100/70 dark:bg-black/60 border-b border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/90 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <div className="w-3 h-3 rounded-full bg-amber-500/90 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 ml-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            autoheal-core ~ incident-pipeline
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-glow-emerald"></span>
          </span>
          Autonomous Loop Active
        </div>
      </div>

      {/* ── Step Selection Tabs ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/60 dark:bg-black/40">
        {STEPS.map((step) => {
          const isActive = activeTab === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className={cn(
                "px-4 py-3.5 text-left transition-all border-b-2 sm:border-b-0 sm:border-r border-zinc-200 dark:border-white/10 last:border-r-0 font-mono",
                isActive
                  ? cn(step.activeColorClass, "shadow-inner")
                  : "hover:bg-zinc-100/50 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border font-semibold",
                    step.badgeColor,
                    isActive && step.glowClass
                  )}
                >
                  {step.badge.split(" ")[0]}
                </span>
              </div>
              <p
                className={cn(
                  "text-xs font-semibold truncate",
                  isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                {step.badge.split(" ").slice(1).join(" ")}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Content Viewport ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="p-5 sm:p-6 space-y-4"
        >
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-white/10">
            <div>
              <h4 className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-white flex items-center gap-2">
                {currentStep.title}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{currentStep.subtitle}</p>
            </div>

            {currentStep.actionLink && (
              <a
                href={currentStep.actionLink.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium text-xs font-mono shadow-glow-emerald transition-all whitespace-nowrap self-start sm:self-auto"
              >
                <span>{currentStep.actionLink.text}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Code/Terminal Output Block - OLED Pure Black */}
          <div className="rounded-xl border border-zinc-800 bg-[#000000] p-4 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed shadow-inner">
            <pre className="whitespace-pre">
              {currentStep.code}
            </pre>
          </div>

          {/* Metadata Footer Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {currentStep.meta.map((m, idx) => (
              <div
                key={idx}
                className="px-3.5 py-2 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10 flex items-center justify-between text-xs"
              >
                <span className="text-zinc-500 dark:text-zinc-400">{m.label}:</span>
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{m.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
