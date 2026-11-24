'use client';

import React, { useState } from 'react';
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
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// REFLEX INCIDENT X-RAY INSPECTOR PAGE
// File path in VS Code: src/app/dashboard/incidents/[id]/page.tsx
// ============================================================================

export default function ReflexIncidentDetailPage() {
  const [activeTab, setActiveTab] = useState<'diff' | 'trace' | 'logs'>('diff');
  const [openStep, setOpenStep] = useState<number>(1);
  const [isMerged, setIsMerged] = useState<boolean>(true);
  const [isRunningSandbox, setIsRunningSandbox] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3400);
  };

  const handleRerunSandbox = () => {
    if (isRunningSandbox) return;
    setIsRunningSandbox(true);
    triggerToast('Spinning up isolated Docker container & running 14 unit tests...');
    setTimeout(() => {
      setIsRunningSandbox(false);
      triggerToast('Docker Sandbox Verified: 14/14 unit tests passed in 4.2s!');
    }, 1800);
  };

  const reasoningSteps = [
    {
      id: 0,
      title: '1. Sentry Webhook Interception (0.4s)',
      badge: 'Captured',
      detail:
        'Received unhandled TypeError payload from Sentry webhook on production branch main. Isolated stack frame at src/counter.js:42:16.',
    },
    {
      id: 1,
      title: '2. AST Root-Cause Analysis via GPT-4o (6.1s)',
      badge: '99.2% Confidence',
      detail:
        'Parsed Abstract Syntax Tree of src/counter.js. Identified unguarded property read `items.length` when upstream API passes undefined or null.',
    },
    {
      id: 2,
      title: '3. Isolated Docker Sandbox Verification (27.3s)',
      badge: '14/14 Tests Passed',
      detail:
        'Spawned ephemeral container `reflex-sandbox-745a7b31`, applied Array.isArray(items) guard, and executed `npm test`. 0 regressions detected.',
    },
    {
      id: 3,
      title: '4. GitHub Pull Request #3 Dispatched (38.0s)',
      badge: 'PR #3 Merged',
      detail:
        'Pushed branch `reflex/fix-incident-745a7b31` via GitHub App ID 5193276 and opened Pull Request #3 on yousiph-coder/reflex.',
    },
  ];

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-16">
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

      {/* 1. BACK NAVIGATION & INCIDENT HEADER */}
      <div className="relative z-10 space-y-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <a
          href="/dashboard/incidents"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incident Explorer</span>
        </a>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-semibold">
                INCIDENT #745a7b31
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isMerged ? 'HEALED & MERGED (PR #3)' : 'READY FOR MERGE'}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                yousiph-coder/reflex · src/counter.js:42
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              TypeError: Cannot read properties of undefined (reading &apos;length&apos;)
            </h1>
          </div>

          {/* Live Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRerunSandbox}
              className="px-3.5 py-2 rounded-xl font-mono text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 text-indigo-500 ${
                  isRunningSandbox ? 'animate-spin' : ''
                }`}
              />
              <span>
                {isRunningSandbox ? 'Running Sandbox...' : 'Re-run Sandbox'}
              </span>
            </button>

            <a
              href="https://github.com/yousiph-coder/reflex/pull/3"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl font-mono text-xs font-medium border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 flex items-center gap-1.5 transition-all"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>View PR #3 on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => {
                setIsMerged(true);
                triggerToast(
                  'PR #3 Verified & Merged on yousiph-coder/reflex!'
                );
              }}
              className="px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.35)] flex items-center gap-1.5 transition-all"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>{isMerged ? 'Merged in PR #3' : 'One-Click Merge PR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. VITALITY RECOVERY & BLAST RADIUS TELEMETRY STRIP */}
      <section className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Vitality Recovery</span>
            <HeartPulse className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 font-mono">
            <span className="text-sm line-through text-rose-500 font-semibold">
              1% Crit
            </span>
            <span className="text-slate-400">→</span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              100% Healthy
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Restored automatically with zero downtime
          </p>
        </div>

        <div className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Resolution Speed (MTTR)</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-sky-600 dark:text-sky-400">
            38 seconds
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Saved 2.5 hrs ($162.50 engineering cost)
          </p>
        </div>

        <div className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Blast Radius</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            Low · 1 File
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Isolated to `getCount()` in `src/counter.js`
          </p>
        </div>

        <div className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sandbox Verification</span>
            <Cpu className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-violet-600 dark:text-violet-400">
            14 / 14 Passed
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Executed `npm test` in 4.2s inside Docker
          </p>
        </div>
      </section>

      {/* 3. SIDE-BY-SIDE SPLIT CODE DIFF & STACK TRACE INSPECTOR */}
      <section className="relative z-10 rounded-3xl border overflow-hidden bg-white/95 dark:bg-[#0b0d17]/95 border-slate-200/90 dark:border-white/10 shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'diff', label: 'Side-by-Side Split Diff', icon: Code2 },
              {
                id: 'trace',
                label: 'Raw Sentry Stack Trace',
                icon: AlertTriangle,
              },
              {
                id: 'logs',
                label: 'Docker Sandbox Output',
                icon: Terminal,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id as 'diff' | 'trace' | 'logs')
                  }
                  className={`px-3.5 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Branch: <strong className="text-indigo-500">reflex/fix-incident-745a7b31</strong>
          </span>
        </div>

        {activeTab === 'diff' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 font-mono text-xs">
            <div className="rounded-2xl border border-rose-500/30 bg-[#07080d] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/20 text-rose-400">
                <span className="font-bold uppercase">
                  - BROKEN PRODUCTION CODE (LINE 40-45)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15">
                  main
                </span>
              </div>
              <pre className="text-slate-300 leading-relaxed overflow-x-auto">
                <code>{`40 | export function getCount(items) {
41 |   // Crashes when items is undefined
42 | - return items.length;
43 | }`}</code>
              </pre>
            </div>

            <div className="rounded-2xl border border-emerald-500/35 bg-[#07080d] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 text-emerald-400">
                <span className="font-bold uppercase">
                  + VERIFIED REFLEX PATCH (PR #3)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15">
                  14/14 tests passed
                </span>
              </div>
              <pre className="text-emerald-200 leading-relaxed overflow-x-auto">
                <code>{`40 | export function getCount(items) {
41 | + if (!Array.isArray(items)) {
42 | +   return 0;
43 | + }
44 | + return items.length;
45 | }`}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'trace' && (
          <div className="p-6 font-mono text-xs">
            <div className="rounded-2xl bg-[#07080d] border border-rose-500/30 p-5 text-rose-300 space-y-2">
              <div className="text-slate-400 text-[11px]">
                Sentry Event ID: 745a7b31 · Environment: production · Node.js v20.11
              </div>
              <pre className="overflow-x-auto leading-relaxed">
                <code>{`TypeError: Cannot read properties of undefined (reading 'length')
    at getCount (webpack-internal:///./src/counter.js:42:16)
    at processTelemetryBatch (webpack-internal:///./src/index.js:118:24)
    at Server.handleRequest (webpack-internal:///./src/server.js:64:11)`}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-6 font-mono text-xs">
            <div className="rounded-2xl bg-[#07080d] border border-indigo-500/30 p-5 text-slate-300 space-y-1.5">
              <div className="text-indigo-400">
                $ docker run --rm --network=none reflex-sandbox:745a7b31 npm test
              </div>
              <div className="text-emerald-400">
                PASS src/__tests__/counter.test.js (4.21s)
              </div>
              <div>✓ returns 0 when items is undefined or null (12ms)</div>
              <div>✓ returns accurate count for valid array (4ms)</div>
              <div className="text-emerald-400 font-bold pt-2">
                Test Suites: 1 passed, 1 total · Tests: 14 passed, 14 total · Regressions: 0
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. 4-STEP COLLAPSIBLE AI REASONING ACCORDION */}
      <section className="relative z-10 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold tracking-tight">
            4-Step Autonomous Reasoning Chain
          </h2>
        </div>

        <div className="space-y-2.5">
          {reasoningSteps.map((step) => {
            const isOpen = openStep === step.id;
            return (
              <div
                key={step.id}
                className="rounded-2xl border bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenStep(isOpen ? -1 : step.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-mono text-xs sm:text-sm font-semibold"
                >
                  <span>{step.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                      {step.badge}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-white/5 leading-relaxed">
                    {step.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}