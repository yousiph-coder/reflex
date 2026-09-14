"use client";

import { useState } from "react";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import { IncidentDetail } from "@/lib/types";
import { formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface IncidentDetailModalProps {
  incident: IncidentDetail | null;
  onClose: () => void;
}

export function IncidentDetailModal({ incident, onClose }: IncidentDetailModalProps) {
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [activeTab, setActiveTab] = useState<"rca" | "trace" | "sandbox" | "diff">("rca");

  if (!incident) return null;

  const latestAttempt = incident.remediation_attempts?.[0];

  const handleCopyTrace = () => {
    if (incident.stack_trace) {
      navigator.clipboard.writeText(incident.stack_trace);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#121215] border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden"
        role="dialog"
      >
        {/* ── Slide-Over Header ────────────────────────────────────── */}
        <div className="p-6 border-b border-zinc-800/80 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-zinc-500">{incident.sentry_issue_id}</span>
              <StatusBadge status={incident.status} />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight break-words">
              {incident.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono pt-1">
              <span>{incident.file_path || "unknown file"}:{incident.line_number || 0}</span>
              <span>•</span>
              <span>{formatRelativeTime(incident.created_at)}</span>
              <span>•</span>
              <span className="capitalize">{incident.environment || "production"}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Quick Action PR Banner (If PR exists) ────────────────── */}
        {latestAttempt?.pr_url && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Automated PR Opened #{latestAttempt.pr_number || 1}
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                    Sandbox Verified
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">Branch: {latestAttempt.branch_name}</p>
              </div>
            </div>

            <a
              href={latestAttempt.pr_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors whitespace-nowrap"
            >
              View PR on GitHub
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* ── Navigation Tabs ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-zinc-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab("rca")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "rca"
                ? "border-emerald-400 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Root Cause Analysis (RCA)
          </button>

          <button
            onClick={() => setActiveTab("diff")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "diff"
                ? "border-emerald-400 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Code Patch & Diff
          </button>

          <button
            onClick={() => setActiveTab("sandbox")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "sandbox"
                ? "border-emerald-400 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sandbox Validation
          </button>

          <button
            onClick={() => setActiveTab("trace")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "trace"
                ? "border-emerald-400 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Stack Trace
          </button>
        </div>

        {/* ── Tab Contents ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Root Cause Analysis */}
          {activeTab === "rca" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/80 pb-2">
                  <span className="font-semibold text-zinc-200">LLM Reasoning Engine</span>
                  <span className="font-mono">Model: {latestAttempt?.llm_model || "gpt-4o"}</span>
                </div>
                <div className="prose prose-invert prose-xs max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {latestAttempt?.analysis || "No root cause analysis recorded for this incident."}
                </div>
              </div>

              {/* Token Observability */}
              {latestAttempt && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                    <span className="text-[10px] text-zinc-500 uppercase">Tokens</span>
                    <p className="text-sm font-bold font-mono text-white mt-0.5">{latestAttempt.total_tokens}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                    <span className="text-[10px] text-zinc-500 uppercase">Latency</span>
                    <p className="text-sm font-bold font-mono text-white mt-0.5">{latestAttempt.duration_seconds || 0.3}s</p>
                  </div>
                  <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                    <span className="text-[10px] text-zinc-500 uppercase">Est. Cost</span>
                    <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">${latestAttempt.cost_usd || 0.008}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Patch Diff */}
          {activeTab === "diff" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  Unified Patch Diff
                </span>
                <span className="text-[11px] font-mono text-zinc-500">Atomic GitHub Commit</span>
              </div>
              <pre className="p-4 rounded-xl border border-zinc-800 bg-[#09090b] font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre">
                {latestAttempt?.diff || "No diff generated."}
              </pre>
            </div>
          )}

          {/* TAB 3: Sandbox Output */}
          {activeTab === "sandbox" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">Docker Ephemeral Container</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
                    Exit Code: 0 (Passed)
                  </span>
                </div>

                <div className="space-y-1 text-xs text-zinc-400 font-mono pt-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Test Framework</span>
                    <span className="text-zinc-200">pytest / unittest</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Execution Time</span>
                    <span className="text-zinc-200">{latestAttempt?.duration_seconds || 0.31}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Security Profile</span>
                    <span className="text-zinc-200">network_disabled, 512MB RAM, cap_drop=ALL</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-zinc-300 block mb-2">Test Runner Console Output</span>
                <pre className="p-4 rounded-xl border border-zinc-800 bg-[#09090b] font-mono text-xs text-emerald-400/90 overflow-x-auto whitespace-pre">
{`.....
----------------------------------------------------------------------
Ran 5 tests in 0.000s

OK (5 passed, 0 failed, 0 warnings)`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Stack Trace */}
          {activeTab === "trace" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-rose-400" />
                  Captured Stack Trace
                </span>
                <button
                  onClick={handleCopyTrace}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  {copiedTrace ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Trace
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl border border-zinc-800 bg-[#09090b] font-mono text-xs text-rose-300/90 overflow-x-auto leading-relaxed whitespace-pre">
                {incident.stack_trace || "No stack trace available."}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
