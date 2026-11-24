'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  DollarSign,
  HeartPulse,
  Zap,
  Plus,
  CheckCircle2,
  GitPullRequest,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  Activity,
  Check,
  Crown,
} from 'lucide-react';

// ============================================================================
// REFLEX DASHBOARD PAGE — AMBIENT BACKDROP GLOW + REFINED ACTIVE CARD
// File path in VS Code: src/app/dashboard/page.tsx
// ============================================================================

interface ReflexIncident {
  id: string;
  title: string;
  file: string;
  line: number;
  repo: string;
  mttr: string;
  timeAgo: string;
  prNumber: number;
  prUrl: string;
  confidence: string;
  blastRadius: string;
  testsPassed: string;
  status: 'merged' | 'ready';
  brokenCode: string;
  healedCode: string;
  summary: string;
}

const INCIDENTS_DATA: ReflexIncident[] = [
  {
    id: '745a7b31',
    title: "TypeError: Cannot read properties of undefined (reading 'length')",
    file: 'src/counter.js',
    line: 42,
    repo: 'yousiph-coder/reflex',
    mttr: '38 sec',
    timeAgo: 'Just now',
    prNumber: 3,
    prUrl: 'https://github.com/yousiph-coder/reflex/pull/3',
    confidence: '99.2%',
    blastRadius: 'Low (1 file isolated)',
    testsPassed: '14 / 14 passed',
    status: 'merged',
    brokenCode: `export function getCount(items) {\n- return items.length;\n}`,
    healedCode: `export function getCount(items) {\n+ if (!Array.isArray(items)) return 0;\n+ return items.length;\n}`,
    summary:
      'Added safe array guard before accessing .length to prevent undefined payload crashes.',
  },
  {
    id: '92bc10f4',
    title: 'KeyError: Missing tenant_id in webhook header payload',
    file: 'api/webhooks/sentry.py',
    line: 88,
    repo: 'yousiph-coder/reflex',
    mttr: '41 sec',
    timeAgo: '2 hours ago',
    prNumber: 2,
    prUrl: 'https://github.com/yousiph-coder/reflex/pull/2',
    confidence: '98.7%',
    blastRadius: 'Low (1 endpoint)',
    testsPassed: '22 / 22 passed',
    status: 'merged',
    brokenCode: `tenant_id = payload["organization"]["id"]`,
    healedCode: `tenant_id = payload.get("organization", {}).get("id", "default")`,
    summary:
      'Replaced direct dictionary lookup with safe .get() fallback for webhook events.',
  },
  {
    id: '31fa89e2',
    title: 'Hydration Mismatch: Async timestamp rendered on client',
    file: 'src/components/TelemetryBadge.tsx',
    line: 19,
    repo: 'yousiph-coder/reflex',
    mttr: '34 sec',
    timeAgo: 'Yesterday',
    prNumber: 1,
    prUrl: 'https://github.com/yousiph-coder/reflex/pull/1',
    confidence: '99.5%',
    blastRadius: 'Minimal (UI component)',
    testsPassed: '9 / 9 passed',
    status: 'ready',
    brokenCode: `<span>{new Date().toLocaleTimeString()}</span>`,
    healedCode: `<span suppressHydrationWarning>{mounted ? time : "--:--"}</span>`,
    summary:
      'Deferred dynamic timestamp rendering until client mount to eliminate Next.js hydration errors.',
  },
];

export default function ReflexDashboardPage() {
  const [selectedId, setSelectedId] = useState<string>('745a7b31');
  const [actionToast, setActionToast] = useState<string | null>(null);

  const selectedIncident =
    INCIDENTS_DATA.find((item) => item.id === selectedId) || INCIDENTS_DATA[0];

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3200);
  };

  const kpiCards = [
    {
      title: 'Reflexes Used',
      value: '3 / 5',
      badge: 'Free Plan',
      subtext: '2 free autonomous fixes remaining this month',
      icon: Zap,
      accent: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-500/10',
    },
    {
      title: 'Avg Resolution Time',
      value: '38 sec',
      badge: 'Fast MTTR',
      subtext: 'From Sentry crash to verified GitHub PR',
      icon: Clock,
      accent: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-500/10',
    },
    {
      title: 'Engineering Saved',
      value: '$487.50',
      badge: '5.6x ROI',
      subtext: '7.5 senior engineering hours saved @ $65/hr',
      icon: DollarSign,
      accent: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-500/10',
    },
    {
      title: 'System Vitality',
      value: '99.8%',
      badge: 'Healthy',
      subtext: 'yousiph-coder/reflex · 0 active crashes',
      icon: HeartPulse,
      accent: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-14">
      {/* =================================================================== */}
      {/* RESTORED AMBIENT BACKGROUND SPOTLIGHT GLOW & SUBTLE DOT MATRIX       */}
      {/* =================================================================== */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Top Cosmic Indigo & Violet Spotlight */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[960px] h-[420px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              'radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)',
          }}
        />
        {/* Secondary Right Studio Glow */}
        <div
          className="absolute top-1/3 right-0 w-[520px] h-[420px] rounded-full blur-[150px] opacity-15 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 75%)',
          }}
        />
      </div>

      {/* Top Section Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Agent Active · Listening to Sentry Webhooks</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Mission Control
          </h1>
        </div>

        <button
          onClick={() =>
            triggerToast('GitHub App connected to yousiph-coder/reflex!')
          }
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Repo</span>
        </button>
      </div>

      {/* 1. 4 CLEAN KPI CARDS */}
      <section className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/85 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm hover:border-indigo-500/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBg}`}
                >
                  <Icon className={`w-4 h-4 ${card.accent}`} />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-950 dark:text-white">
                  {card.value}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                  {card.badge}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {card.subtext}
              </p>
            </div>
          );
        })}
      </section>

      {/* 2. LIVE REFLEX STUDIO (TIMELINE STREAM + INSTANT X-RAY) */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 5 COLUMNS: THE HEALING STREAM (Clean Sleek Active State!) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Live Reflex Stream
              </h2>
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              Click to inspect
            </span>
          </div>

          <div className="space-y-3">
            {INCIDENTS_DATA.map((item) => {
              const isSelected = item.id === selectedIncident.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`relative overflow-hidden w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? 'bg-white dark:bg-[#111526] border-indigo-500/70 dark:border-indigo-500/60 shadow-[0_8px_28px_rgba(99,102,241,0.14)]'
                      : 'bg-white/75 dark:bg-[#0b0d17]/75 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Sleek Left Accent Indicator Bar when Selected (Instead of muddy glow) */}
                  {isSelected && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-violet-500 to-sky-400" />
                  )}

                  <div className="flex items-center justify-between gap-2 pl-1">
                    <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.file}:{item.line}
                    </span>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        item.status === 'merged'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {item.status === 'merged'
                        ? `PR #${item.prNumber} MERGED`
                        : `PR #${item.prNumber} READY`}
                    </span>
                  </div>

                  <p className="mt-2 pl-1 text-xs sm:text-sm font-semibold line-clamp-1 text-slate-900 dark:text-white">
                    {item.title}
                  </p>

                  <div className="mt-3 pl-1 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>⚡ Healed in {item.mttr}</span>
                    <span>{item.timeAgo}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT 7 COLUMNS: INSTANT X-RAY INSPECTOR STUDIO */}
        <div className="lg:col-span-7 rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-xl transition-all">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-semibold">
                  INCIDENT #{selectedIncident.id}
                </span>
                <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedIncident.testsPassed}
                </span>
              </div>
              <h3 className="mt-2 text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                {selectedIncident.title}
              </h3>
            </div>

            <a
              href={selectedIncident.prUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>View PR #{selectedIncident.prNumber}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-3 gap-3 my-5">
            <div className="rounded-xl border p-3 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                AI Confidence
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {selectedIncident.confidence}
              </div>
            </div>

            <div className="rounded-xl border p-3 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                Blast Radius
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {selectedIncident.blastRadius}
              </div>
            </div>

            <div className="rounded-xl border p-3 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                Resolution Speed
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                {selectedIncident.mttr}
              </div>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="rounded-xl bg-[#07080d] border border-rose-500/30 p-3.5 text-rose-300">
              <div className="text-[10px] text-rose-400 uppercase mb-1">
                - Before Crash ({selectedIncident.file})
              </div>
              <pre className="overflow-x-auto">
                <code>{selectedIncident.brokenCode}</code>
              </pre>
            </div>

            <div className="rounded-xl bg-[#07080d] border border-emerald-500/35 p-3.5 text-emerald-300">
              <div className="text-[10px] text-emerald-400 uppercase mb-1">
                + After Reflex Patch (Verified in Docker)
              </div>
              <pre className="overflow-x-auto">
                <code>{selectedIncident.healedCode}</code>
              </pre>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {selectedIncident.summary}
            </p>

            <button
              onClick={() =>
                triggerToast(
                  `Instant Rollback Shield Ready for PR #${selectedIncident.prNumber}`
                )
              }
              className="px-3 py-1.5 rounded-xl font-mono text-xs border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Instant Rollback</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. QUOTA METER & IN-APP PRO UPGRADE BANNER ($29/MO) */}
      <section className="relative z-10 rounded-3xl border p-6 sm:p-8 bg-gradient-to-r from-indigo-50 via-white to-violet-50 dark:from-indigo-950/35 dark:via-[#0b0d17] dark:to-violet-950/25 border-indigo-200 dark:border-indigo-500/35 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                <Crown className="w-3.5 h-3.5" />
                REFLEX PRO · $29/MO
              </span>
              <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                You already saved $487.50 this month (16.8x ROI)
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              You have used 3 of your 5 free monthly Reflexes.
            </h3>

            <div className="space-y-2 max-w-lg">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-300">
                  Monthly Free Quota
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  60% used (2 left)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400" />
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              {[
                'Unlimited autonomous Reflexes',
                'Priority Docker sandbox runner',
                'Instant Slack & Discord alerts',
              ].map((perk, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {perk}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4">
            <div className="lg:text-right">
              <div className="flex items-baseline lg:justify-end gap-1.5">
                <span className="font-mono text-4xl font-extrabold text-slate-950 dark:text-white">
                  $29
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  / month · Cancel anytime
                </span>
              </div>
              <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                Unlock unlimited zero-pager protection across all repos
              </p>
            </div>

            <button
              onClick={() =>
                triggerToast(
                  'Redirecting to Reflex Pro Checkout ($29/mo — Unlimited Reflexes)...'
                )
              }
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-[0_4px_24px_rgba(99,102,241,0.35)] flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Upgrade to Pro — $29/mo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Toast Feedback */}
      {actionToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{actionToast}</span>
        </div>
      )}
    </div>
  );
}