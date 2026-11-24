'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Play,
  GitPullRequest,
  ShieldCheck,
  Check,
  Zap,
} from 'lucide-react';

// ============================================================================
// REFLEX LANDING PAGE — ELECTRIC INDIGO & VIOLET (LINEAR / RAYCAST PALETTE)
// ============================================================================
export default function ReflexLandingPage() {
  // Theme state: 'dark' (Deep Cosmic Indigo #07080d) or 'light' (Crisp Studio White)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // 360-degree Vortex Spin State
  const [isSpinning, setIsSpinning] = useState(false);

  // Part 2 State: Live 38s Simulation Replay ('healed' | 'replaying')
  const [simStep, setSimStep] = useState<0 | 1 | 2>(2);

  // Part 3 State: Checkout Feedback Banner
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const isDark = theme === 'dark';

  // Function that spins the Reflex Core 360° and pulls user into /dashboard
  const handleEnterDashboard = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 950);
  };

  // Pro Checkout Handler ($29/mo)
  const handleUpgradePro = () => {
    setCheckoutNotice(
      'Redirecting to Reflex Pro Checkout ($29/mo — Unlimited Reflexes)...'
    );
    setTimeout(() => {
      setCheckoutNotice(null);
    }, 3500);
  };

  // Simple Replay Trigger for the Before -> After Stage
  const handleReplayDemo = () => {
    setSimStep(0);
  };

  useEffect(() => {
    if (simStep === 0) {
      const t1 = setTimeout(() => setSimStep(1), 900);
      return () => clearTimeout(t1);
    }
    if (simStep === 1) {
      const t2 = setTimeout(() => setSimStep(2), 1100);
      return () => clearTimeout(t2);
    }
  }, [simStep]);

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-500 overflow-x-hidden ${
        isDark ? 'bg-[#07080d] text-white' : 'bg-[#f8fafc] text-zinc-950'
      }`}
    >
      {/* Ambient Linear-Style Top Spotlight Glow (Electric Indigo + Violet + Sky) */}
      <div
        className="pointer-events-none fixed -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[440px] rounded-full blur-[135px] opacity-35"
        style={{
          background:
            'radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 80%, transparent 100%)',
        }}
      />

      {/* =================================================================== */}
      {/* 1. CLEAN TOP NAVBAR                                                 */}
      {/* =================================================================== */}
      <header className="relative z-20 max-w-6xl mx-auto px-6 pt-5">
        <nav
          className={`h-14 px-5 rounded-2xl border backdrop-blur-xl flex items-center justify-between transition-all ${
            isDark
              ? 'bg-white/[0.03] border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.45)]'
              : 'bg-white/85 border-slate-200/90 shadow-sm'
          }`}
        >
          {/* Left: Reflex Brand Mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-sm bg-gradient-to-tr from-indigo-500 via-violet-500 to-sky-400 rotate-45 shadow-[0_0_14px_#6366f1]" />
            </div>
            <span className="font-mono font-bold text-base tracking-tight">
              Reflex
            </span>
          </div>

          {/* Center: 2 Simple Navigation Links */}
          <div
            className={`hidden md:flex items-center gap-8 text-sm font-medium ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <a
              href="#how-it-works"
              className="hover:text-indigo-400 transition-colors"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="hover:text-indigo-400 transition-colors"
            >
              Pricing
            </a>
          </div>

          {/* Right: Theme Switcher + Single Clean CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleEnterDashboard}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-[0_0_25px_rgba(99,102,241,0.45)] flex items-center gap-1.5"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      </header>

      {/* =================================================================== */}
      {/* 2. CENTER-STAGE HERO                                                */}
      {/* =================================================================== */}
      <main
        className={`relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-28 text-center transition-all duration-700 ${
          isSpinning ? 'scale-110 opacity-0 blur-md' : 'scale-100 opacity-100'
        }`}
      >
        {/* Interactive 360° Reflex Core Emblem */}
        <div className="flex flex-col items-center justify-center mb-8">
          <button
            onClick={handleEnterDashboard}
            className="group relative w-24 h-24 rounded-3xl flex items-center justify-center cursor-pointer focus:outline-none"
            title="Click to spin 360° and enter Dashboard"
          >
            <div className="absolute inset-0 rounded-3xl bg-indigo-500/25 blur-xl group-hover:bg-violet-500/40 transition-all duration-500" />

            <div
              className={`relative w-24 h-24 rounded-3xl border flex items-center justify-center transition-transform duration-700 ${
                isSpinning
                  ? 'rotate-[360deg] scale-125'
                  : 'group-hover:rotate-90 group-hover:scale-105'
              } ${
                isDark
                  ? 'bg-[#0d0f1a]/90 border-indigo-500/40 shadow-[0_0_45px_rgba(99,102,241,0.35)]'
                  : 'bg-white border-indigo-500/40 shadow-xl'
              }`}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="reflex-indigo-grad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="50%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  stroke="url(#reflex-indigo-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="28 14"
                  strokeLinecap="round"
                />
                <path
                  d="M24 15V33M15 24H33"
                  stroke="url(#reflex-indigo-grad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </button>

          <span
            className={`mt-3 font-mono text-[11px] tracking-widest uppercase flex items-center gap-1.5 ${
              isDark ? 'text-indigo-400/90' : 'text-indigo-700'
            }`}
          >
            <RotateCw className="w-3 h-3 animate-spin" />
            Click Core to Spin 360° into Dashboard
          </span>
        </div>

        {/* Small Pill Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium mb-6 ${
            isDark
              ? 'bg-indigo-500/[0.07] border-indigo-500/25 text-indigo-200'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800 shadow-sm'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Autonomous SRE for FastAPI & Next.js</span>
        </div>

        {/* Center-Stage Headline */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl mx-auto">
          Your code heals itself{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400">
            before users ever notice.
          </span>
        </h1>

        {/* Clean, Easy-to-Read Subtitle */}
        <p
          className={`mt-6 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Reflex catches production crashes from Sentry, writes and tests the
          fix inside an isolated Docker sandbox, and opens a verified GitHub
          Pull Request in <strong>38 seconds</strong>.
        </p>

        {/* Two Clean Center Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleEnterDashboard}
            className="px-7 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-[0_0_35px_rgba(99,102,241,0.45)] flex items-center gap-2"
          >
            <span>Start Free — 5 Reflexes/mo</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              handleReplayDemo();
              document
                .getElementById('how-it-works')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-7 py-3.5 rounded-2xl text-sm font-semibold border transition-all ${
              isDark
                ? 'bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08]'
                : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100 shadow-sm'
            }`}
          >
            See 38s Live Demo
          </a>
        </div>

        {/* ================================================================= */}
        {/* 3. PART 2: THE 38-SECOND "BEFORE -> AFTER" VISUAL STAGE           */}
        {/* ================================================================= */}
        <section id="how-it-works" className="mt-20 text-left">
          <div
            className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl transition-all ${
              isDark
                ? 'bg-[#0b0d17]/90 border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.65)]'
                : 'bg-white border-slate-200/90 shadow-xl'
            }`}
          >
            {/* Stage Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-500/15">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="font-mono text-xs sm:text-sm font-semibold">
                  LIVE VERIFIED CASE · yousiph-coder/reflex (src/counter.js)
                </span>
              </div>

              <button
                onClick={handleReplayDemo}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-medium border flex items-center gap-1.5 transition-all ${
                  isDark
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <Play className="w-3.5 h-3.5 text-indigo-400" />
                <span>Replay 38s Reflex</span>
              </button>
            </div>

            {/* 3-Column Visual Flow: BEFORE -> REFLEX ENGINE -> AFTER */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-11 gap-6 items-center">
              {/* LEFT CARD: BEFORE (Production Crash — Crimson Accent) */}
              <div
                className={`lg:col-span-4 rounded-2xl border p-5 transition-all duration-500 ${
                  simStep >= 0
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-40 translate-y-2'
                } ${
                  isDark
                    ? 'bg-rose-950/15 border-rose-500/30'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-rose-500 uppercase">
                    <AlertCircle className="w-4 h-4" />
                    1. Before (00:00s)
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-semibold">
                    Sentry Crash
                  </span>
                </div>

                <p
                  className={`text-xs mb-3 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Unhandled <code className="font-mono">TypeError</code> crashes
                  production when <code className="font-mono">items</code> is
                  empty:
                </p>

                <div className="rounded-xl bg-[#05060b] text-rose-300 p-3.5 font-mono text-xs leading-relaxed border border-rose-500/20">
                  <div className="text-slate-500 text-[10px] mb-1">
                    src/counter.js · Line 42
                  </div>
                  <code>- return items.length;</code>
                  <div className="text-[11px] text-rose-400/90 mt-1">
                    × Cannot read &apos;length&apos; of undefined
                  </div>
                </div>
              </div>

              {/* CENTER: THE 38-SECOND REFLEX ENGINE PULSE (Electric Indigo) */}
              <div className="lg:col-span-3 flex flex-col items-center justify-center py-2 text-center">
                <div
                  className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
                    simStep === 1
                      ? 'rotate-180 scale-110 border-indigo-400 bg-indigo-500/25 shadow-[0_0_40px_rgba(99,102,241,0.6)]'
                      : isDark
                      ? 'bg-indigo-500/10 border-indigo-500/30'
                      : 'bg-indigo-50 border-indigo-200'
                  }`}
                >
                  <ShieldCheck className="w-8 h-8 text-indigo-400" />
                </div>

                <div className="mt-3 font-mono text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">
                  38 sec
                </div>
                <div
                  className={`text-xs font-medium mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Isolated Docker Sandbox
                </div>
                <div className="mt-2 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                  14/14 unit tests passed
                </div>
              </div>

              {/* RIGHT CARD: AFTER (Verified GitHub PR #3 — Emerald Semantic Success) */}
              <div
                className={`lg:col-span-4 rounded-2xl border p-5 transition-all duration-500 ${
                  simStep === 2
                    ? 'opacity-100 scale-100'
                    : 'opacity-35 scale-95'
                } ${
                  isDark
                    ? 'bg-emerald-950/15 border-emerald-500/35 shadow-[0_0_40px_rgba(16,185,129,0.12)]'
                    : 'bg-emerald-50/70 border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-500 uppercase">
                    <CheckCircle2 className="w-4 h-4" />
                    2. After (00:38s)
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                    PR #3 Merged
                  </span>
                </div>

                <p
                  className={`text-xs mb-3 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Reflex writes a safe guard, verifies zero regressions, and
                  opens PR #3:
                </p>

                <div className="rounded-xl bg-[#05060b] text-emerald-300 p-3.5 font-mono text-xs leading-relaxed border border-emerald-500/30">
                  <div className="text-slate-500 text-[10px] mb-1">
                    src/counter.js · Verified Patch
                  </div>
                  <div>+ if (!Array.isArray(items)) return 0;</div>
                  <div>+ return items.length;</div>
                </div>
              </div>
            </div>

            {/* Bottom Summary Bar */}
            <div className="mt-6 pt-5 border-t border-slate-500/15 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div
                className={`flex items-center gap-2 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <GitPullRequest className="w-4 h-4 text-indigo-400" />
                <span>
                  Saved <strong>2.5 engineering hours ($162.50)</strong> on a
                  single incident without waking up the team.
                </span>
              </div>

              <button
                onClick={handleEnterDashboard}
                className="font-mono font-semibold text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Inspect full PR #3 in Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. PART 3: CLEAN, HIGH-CONVERTING PRICING CARDS ($0 vs $29/mo)    */}
        {/* ================================================================= */}
        <section id="pricing" className="mt-28">
          <div className="max-w-xl mx-auto text-center mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-indigo-400 font-semibold">
              Simple Pricing
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
              One healed crash pays for 5 months of Pro.
            </h2>
            <p
              className={`mt-3 text-sm sm:text-base ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Each verified Reflex saves ~2.5 senior engineering hours ($162.50
              value). Start free and upgrade when your team scales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            {/* CARD 1: STARTER (FREE) */}
            <div
              className={`rounded-3xl border p-8 flex flex-col justify-between transition-all ${
                isDark
                  ? 'bg-[#0b0d17]/80 border-white/10'
                  : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Starter</h3>
                  <span
                    className={`font-mono text-xs px-2.5 py-1 rounded-full border ${
                      isDark
                        ? 'border-white/10 text-slate-400'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    For solo devs
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono">
                    $0
                  </span>
                  <span
                    className={`text-sm ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    / month
                  </span>
                </div>

                <p
                  className={`mt-3 text-xs sm:text-sm ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Experience autonomous self-healing on your personal
                  repositories.
                </p>

                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    '5 autonomous Reflexes / month',
                    '1 connected GitHub repository',
                    'Isolated Docker sandbox verification',
                    'Automated GitHub Pull Requests',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span
                        className={isDark ? 'text-slate-300' : 'text-slate-700'}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleEnterDashboard}
                className={`mt-8 w-full py-3.5 rounded-2xl text-sm font-semibold border transition-all ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}
              >
                Start Free — 5 Reflexes/mo
              </button>
            </div>

            {/* CARD 2: REFLEX PRO ($29/MO — ELECTRIC INDIGO HIGHLIGHT) */}
            <div
              className={`relative rounded-3xl border p-8 flex flex-col justify-between transition-all ${
                isDark
                  ? 'bg-gradient-to-b from-indigo-950/35 via-[#0b0d17] to-[#0b0d17] border-indigo-500/50 shadow-[0_0_55px_rgba(99,102,241,0.2)]'
                  : 'bg-white border-indigo-500 shadow-xl'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">Reflex Pro</h3>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                    5.6x ROI · MOST POPULAR
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono">
                    $29
                  </span>
                  <span
                    className={`text-sm ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    / month
                  </span>
                </div>

                <p
                  className={`mt-3 text-xs sm:text-sm ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  24/7 zero-pager protection for production startups and growing
                  teams.
                </p>

                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    'Unlimited autonomous Reflexes / month',
                    'Unlimited GitHub repositories',
                    'Priority Docker sandbox execution (`pytest` & `npm test`)',
                    'Instant Slack & Discord live webhook alerts',
                    'One-Click Merge & Instant Rollback shield',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span
                        className={isDark ? 'text-slate-200' : 'text-slate-800'}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleUpgradePro}
                className="mt-8 w-full py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-[0_0_30px_rgba(99,102,241,0.45)] flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Upgrade to Pro — $29/mo</span>
              </button>
            </div>
          </div>
        </section>

        {/* Minimal Clean Footer */}
        <footer
          className={`mt-24 pt-8 border-t border-slate-500/15 flex flex-wrap items-center justify-between gap-4 text-xs ${
            isDark ? 'text-slate-500' : 'text-slate-500'
          }`}
        >
          <span>© 2026 Reflex Inc. Autonomous SRE Platform.</span>
          <span className="font-mono">
            GitHub App ID: 5193276 · Status: 99.8% Vitality
          </span>
        </footer>
      </main>

      {/* Checkout Toast Notice */}
      {checkoutNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{checkoutNotice}</span>
        </div>
      )}
    </div>
  );
}