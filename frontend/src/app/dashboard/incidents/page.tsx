'use client';

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  GitPullRequest,
  ShieldCheck,
  Clock,
  ExternalLink,
  Filter,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  FileCode2,
  HeartPulse,
} from 'lucide-react';

// ============================================================================
// REFLEX INCIDENT EXPLORER PAGE
// File path in VS Code: src/app/dashboard/incidents/page.tsx
// ============================================================================

interface IncidentRecord {
  id: string;
  title: string;
  file: string;
  line: number;
  repo: string;
  branch: string;
  mttr: string;
  timeAgo: string;
  prNumber: number;
  prUrl: string;
  confidence: string;
  blastRadius: string;
  testsPassed: string;
  moneySaved: string;
  status: 'merged' | 'ready';
  rootCause: string;
}

const ALL_INCIDENTS: IncidentRecord[] = [
  {
    id: '745a7b31',
    title: "TypeError: Cannot read properties of undefined (reading 'length')",
    file: 'src/counter.js',
    line: 42,
    repo: 'yousiph-coder/reflex',
    branch: 'reflex/fix-incident-745a7b31',
    mttr: '38 sec',
    timeAgo: 'Just now',
    prNumber: 3,
    prUrl: 'https://github.com/yousiph-coder/reflex/pull/3',
    confidence: '99.2%',
    blastRadius: 'Low (1 file)',
    testsPassed: '14/14 unit tests',
    moneySaved: '$162.50',
    status: 'merged',
    rootCause:
      'Unguarded array length property access when incoming telemetry batch is undefined.',
  },
  {
    id: '92bc10f4',
    title: 'KeyError: Missing tenant_id in webhook header payload',
    file: 'api/webhooks/sentry.py',
    line: 88,
    repo: 'yousiph-coder/reflex',
    branch: 'reflex/fix-incident-92bc10f4',
    mttr: '41 sec',
    timeAgo: '2 hours ago',
    prNumber: 2,
    prUrl: 'https://github.com/yousiph-coder/reflex/pull/2',
    confidence: '98.7%',
    blastRadius: 'Low (1 endpoint)',
    testsPassed: '22/22 unit tests',
    moneySaved: '$162.50',
    status: 'merged',
    rootCause:
      'Direct dictionary key lookup on optional organization block in Sentry ping event.',
  },
  {
    id: '31fa89e2',
    title: 'Hydration Mismatch: Async timestamp rendered on client',
    file: 'src/components/TelemetryBadge.tsx',
    line: 19,
    repo: 'yousiph-coder/reflex',
    branch: 'reflex/fix-incident-31fa89e2',
    mttr: '34 sec',
    timeAgo: 'Yesterday',
    prNumber: 1,
    prUrl: 'https://github.com/yousiph-coder/reflex/pull/1',
    confidence: '99.5%',
    blastRadius: 'Minimal (UI badge)',
    testsPassed: '9/9 unit tests',
    moneySaved: '$162.50',
    status: 'ready',
    rootCause:
      'Client-side locale time differed from SSR render during initial Next.js hydration.',
  },
];

export default function ReflexIncidentsPage() {
  const [filter, setFilter] = useState<'all' | 'merged' | 'ready'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const filteredIncidents = ALL_INCIDENTS.filter((inc) => {
    const matchesTab = filter === 'all' ? true : inc.status === filter;
    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-14">
      {/* Ambient Background Spotlight Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[960px] h-[420px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              'radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)',
          }}
        />
      </div>

      {/* 1. TOP HEADER & SUMMARY PILLS */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Closed-Loop Incident Ledger · 100% Sandbox Verified</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Incident Explorer
          </h1>
        </div>

        {/* Summary Metric Capsules */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="px-3.5 py-2 rounded-xl border bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400">Vitality:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">
              1% → 100%
            </strong>
          </div>

          <div className="px-3.5 py-2 rounded-xl border bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-500 dark:text-slate-400">Avg MTTR:</span>
            <strong className="text-indigo-600 dark:text-indigo-400">
              37.6 sec
            </strong>
          </div>
        </div>
      </div>

      {/* 2. FILTER TABS & SEARCH BAR */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="inline-flex p-1 rounded-2xl border bg-slate-100/80 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 self-start">
          {[
            { key: 'all', label: 'All Reflexes (3)' },
            { key: 'merged', label: 'Merged PRs (2)' },
            { key: 'ready', label: 'Ready to Merge (1)' },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as 'all' | 'merged' | 'ready')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Clean Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by file, error, or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-mono bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 3. INCIDENT CARDS LIST */}
      <div className="relative z-10 space-y-4">
        {filteredIncidents.map((inc) => (
          <div
            key={inc.id}
            className="rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 hover:border-indigo-500/40 shadow-sm transition-all space-y-4"
          >
            {/* Card Top Row */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-semibold">
                    #{inc.id}
                  </span>

                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                    <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                    {inc.file}:{inc.line}
                  </span>

                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {inc.timeAgo}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  {inc.title}
                </h2>
              </div>

              {/* Status & Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`font-mono text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                    inc.status === 'merged'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {inc.status === 'merged'
                    ? `PR #${inc.prNumber} Merged`
                    : `PR #${inc.prNumber} Ready`}
                </span>

                <a
                  href={`/dashboard/incidents/${inc.id}`}
                  className="px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shadow-[0_4px_15px_rgba(99,102,241,0.3)]"
                >
                  <span>Inspect X-Ray</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Root Cause Description */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {inc.rootCause}
            </p>

            {/* Bottom Telemetry Bar */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400">
                <span>
                  ⚡ MTTR:{' '}
                  <strong className="text-sky-600 dark:text-sky-400">
                    {inc.mttr}
                  </strong>
                </span>
                <span>
                  🛡 Confidence:{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {inc.confidence}
                  </strong>
                </span>
                <span>
                  ✓ Sandbox:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {inc.testsPassed}
                  </strong>
                </span>
                <span>
                  💰 Saved:{' '}
                  <strong className="text-violet-600 dark:text-violet-400">
                    {inc.moneySaved}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={inc.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>GitHub PR #{inc.prNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() =>
                    showToast(
                      `Re-running Docker Sandbox verification for #${inc.id}...`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Re-verify</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}