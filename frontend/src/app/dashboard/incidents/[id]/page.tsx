"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  GitPullRequest,
  ShieldCheck,
  Clock,
  ExternalLink,
  RotateCcw,
  HeartPulse,
  Sparkles,
  Terminal,
  Code2,
  GitMerge,
  Cpu,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { IncidentDetail } from "@/lib/types";

export default function ReflexIncidentDetailPage() {
  const params = useParams();
  const incidentId = String(params?.id || "");

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"diff" | "trace" | "analysis">("diff");
  const [isRunningSandbox, setIsRunningSandbox] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3400);
  }, []);

  const loadIncident = useCallback(async () => {
    if (!incidentId) return;
    try {
      setIsLoading(true);
      const data = await apiClient.getIncident(incidentId);
      setIncident(data);
    } catch {
      setIncident(null);
      triggerToast("Could not load incident details from backend.");
    } finally {
      setIsLoading(false);
    }
  }, [incidentId, triggerToast]);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  const handleRerunSandbox = async () => {
    if (!incident || isRunningSandbox) return;
    try {
      setIsRunningSandbox(true);
      triggerToast("Spinning up isolated Docker container & running tests...");
      await apiClient.rerunSandbox(incident.id);
      triggerToast("Docker Sandbox verification completed!");
      await loadIncident();
    } catch {
      triggerToast("Sandbox rerun failed. Check FastAPI backend.");
    } finally {
      setIsRunningSandbox(false);
    }
  };

  const handleMergePr = async () => {
    if (!incident || isMerging) return;
    try {
      setIsMerging(true);
      triggerToast("Merging verified Pull Request on GitHub...");
      await apiClient.mergeIncident(incident.id);
      triggerToast("Pull Request merged successfully!");
      await loadIncident();
    } catch {
      triggerToast("Could not merge PR automatically. Check GitHub permissions.");
    } finally {
      setIsMerging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span>Loading live incident X-Ray #{incidentId.slice(0, 8)}...</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="font-mono text-sm text-slate-500">Incident not found.</p>
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-indigo-500"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incident Explorer</span>
        </Link>
      </div>
    );
  }

  const latestAttempt = incident.remediation_attempts?.[0];
  const isResolved = incident.status === "RESOLVED";
  const isMerged = latestAttempt?.status === "PR_MERGED" || isResolved;
  const durationDisplay = latestAttempt?.duration_seconds
    ? `${latestAttempt.duration_seconds.toFixed(1)}s`
    : "—";

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-16">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[960px] h-[420px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 space-y-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incident Explorer</span>
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-semibold">
                INCIDENT #{incident.id.slice(0, 8)}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {incident.status}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {incident.project_slug} · {incident.file_path}
                {incident.line_number ? `:${incident.line_number}` : ""}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {incident.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRerunSandbox}
              disabled={isRunningSandbox}
              className="px-3.5 py-2 rounded-xl font-mono text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 text-indigo-500 ${
                  isRunningSandbox ? "animate-spin" : ""
                }`}
              />
              <span>
                {isRunningSandbox ? "Running Sandbox..." : "Re-run Sandbox"}
              </span>
            </button>

            {latestAttempt?.pr_url && (
              <a
                href={latestAttempt.pr_url}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl font-mono text-xs font-medium border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 flex items-center gap-1.5 transition-all"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>
                  View PR {latestAttempt.pr_number ? `#${latestAttempt.pr_number}` : ""}
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              type="button"
              onClick={handleMergePr}
              disabled={isMerging || isMerged}
              className="px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.35)] flex items-center gap-1.5 transition-all disabled:opacity-60"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>
                {isMerging
                  ? "Merging..."
                  : isMerged
                  ? "PR Merged"
                  : "One-Click Merge PR"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <section className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Vitality Status</span>
            <HeartPulse className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {isResolved ? "100% Restored" : "In Progress"}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Environment: {incident.environment || "production"}
          </p>
        </div>

        <div className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sandbox Runtime</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-sky-600 dark:text-sky-400">
            {durationDisplay}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Model: {latestAttempt?.llm_model || "gpt-4o"}
          </p>
        </div>

        <div className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Error Type</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 font-mono text-xl font-extrabold text-indigo-600 dark:text-indigo-400 truncate">
            {incident.error_type || "Exception"}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            Function: {incident.function_name || "unknown"}
          </p>
        </div>

        <div className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Remediation Attempts</span>
            <Cpu className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-violet-600 dark:text-violet-400">
            {incident.remediation_attempts?.length ?? 0}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Retries: {incident.retry_count ?? 0}
          </p>
        </div>
      </section>

      <section className="relative z-10 rounded-3xl border overflow-hidden bg-white/95 dark:bg-[#0b0d17]/95 border-slate-200/90 dark:border-white/10 shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {[
              { id: "diff", label: "Verified Code Diff", icon: Code2 },
              { id: "trace", label: "Raw Sentry Stack Trace", icon: AlertTriangle },
              { id: "analysis", label: "AI Root-Cause Analysis", icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id as "diff" | "trace" | "analysis")
                  }
                  className={`px-3.5 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all ${
                    active
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {latestAttempt?.branch_name && (
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              Branch:{" "}
              <strong className="text-indigo-500">{latestAttempt.branch_name}</strong>
            </span>
          )}
        </div>

        {activeTab === "diff" && (
          <div className="p-6 font-mono text-xs">
            <div className="rounded-2xl border border-emerald-500/35 bg-[#07080d] p-5 text-emerald-200">
              <pre className="leading-relaxed overflow-x-auto">
                <code>
                  {latestAttempt?.diff ||
                    "// No patch diff generated yet for this incident."}
                </code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === "trace" && (
          <div className="p-6 font-mono text-xs">
            <div className="rounded-2xl bg-[#07080d] border border-rose-500/30 p-5 text-rose-300">
              <pre className="overflow-x-auto leading-relaxed">
                <code>
                  {incident.stack_trace || incident.error_message || "No stack trace recorded."}
                </code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="p-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
            {latestAttempt?.analysis || "No AI root-cause analysis recorded yet."}
          </div>
        )}
      </section>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
