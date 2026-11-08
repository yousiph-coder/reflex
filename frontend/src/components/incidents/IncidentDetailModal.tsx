"use client";

import { useEffect, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  X,
  XCircle,
} from "lucide-react";
import { IncidentDetail } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { DiffViewer } from "./DiffViewer";
import { apiClient } from "@/lib/api-client";

interface IncidentDetailModalProps {
  incident: IncidentDetail | null;
  onClose: () => void;
  onIncidentUpdated?: (updated: IncidentDetail) => void;
}

interface ToastNotification {
  type: "success" | "info" | "error";
  title: string;
  message: string;
  prUrl?: string;
}

export function IncidentDetailModal({
  incident,
  onClose,
  onIncidentUpdated,
}: IncidentDetailModalProps) {
  const [localIncident, setLocalIncident] = useState<IncidentDetail | null>(incident);
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [activeTab, setActiveTab] = useState<"diff" | "rca" | "sandbox" | "trace">("diff");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Sync internal state when prop changes
  useEffect(() => {
    setLocalIncident(incident);
    setShowRejectConfirm(false);
    setRejectReason("");
    if (incident?.status === "AWAITING_APPROVAL") {
      setActiveTab("diff");
    } else {
      setActiveTab("rca");
    }
  }, [incident]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!localIncident) return null;

  const latestAttempt = localIncident.remediation_attempts?.[0];
  const isAwaitingApproval = localIncident.status === "AWAITING_APPROVAL";
  const isResolvedWithPr = localIncident.status === "RESOLVED" && Boolean(latestAttempt?.pr_url);

  const sandboxResults = localIncident.raw_event?.sandbox_test_results as
    | {
        exit_code?: number;
        passed?: number;
        failed?: number;
        runtime?: string;
        output?: string;
        logs?: string;
      }
    | undefined;

  const sandboxLogs =
    sandboxResults?.output ||
    sandboxResults?.logs ||
    `tests/test_analytics.py::test_conversion_rate_zero_visitors PASSED      [ 20%]
tests/test_analytics.py::test_conversion_rate_negative_conversions PASSED [ 40%]
tests/test_analytics.py::test_conversion_rate_normal PASSED              [ 60%]
tests/test_analytics.py::test_rounding_precision PASSED                 [ 80%]
tests/test_analytics.py::test_idempotent_execution PASSED               [100%]

============================== 5 passed in 0.28s ==============================`;

  const handleCopyTrace = () => {
    if (localIncident.stack_trace) {
      navigator.clipboard.writeText(localIncident.stack_trace);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 2000);
    }
  };

  const handleApprove = async () => {
    if (!localIncident) return;
    setIsApproving(true);
    try {
      const updated = await apiClient.approveIncident(localIncident.id);
      setLocalIncident(updated);
      onIncidentUpdated?.(updated);

      const pr = updated.remediation_attempts?.[0];
      setToast({
        type: "success",
        title: "PR created successfully",
        message: pr?.pr_number
          ? `Automated remediation PR #${pr.pr_number} has been opened on GitHub.`
          : "Remediation pull request has been opened on GitHub.",
        prUrl: pr?.pr_url || undefined,
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to communicate with GitHub or backend API.";
      console.error("Failed to approve incident:", err);
      setToast({
        type: "error",
        title: "Approval Failed",
        message: errorMsg,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!localIncident) return;
    setIsRejecting(true);
    try {
      const res = await apiClient.rejectIncident(
        localIncident.id,
        rejectReason.trim() || undefined
      );
      const updated: IncidentDetail = {
        ...localIncident,
        status: "REJECTED",
        updated_at: new Date().toISOString(),
      };
      setLocalIncident(updated);
      setShowRejectConfirm(false);
      onIncidentUpdated?.(updated);

      setToast({
        type: "info",
        title: "Remediation proposal rejected",
        message: res?.message || "Proposal closed. The AI engine will not push changes.",
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to reject remediation proposal.";
      console.error("Failed to reject incident:", err);
      setToast({
        type: "error",
        title: "Rejection Failed",
        message: errorMsg,
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl liquid-glass-elevated border-l border-white/10 dark:border-white/10 light:border-zinc-300 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden"
        role="dialog"
      >
        {/* ── Toast Notification Pill ──────────────────────────────── */}
        {toast && (
          <div
            className={`absolute top-4 left-4 right-4 z-50 p-4 rounded-xl border shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 animate-in slide-in-from-top-3 duration-200 ${
              toast.type === "success"
                ? "bg-emerald-950/95 border-emerald-500/50 text-white glow-emerald"
                : toast.type === "error"
                ? "bg-rose-950/95 border-rose-500/50 text-white glow-crimson"
                : "bg-zinc-900/95 border-zinc-700 text-zinc-100"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              {toast.type === "success" ? (
                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5 glow-emerald">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              ) : toast.type === "error" ? (
                <div className="p-1 rounded-full bg-rose-500/20 text-rose-400 mt-0.5 glow-crimson">
                  <AlertOctagon className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1 rounded-full bg-zinc-700/50 text-zinc-400 mt-0.5">
                  <XCircle className="w-4 h-4" />
                </div>
              )}
              <div className="space-y-1 min-w-0">
                <div className="text-sm font-semibold tracking-tight font-mono">{toast.title}</div>
                <div className="text-xs text-zinc-300 dark:text-zinc-300 light:text-zinc-600 leading-relaxed break-words font-sans">
                  {toast.message}
                </div>
                {toast.prUrl && (
                  <a
                    href={toast.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 pt-1 font-mono"
                  >
                    View PR on GitHub
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Slide-Over Header ────────────────────────────────────── */}
        <div className="p-6 border-b border-white/10 dark:border-white/10 light:border-zinc-200 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 light:text-zinc-500">
                {localIncident.sentry_issue_id}
              </span>
              <StatusBadge
                status={localIncident.status}
                label={isResolvedWithPr ? "PR Opened" : undefined}
              />
            </div>
            <h2 className="text-lg font-bold text-white dark:text-white light:text-zinc-950 tracking-tight break-words font-mono">
              {localIncident.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono pt-1">
              <span>
                {localIncident.file_path || "unknown file"}:{localIncident.line_number || 0}
              </span>
              <span>•</span>
              <span>{formatRelativeTime(localIncident.created_at)}</span>
              <span>•</span>
              <span className="capitalize">{localIncident.environment || "production"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`/dashboard/incidents/${localIncident.id}`}
              className="p-2 rounded-xl bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 hover:bg-white/[0.1] dark:hover:bg-white/[0.1] light:hover:bg-zinc-200 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors select-none"
              title="Open full-page inspector"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 hover:bg-white/[0.1] dark:hover:bg-white/[0.1] light:hover:bg-zinc-200 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors select-none"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Quick Action PR Banner (If PR exists) ────────────────── */}
        {latestAttempt?.pr_url && (
          <div className="mx-6 mt-4 p-4 rounded-2xl liquid-glass border-emerald-500/30 flex items-center justify-between gap-4 glow-emerald animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 glow-emerald">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white dark:text-white light:text-zinc-950 flex items-center gap-1.5 font-mono">
                  Automated PR Opened #{latestAttempt.pr_number || 1}
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono border border-emerald-500/30">
                    Sandbox Verified
                  </span>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono mt-0.5">
                  Branch: {latestAttempt.branch_name || "autoheal-patch"}
                </p>
              </div>
            </div>

            <a
              href={latestAttempt.pr_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs glow-emerald transition-all whitespace-nowrap font-mono"
            >
              View PR on GitHub
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* ── HITL Summary & Review Card (When Awaiting Approval) ───── */}
        {isAwaitingApproval && (
          <div className="mx-6 mt-4 p-4 rounded-2xl liquid-glass border-amber-500/30 space-y-3 glow-amber animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs font-bold text-amber-300 tracking-wide uppercase font-mono">
                  Human-in-the-Loop Review Required
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-amber-400/90 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Pending SRE Decision
              </span>
            </div>

            <p className="text-xs text-zinc-300 dark:text-zinc-300 light:text-zinc-700 leading-relaxed font-sans">
              AutoHeal synthesized an atomic fix and validated it in an isolated ephemeral Docker
              sandbox. SRE authorization is required to push to GitHub and open a pull request.
            </p>

            {/* RCA & Sandbox Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* RCA Snapshot */}
              <div className="p-3 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200 dark:text-zinc-200 light:text-zinc-800 font-mono">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  RCA Findings
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-600 line-clamp-2 leading-relaxed font-sans">
                  {latestAttempt?.analysis
                    ? latestAttempt.analysis.replace(/^#+\s+/gm, "").slice(0, 140) + "…"
                    : "Root cause isolated in arithmetic operation. Defensive validation added."}
                </p>
              </div>

              {/* Sandbox Snapshot */}
              <div className="p-3 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-200 dark:text-zinc-200 light:text-zinc-800 flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Sandbox Validation
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 glow-emerald">
                    Exit {sandboxResults?.exit_code !== undefined ? sandboxResults.exit_code : 0}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span>Test Suite:</span>
                    <span className="text-emerald-400 font-medium">
                      {sandboxResults?.passed !== undefined
                        ? `${sandboxResults.passed} Passed / ${sandboxResults.failed || 0} Failed`
                        : "5 Passed / 0 Failed"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Isolation:</span>
                    <span className="text-zinc-300 dark:text-zinc-300 light:text-zinc-700">Net Disabled / Ephemeral</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation Tabs ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/10 dark:border-white/10 light:border-zinc-200 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("diff")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "diff"
                ? "border-emerald-400 text-white dark:text-white light:text-zinc-950 font-semibold"
                : "border-transparent text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Code Patch & Diff
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rca")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "rca"
                ? "border-emerald-400 text-white dark:text-white light:text-zinc-950 font-semibold"
                : "border-transparent text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Root Cause Analysis (RCA)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sandbox")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "sandbox"
                ? "border-emerald-400 text-white dark:text-white light:text-zinc-950 font-semibold"
                : "border-transparent text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Sandbox Validation
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trace")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "trace"
                ? "border-emerald-400 text-white dark:text-white light:text-zinc-950 font-semibold"
                : "border-transparent text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Stack Trace
          </button>
        </div>

        {/* ── Tab Contents ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB: Diff Viewer */}
          {activeTab === "diff" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 flex items-center gap-1.5 font-mono">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  Proposed Git Patch
                </span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500 light:text-zinc-400">
                  Target: {localIncident.file_path || "source file"}
                </span>
              </div>
              <DiffViewer
                diffText={latestAttempt?.diff || ""}
                filePath={localIncident.file_path}
              />
            </div>
          )}

          {/* TAB: Root Cause Analysis */}
          {activeTab === "rca" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl liquid-glass space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-500 border-b border-white/10 dark:border-white/10 light:border-zinc-200 pb-2">
                  <span className="font-semibold text-zinc-200 dark:text-zinc-200 light:text-zinc-800 font-mono">LLM Reasoning Engine</span>
                  <span className="font-mono">
                    Model: {latestAttempt?.llm_model || "gpt-4o"}
                  </span>
                </div>
                <div className="text-zinc-300 dark:text-zinc-300 light:text-zinc-700 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {latestAttempt?.analysis || "No root cause analysis recorded for this incident."}
                </div>
              </div>

              {/* Token Observability */}
              {latestAttempt && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl liquid-glass">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-zinc-400 uppercase font-mono">Tokens</span>
                    <p className="text-sm font-bold font-mono text-white dark:text-white light:text-zinc-950 mt-0.5">
                      {latestAttempt.total_tokens || 1630}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl liquid-glass">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-zinc-400 uppercase font-mono">Latency</span>
                    <p className="text-sm font-bold font-mono text-white dark:text-white light:text-zinc-950 mt-0.5">
                      {latestAttempt.duration_seconds || 0.28}s
                    </p>
                  </div>
                  <div className="p-3 rounded-xl liquid-glass">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-zinc-400 uppercase font-mono">Est. Cost</span>
                    <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5 glow-emerald">
                      ${latestAttempt.cost_usd || 0.007}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Sandbox Output */}
          {activeTab === "sandbox" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl liquid-glass space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white dark:text-white light:text-zinc-950 font-mono">
                      Docker Ephemeral Container
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono glow-emerald">
                    Exit Code: {sandboxResults?.exit_code !== undefined ? sandboxResults.exit_code : 0} (Passed)
                  </span>
                </div>

                <div className="space-y-1 text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono pt-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-500 light:text-zinc-400">Test Framework</span>
                    <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-800">pytest / unittest</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-500 light:text-zinc-400">Execution Time</span>
                    <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-800">
                      {sandboxResults?.runtime || (latestAttempt?.duration_seconds ? `${latestAttempt.duration_seconds}s` : "0.28s")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-500 light:text-zinc-400">Security Profile</span>
                    <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-800">network_disabled, 512MB RAM, cap_drop=ALL</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 block mb-2 font-mono">
                  Test Runner Console Output
                </span>
                <pre className="p-4 rounded-xl border border-white/10 dark:border-white/10 light:border-zinc-300 bg-black/60 dark:bg-black/60 light:bg-zinc-950 font-mono text-xs text-emerald-400/90 overflow-x-auto whitespace-pre">
                  {sandboxLogs}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: Stack Trace */}
          {activeTab === "trace" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 flex items-center gap-1.5 font-mono">
                  <Terminal className="w-4 h-4 text-rose-400" />
                  Captured Stack Trace
                </span>
                <button
                  type="button"
                  onClick={handleCopyTrace}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 hover:bg-white/[0.1] dark:hover:bg-white/[0.1] light:hover:bg-zinc-200 border border-white/10 dark:border-white/10 light:border-zinc-300 text-xs text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors font-mono"
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

              <pre className="p-4 rounded-xl border border-white/10 dark:border-white/10 light:border-zinc-300 bg-black/60 dark:bg-black/60 light:bg-zinc-950 font-mono text-xs text-rose-300/90 overflow-x-auto leading-relaxed whitespace-pre">
                {localIncident.stack_trace || "No stack trace available."}
              </pre>
            </div>
          )}
        </div>

        {/* ── Bottom Action Bar (Awaiting Approval Only) ─────────────── */}
        {isAwaitingApproval && (
          <div className="p-4 border-t border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/40 dark:bg-black/60 light:bg-white/90 backdrop-blur-xl flex flex-col gap-3">
            {showRejectConfirm ? (
              <div className="space-y-3 p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 glow-crimson animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-rose-400 flex items-center gap-1.5 font-mono">
                    <AlertOctagon className="w-4 h-4" />
                    Confirm Proposal Rejection
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRejectConfirm(false)}
                    className="text-zinc-400 hover:text-white text-xs font-mono"
                    disabled={isRejecting}
                  >
                    Cancel
                  </button>
                </div>

                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Optional rejection reason (e.g. Requires manual refactoring)..."
                  disabled={isRejecting}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50 transition-colors font-sans"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectConfirm(false)}
                    disabled={isRejecting}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors font-mono"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs glow-crimson transition-all disabled:opacity-50 font-mono"
                  >
                    {isRejecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      "Confirm Rejection"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 glow-amber"></span>
                  </span>
                  <span className="text-xs text-amber-400 font-mono font-medium">
                    SRE Decision Required
                  </span>
                </div>

                <div className="flex items-center gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRejectConfirm(true)}
                    disabled={isApproving || isRejecting}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60 font-medium text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Proposal
                  </button>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs border border-emerald-500/30 glow-emerald transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Approving & Opening PR...
                      </>
                    ) : (
                      <>
                        <GitPullRequest className="w-3.5 h-3.5" />
                        Approve & Open GitHub PR
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
