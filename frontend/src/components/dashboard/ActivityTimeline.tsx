"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Radio,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityEvent {
  id: string;
  type: "incident_ingested" | "sandbox_executed" | "pr_opened";
  title: string;
  timestamp: string;
  repo: string;
  incidentId?: string;
  prUrl?: string;
  branch?: string;
  details: string;
  status: "success" | "pending" | "investigating";
}

const SAMPLE_EVENTS: ActivityEvent[] = [
  {
    id: "act-1",
    type: "pr_opened",
    title: "Pull Request #1 Opened: fix(auth): prevent KeyError on session lookup",
    timestamp: "2 mins ago",
    repo: "yousiph-coder/autoheal-target-demo",
    incidentId: "INC-9842",
    prUrl: "https://github.com/yousiph-coder/autoheal-target-demo/pull/1",
    branch: "autoheal/fix-auth-keyerror",
    details: "Autonomous patch validated across 5/5 unit test assertions in Docker ephemeral container.",
    status: "success",
  },
  {
    id: "act-2",
    type: "sandbox_executed",
    title: "Sandbox Runner: 5 passed in 0.31s (Exit Code: 0)",
    timestamp: "3 mins ago",
    repo: "yousiph-coder/autoheal-target-demo",
    incidentId: "INC-9842",
    branch: "autoheal/fix-auth-keyerror",
    details: "Container spawned with memory=512MB, network=disabled, cap_drop=ALL.",
    status: "success",
  },
  {
    id: "act-3",
    type: "incident_ingested",
    title: "Sentry Alert Intercepted: KeyError 'user_id' in app/services/auth.py:42",
    timestamp: "4 mins ago",
    repo: "yousiph-coder/autoheal-target-demo",
    incidentId: "INC-9842",
    details: "HMAC validated. Redacted session JWT credentials. PII scrubbed 100%.",
    status: "investigating",
  },
  {
    id: "act-4",
    type: "pr_opened",
    title: "Pull Request #23 Opened: fix(payments): handle NoneType in stripe charge",
    timestamp: "42 mins ago",
    repo: "yousiph-coder/payment-gateway-service",
    incidentId: "INC-9839",
    branch: "autoheal/fix-stripe-charge-null",
    details: "Verified with pytest tests/test_charges.py. Zero regression detected.",
    status: "success",
  },
];

export function ActivityTimeline() {
  const [filter, setFilter] = useState<"all" | "prs" | "sandbox" | "crashes">("all");

  const filtered = SAMPLE_EVENTS.filter((ev) => {
    if (filter === "prs") return ev.type === "pr_opened";
    if (filter === "sandbox") return ev.type === "sandbox_executed";
    if (filter === "crashes") return ev.type === "incident_ingested";
    return true;
  });

  return (
    <div className="p-6 rounded-3xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 shadow-2xl space-y-5">
      {/* Header and Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-white/10">
        <div>
          <h3 className="text-base font-bold font-mono text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Live Autonomous Activity Stream
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
            Real-time feed of ingested exceptions, sandbox runs, and opened PRs
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10 font-mono text-xs">
          {[
            { id: "all", label: "All Events" },
            { id: "prs", label: "PRs Opened" },
            { id: "sandbox", label: "Sandbox" },
            { id: "crashes", label: "Crashes" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all text-[11px] font-medium",
                filter === tab.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Items */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-white/10">
        {filtered.map((event) => {
          const isPr = event.type === "pr_opened";
          const isSandbox = event.type === "sandbox_executed";
          const isIngest = event.type === "incident_ingested";

          return (
            <div key={event.id} className="relative group">
              {/* Timeline Node Icon */}
              <div
                className={cn(
                  "absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110",
                  isPr && "bg-emerald-500 text-black border-emerald-400 shadow-glow-emerald",
                  isSandbox && "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
                  isIngest && "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-glow-crimson"
                )}
              >
                {isPr && <GitPullRequest className="w-3 h-3 text-black" />}
                {isSandbox && <Boxes className="w-3 h-3" />}
                {isIngest && <Radio className="w-3 h-3" />}
              </div>

              {/* Event Card */}
              <div className="p-4 rounded-2xl liquid-glass border border-zinc-200 dark:border-white/10 hover:border-emerald-500/30 transition-all space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border",
                        isPr && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-glow-emerald",
                        isSandbox && "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
                        isIngest && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-glow-crimson"
                      )}
                    >
                      {isPr ? "PR Dispatched" : isSandbox ? "Sandbox Passed" : "Crash Intercepted"}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">{event.timestamp}</span>
                  </div>

                  <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 truncate max-w-xs">
                    {event.repo}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-semibold font-mono text-zinc-900 dark:text-white leading-snug">
                  {event.title}
                </h4>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                  {event.details}
                </p>

                {/* Footer Actions */}
                <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-mono">
                  {event.branch && (
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <GitBranch className="w-3 h-3 text-purple-400" />
                      <code>{event.branch}</code>
                    </span>
                  )}

                  {event.incidentId && (
                    <Link
                      href={`/dashboard/incidents/${event.incidentId}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <span>Inspect Diagnosis</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}

                  {event.prUrl && (
                    <a
                      href={event.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 text-[11px] ml-auto transition-colors"
                    >
                      <span>View on GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
