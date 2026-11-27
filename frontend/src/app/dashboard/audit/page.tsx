"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  apiClient,
  type Repository,
  type PreLaunchAuditResult,
  type AuditFinding,
} from "@/lib/api-client";
import {
  Radar,
  ShieldCheck,
  ShieldAlert,
  OctagonX,
  RefreshCw,
  Wand2,
  ExternalLink,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  GitBranch,
  Clock,
} from "lucide-react";

type FilterCategory = "all" | "crash" | "contract" | "security";

export default function PreLaunchAuditPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [loadingRepos, setLoadingRepos] = useState<boolean>(true);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<PreLaunchAuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [fixingMap, setFixingMap] = useState<Record<string, "loading" | string>>({});

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const list = await apiClient.getRepositories();
      setRepos(list);
      if (list.length > 0 && !selectedRepoId) {
        setSelectedRepoId(list[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load connected repositories.");
    } finally {
      setLoadingRepos(false);
    }
  }, [selectedRepoId]);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  const handleRunAudit = async () => {
    if (!selectedRepoId) return;
    setIsAuditing(true);
    setErrorMsg(null);
    setFilter("all");
    setFixingMap({});
    try {
      const result = await apiClient.runPreLaunchAudit(selectedRepoId);
      setAuditResult(result);
    } catch (err: any) {
      setErrorMsg(err?.message || "Pre-Launch Audit failed. Check backend logs.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAutoFix = async (finding: AuditFinding) => {
    if (!selectedRepoId) return;
    setFixingMap((prev) => ({ ...prev, [finding.id]: "loading" }));
    try {
      const res = await apiClient.triggerAuditAutoFix(selectedRepoId, {
        file_path: finding.file_path,
        line_number: finding.line_number,
        title: finding.title,
        explanation: finding.explanation,
        expected_behavior: finding.expected_behavior,
      });
      setFixingMap((prev) => ({
        ...prev,
        [finding.id]: res.incident_id || "queued",
      }));
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to queue Auto-Fix.");
      setFixingMap((prev) => {
        const next = { ...prev };
        delete next[finding.id];
        return next;
      });
    }
  };

  const findings = auditResult?.findings || [];
  const filteredFindings = findings.filter((f) =>
    filter === "all" ? true : (f.category || "").toLowerCase() === filter
  );

  const crashCount = findings.filter((f) => (f.category || "").toLowerCase() === "crash").length;
  const contractCount = findings.filter((f) => (f.category || "").toLowerCase() === "contract").length;
  const securityCount = findings.filter((f) => (f.category || "").toLowerCase() === "security").length;

  const score = auditResult?.score ?? 0;
  const circumference = 163.36;
  const dashOffset = (circumference - (circumference * score) / 100).toFixed(1);
  const isReady = Boolean(auditResult?.ship_gate);

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-7 pb-16">
      {/* Subtle Ambient Indigo Glow matching Repositories & Incident Explorer */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-28 left-1/3 w-[440px] h-[440px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[360px] h-[360px] rounded-full bg-violet-500/8 blur-[120px]" />
      </div>

      {/* Header Section */}
      <header className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-medium">
            <Radar className="w-3.5 h-3.5" />
            <span>Pre-Launch Ship Gate · Proactive Code Auditor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Pre-Launch Audit
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Scan your repository before deploying to detect unhandled crash paths, API input/output contract mismatches, and security risks — then auto-fix blockers with 1 click.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              disabled={loadingRepos || isAuditing || repos.length === 0}
              className="pl-3.5 pr-9 py-2.5 rounded-xl font-mono text-xs font-medium bg-white dark:bg-[#0b0d17] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              {loadingRepos ? (
                <option value="">Loading repositories...</option>
              ) : repos.length === 0 ? (
                <option value="">No connected repos</option>
              ) : (
                repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} ({r.default_branch})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRunAudit}
            disabled={!selectedRepoId || isAuditing}
            className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_18px_rgba(99,102,241,0.3)] flex items-center gap-2 transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
            <span>{isAuditing ? "Auditing Repository..." : "Run Pre-Launch Audit"}</span>
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {errorMsg && (
        <div className="relative z-10 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/90 dark:bg-rose-500/10 px-4 py-3 flex items-center justify-between gap-3 text-xs font-mono text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-white text-rose-700 dark:text-rose-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scanning In Progress Card */}
      {isAuditing && (
        <section className="relative z-10 rounded-3xl border border-indigo-200/90 dark:border-indigo-500/30 bg-white/95 dark:bg-[#0b0d17]/95 p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Radar className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Scanning source files &amp; checking production contracts...
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Reading live files via GitHub App Installation · Evaluating crash safety, I/O contracts &amp; security
            </p>
          </div>
        </section>
      )}

      {/* Initial Ready State (Before First Scan) */}
      {!isAuditing && !auditResult && (
        <section className="relative z-10 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0b0d17]/95 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="max-w-xl space-y-2">
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Verify your codebase before users ever hit a 500 error
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Select a connected GitHub repository above and click <strong className="text-indigo-600 dark:text-indigo-400">Run Pre-Launch Audit</strong>. Reflex inspects your live code and issues a clear <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10">TRUE / FALSE</code> Ship Gate verdict.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4" />
                <span>1. Crash Risks</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Catches missing null guards, unsafe property access, and unhandled exceptions before launch.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                <FileCode2 className="w-4 h-4" />
                <span>2. I/O Contracts</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Checks that API inputs, data schemas, and frontend expectations match cleanly.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <Lock className="w-4 h-4" />
                <span>3. Security &amp; Ship Gate</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Flags leaked secrets or unsafe defaults and hands you 1-click Auto-Fix PRs for every blocker.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Live Audit Report */}
      {!isAuditing && auditResult && (
        <div className="relative z-10 space-y-6">
          {/* Ship Gate Verdict Card */}
          <section
            className={`rounded-3xl border p-6 sm:p-7 bg-white/95 dark:bg-[#0b0d17]/95 shadow-sm transition-all ${
              isReady
                ? "border-emerald-300/90 dark:border-emerald-500/35"
                : "border-rose-300/90 dark:border-rose-500/35"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border ${
                      isReady
                        ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                        : "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                    }`}
                  >
                    {isReady ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <OctagonX className="w-3.5 h-3.5" />
                    )}
                    <span>
                      SHIP GATE: {isReady ? "TRUE (READY TO SHIP)" : `FALSE (${auditResult.verdict})`}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <GitBranch className="w-3.5 h-3.5" />
                    {auditResult.repository} · {auditResult.branch}
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {auditResult.duration_seconds}s · {auditResult.model}
                  </span>
                </div>

                <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  {isReady
                    ? "Safe to Deploy — No Critical Blockers Detected"
                    : `Do Not Deploy Yet — ${findings.length} Issue${findings.length === 1 ? "" : "s"} Found`}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {auditResult.summary}
                </p>

                {/* Scanned Files Pills */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mr-1">
                    Scanned ({auditResult.scanned_files.length}):
                  </span>
                  {auditResult.scanned_files.map((fp) => (
                    <span
                      key={fp}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 font-mono text-[11px] text-slate-700 dark:text-slate-300"
                    >
                      {fp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Readiness Score Ring */}
              <div className="shrink-0 flex md:flex-col items-center justify-center gap-3 md:gap-1.5 px-5 py-4 rounded-2xl bg-slate-50/90 dark:bg-[#07080d] border border-slate-200/90 dark:border-white/10">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-slate-200 dark:text-white/10"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke={isReady ? "#10b981" : score >= 65 ? "#f59e0b" : "#f43f5e"}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <span
                    className={`absolute font-mono text-base font-extrabold ${
                      isReady
                        ? "text-emerald-600 dark:text-emerald-400"
                        : score >= 65
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {score}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Readiness / 100
                </span>
              </div>
            </div>

            {/* 3 Pillar Summary Strip */}
            <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Crash Risks</span>
                <span className={`font-mono text-sm font-bold ${crashCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {crashCount === 0 ? "Clear" : `${crashCount} Found`}
                </span>
              </div>
              <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">I/O Contracts</span>
                <span className={`font-mono text-sm font-bold ${contractCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {contractCount === 0 ? "Aligned" : `${contractCount} Mismatch`}
                </span>
              </div>
              <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Security &amp; Config</span>
                <span className={`font-mono text-sm font-bold ${securityCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {securityCount === 0 ? "Passed" : `${securityCount} Alert`}
                </span>
              </div>
            </div>
          </section>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "all", label: `All (${findings.length})` },
                { id: "crash", label: `Crash Risks (${crashCount})` },
                { id: "contract", label: `I/O Contracts (${contractCount})` },
                { id: "security", label: `Security (${securityCount})` },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                    active
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm"
                      : "bg-white dark:bg-[#0b0d17] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Findings Cards */}
          {filteredFindings.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200/90 dark:border-emerald-500/25 bg-white/95 dark:bg-[#0b0d17]/95 p-8 text-center space-y-2 shadow-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No issues in this category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All checks passed cleanly for the selected filter.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFindings.map((item) => {
                const sev = (item.severity || "MEDIUM").toUpperCase();
                const sevStyle =
                  sev === "CRITICAL"
                    ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                    : sev === "HIGH"
                    ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                    : "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30";

                const fixState = fixingMap[item.id];
                const isFixing = fixState === "loading";
                const queuedIncidentId = fixState && fixState !== "loading" ? fixState : null;

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0b0d17]/95 p-5 sm:p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg font-mono text-[11px] font-bold border ${sevStyle}`}>
                            {sev}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg font-mono text-[11px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 uppercase">
                            {item.category}
                          </span>
                          <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {item.file_path}
                            {item.line_number ? `:${item.line_number}` : ""}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-950 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.explanation}
                        </p>

                        {item.expected_behavior && (
                          <div className="pt-1 flex items-start gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                              <strong>Expected:</strong> {item.expected_behavior}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {queuedIncidentId && queuedIncidentId !== "queued" ? (
                          <Link
                            href={`/dashboard/incidents/${queuedIncidentId}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-all"
                          >
                            <span>View Live Incident X-Ray</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAutoFix(item)}
                            disabled={isFixing || Boolean(queuedIncidentId)}
                            className="px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_14px_rgba(99,102,241,0.28)] flex items-center gap-1.5 transition-all disabled:opacity-60"
                          >
                            <Wand2 className={`w-3.5 h-3.5 ${isFixing ? "animate-spin" : ""}`} />
                            <span>
                              {isFixing
                                ? "Queueing Fix..."
                                : queuedIncidentId
                                ? "Queued in F1"
                                : "Auto-Fix & Open PR"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {item.suggested_fix && (
                      <div className="rounded-2xl bg-[#07080d] border border-slate-800 p-4 font-mono text-xs text-emerald-200 overflow-x-auto">
                        <pre className="leading-relaxed">
                          <code>{item.suggested_fix}</code>
                        </pre>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
