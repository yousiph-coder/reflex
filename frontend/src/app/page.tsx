// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { SmartHelpLayer } from "@/components/ux/SmartHelpLayer";
import { SmartSearchModal } from "@/components/ux/SmartSearchModal";
import { AdaptiveUIConfig, OnboardingAgentResponse } from "@/lib/ux-ai-engine";

export default function AutoHealCommandPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [searchOpen, setSearchOpen] = useState(false);

  // Adaptive UI State
  const [userIntent, setUserIntent] = useState<string>("triage_crashes");
  const [customIntentInput, setCustomIntentInput] = useState<string>("");
  const [adaptiveData, setAdaptiveData] = useState<AdaptiveUIConfig | null>(null);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);

  // Onboarding Agent State
  const [userGoal, setUserGoal] = useState<string>("Fix my first production bug automatically");
  const [onboardingData, setOnboardingData] = useState<OnboardingAgentResponse | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [lastRegenTime, setLastRegenTime] = useState<number>(0);

  // الاختصار العالمي Cmd+K / Ctrl+K للبحث الذكي
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // استرجاع خطوات الـ Onboarding المحفوظة
  useEffect(() => {
    const saved = localStorage.getItem("autoheal_onboarding_steps");
    const dismissed = localStorage.getItem("autoheal_onboarding_dismissed");
    if (saved) setCompletedSteps(JSON.parse(saved));
    if (dismissed === "true") setOnboardingDismissed(true);
  }, []);

  // تشغيل الـ Adaptive UI
  const fetchAdaptiveUI = async (intentKey: string) => {
    setAdaptiveLoading(true);
    try {
      const res = await fetch("/api/ux-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "adaptive_ui", payload: { intent: intentKey } }),
      });
      const json = await res.json();
      setAdaptiveData(json);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  // تشغيل الـ Onboarding Agent مع Rate-Limiting
  const fetchOnboardingPath = async (goalText: string, stepsDone: string[]) => {
    const now = Date.now();
    if (now - lastRegenTime < 2500 && onboardingData) return; // Rate limit regeneration
    setLastRegenTime(now);

    setOnboardingLoading(true);
    try {
      const res = await fetch("/api/ux-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "onboarding_agent",
          payload: { goal: goalText.slice(0, 90), completedSteps: stepsDone, plan: "free" },
        }),
      });
      const json = await res.json();
      setOnboardingData(json);
    } finally {
      setOnboardingLoading(false);
    }
  };

  useEffect(() => {
    fetchAdaptiveUI(userIntent);
    fetchOnboardingPath(userGoal, completedSteps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStepComplete = (idx: number) => {
    const stepId = `step-${idx + 1}`;
    const updated = completedSteps.includes(stepId)
      ? completedSteps.filter((id) => id !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(updated);
    localStorage.setItem("autoheal_onboarding_steps", JSON.stringify(updated));
    fetchOnboardingPath(userGoal, updated);
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-black text-zinc-100" : "bg-white text-zinc-950"
      }`}
    >
      {/* طبقة الذكاء السياقية (المؤشر المضيء والكروت العائمة) */}
      <SmartHelpLayer />

      {/* نافذة البحث الذكي باللغة الطبيعية */}
      <SmartSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* =========================================================
          TOP STATUS & NAVIGATION BAR (Merged Agent Engine + Search)
      ========================================================= */}
      <header
        data-section="Top Navigation & Agent Telemetry Bar"
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          isDark ? "border-white/[0.08] bg-black/80" : "border-zinc-200 bg-white/80"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          {/* Logo + Workspace Switcher Side by Side */}
          <div className="flex items-center gap-5">
            <a
              href="/dashboard"
              data-help-label="AutoHeal AI Brand & Home"
              className="flex items-center gap-2.5 font-mono text-sm font-bold tracking-tight"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                ✚
              </span>
              <span>AUTOHEAL</span>
            </a>

            <span className="text-zinc-600">/</span>

            {/* Read-Only Plan Badge + Workspace Selector */}
            <div
              data-help-label="Active Organization Workspace Switcher"
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 font-mono text-xs ${
                isDark
                  ? "border-white/10 bg-white/[0.03] text-zinc-200"
                  : "border-zinc-200 bg-zinc-50 text-zinc-800"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>yousiph-coder / Vireon</span>
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                FREE (3/5 HEALS)
              </span>
            </div>
          </div>

          {/* Merged Agent Status Bar + Smart Search + Theme Switch */}
          <div className="flex items-center gap-3">
            {/* Agent Engine Live Status Pill */}
            <div
              data-help-label="Autonomous SRE Engine Heartbeat"
              className={`hidden xl:flex items-center gap-3 rounded-lg border px-3.5 py-1.5 font-mono text-xs ${
                isDark
                  ? "border-white/[0.08] bg-white/[0.02] text-zinc-300"
                  : "border-zinc-200 bg-zinc-100 text-zinc-700"
              }`}
            >
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                AGENT: ACTIVE
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-emerald-400"> ♥ 99.8% VITALITY</span>
            </div>

            {/* Smart Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              data-help-label="Natural Language Smart Search (Cmd+K)"
              className={`flex items-center gap-3 rounded-lg border px-3.5 py-1.5 font-mono text-xs transition ${
                isDark
                  ? "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-cyan-400/50 hover:text-white"
                  : "border-zinc-300 bg-zinc-50 text-zinc-600 hover:border-zinc-900"
              }`}
            >
              <span>Search workflows...</span>
              <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px]">
                ⌘K
              </kbd>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              data-help-label="Switch OLED Dark / Clean Light Mode"
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                isDark
                  ? "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/30"
                  : "border-zinc-300 bg-zinc-100 text-zinc-800"
              }`}
            >
              {isDark ? "☀ LIGHT" : "☾ OLED"}
            </button>

            {/* Primary Action Reserved Strictly for Emerald */}
            <a
              href="/dashboard"
              data-help-label="Enter Live SRE Command Dashboard"
              className="rounded-lg bg-emerald-500 px-4 py-1.5 font-mono text-xs font-semibold text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition"
            >
              Open Dashboard →
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8">
        {/* =========================================================
            SECTION 1: ASYMMETRIC HERO (Balanced by Weight, Not Symmetry)
        ========================================================= */}
        <section
          data-section="Hero — Autonomous Production Bug Remediation"
          className="relative py-20 lg:py-28 border-b border-white/[0.08]"
        >
          <div className="grid grid-cols-12 gap-12 items-center">
            {/* Left Column (5 Cols): Calm, Surgical Copy */}
            <div className="col-span-12 lg:col-span-5 space-y-7">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                [ 01 // ZERO-PAGER AUTONOMOUS SRE ]
              </div>

              <h1 className="font-mono text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08]">
                Production exceptions fixed and verified{" "}
                <span className="text-emerald-400 drop-shadow-[0_0_18px_rgba(16,185,129,0.3)]">
                  before your users notice.
                </span>
              </h1>

              <p className="text-[17px] leading-relaxed text-zinc-400">
                When Sentry catches a runtime crash in your FastAPI or Next.js app, AutoHeal spins up an isolated Docker sandbox, reproduces the stack trace, writes the patch, runs your test suite, and opens a clean GitHub Pull Request ready for a one-click merge.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="/dashboard/repositories"
                  data-help-label="Connect GitHub Repository via App ID 5193276"
                  className="rounded-xl bg-emerald-500 px-6 py-3.5 font-mono text-sm font-semibold text-black shadow-[0_0_25px_rgba(16,185,129,0.45)] hover:bg-emerald-400 transition"
                >
                  Connect GitHub App — Free (5 Heals/mo)
                </a>
                <a
                  href="/dashboard/incidents"
                  data-help-label="Inspect Real Merged PR #3 on Vireon"
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3.5 font-mono text-sm text-zinc-200 hover:border-white/35 transition"
                >
                  Inspect Live PR #3 Diff
                </a>
              </div>
            </div>

            {/* Right Column (7 Cols): Grid-Breaking Live Visual + Overlapping Highlight Card */}
            <div className="col-span-12 lg:col-span-7 relative">
              {/* Main Product Visual Breaking Right Boundary */}
              <div
                data-help-label="Live Split-View Code Diff & Sandbox Output"
                className="relative lg:-mr-8 rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-2xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)]"
              >
                {/* Signature Corner Brackets */}
                <span className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-emerald-400" />
                <span className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-emerald-400" />
                <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-emerald-400" />
                <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-emerald-400" />

                {/* Top Bar of Visual */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5 font-mono text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-red-400">
                      SENTRY_EVENT #745a7b31
                    </span>
                    <span className="text-zinc-400">yousiph-coder/Vireon</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-white">src/counter.js</span>
                  </div>
                  <span className="text-cyan-400">[AI CONFIDENCE: 98.4%]</span>
                </div>

                {/* Split Code Diff View */}
                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div className="rounded-xl border border-red-500/20 bg-red-950/15 p-4 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-red-400">
                      — BROKEN PRODUCTION CODE (LINE 42)
                    </div>
                    <pre className="overflow-x-auto text-red-200/90 leading-relaxed">
{`export function getCount(items) {
- return items.length;
  // TypeError: Cannot read
  // properties of undefined
}`}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-400">
                      + VERIFIED SANDBOX PATCH (PR #3)
                    </div>
                    <pre className="overflow-x-auto text-emerald-200 leading-relaxed">
{`export function getCount(items) {
+ if (!Array.isArray(items)) {
+   return 0;
+ }
+ return items.length;
}`}
                    </pre>
                  </div>
                </div>

                {/* Collapsible AI Reasoning Preview */}
                <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-950/10 p-3.5 font-mono text-xs flex items-center justify-between">
                  <span className="text-cyan-300">
                    ✓ Docker Sandbox executed 14 unit tests in 4.2s — 0 regressions detected.
                  </span>
                  <span className="text-emerald-400 font-semibold">MERGED TO MAIN</span>
                </div>
              </div>

              {/* Floating Highlight Card Pulled Out in Front of Visual */}
              <div
                data-help-label="Real-World Remediation Speed Highlight"
                className="relative lg:absolute lg:-bottom-8 lg:-left-10 mt-6 lg:mt-0 w-full lg:w-80 rounded-2xl border border-emerald-400/40 bg-black/95 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(16,185,129,0.2)]"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">
                  [ LIVE BENCHMARK // VIREON REPO ]
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-bold text-white">38 sec</span>
                  <span className="font-mono text-xs text-emerald-400">Crash → Verified PR</span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                  Branch <code className="text-zinc-200">autoheal/fix-incident-745a7b31</code> automatically created, tested on Vercel Preview, and merged.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 2: THIN QUALIFYING STRIP (Who This Product Is For)
        ========================================================= */}
        <div
          data-section="Target Audience Qualifier"
          className="border-b border-white/[0.08] py-5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-zinc-400"
        >
          <span className="text-zinc-200 font-semibold uppercase tracking-wider">
            [ BUILT FOR LEAN ENGINEERING TEAMS ]
          </span>
          <span>✓ Solo SaaS Founders shipping without a 24/7 SRE</span>
          <span>✓ CTOs running Next.js, FastAPI & Node in production</span>
          <span>✓ Teams tired of 3:00 AM Sentry PagerDuty alerts</span>
        </div>

        {/* =========================================================
            SECTION 3: ADAPTIVE UI + PERSONALIZED ONBOARDING AGENT
        ========================================================= */}
        <section
          data-section="Adaptive Workspace & Onboarding Agent"
          className="py-20 border-b border-white/[0.08] space-y-12"
        >
          {/* Editorial Rhythm Header: Kicker + Left Heading / Right Paragraph */}
          <div className="grid grid-cols-12 gap-8 items-end">
            <div className="col-span-12 lg:col-span-5 space-y-2">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-400">
                [ 02 // INTENT-DRIVEN WORKSPACE ]
              </div>
              <h2 className="font-mono text-3xl font-bold tracking-tight">
                An interface that adapts to{" "}
                <span className="text-emerald-400">what you need right now.</span>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-7">
              <p className="text-[17px] text-zinc-400 leading-relaxed">
                Select your current engineering focus below. The workspace reconfigures its priority telemetry, recommended actions, and onboarding checklist using only your live repository state.
              </p>
            </div>
          </div>

          {/* Adaptive Intent Controls */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs uppercase text-cyan-400 mr-2">
                  [ ACTIVE INTENT ]:
                </span>
                {[
                  { id: "triage_crashes", label: "🚨 Triage Active Crashes" },
                  { id: "connect_infra", label: "🔌 Wire GitHub & Sentry" },
                  { id: "executive_roi", label: "💰 Founder ROI & Quota" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setUserIntent(tab.id);
                      fetchAdaptiveUI(tab.id);
                    }}
                    className={`rounded-lg px-3.5 py-2 font-mono text-xs transition ${
                      userIntent === tab.id
                        ? "bg-cyan-500/15 border border-cyan-400 text-cyan-300"
                        : "border border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Custom Intent Input + Reset */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customIntentInput.trim()) fetchAdaptiveUI(customIntentInput.trim());
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  maxLength={60}
                  value={customIntentInput}
                  onChange={(e) => setCustomIntentInput(e.target.value)}
                  placeholder="Or type custom intent..."
                  className="rounded-lg border border-white/10 bg-black px-3 py-1.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-300 hover:bg-cyan-500/20"
                >
                  Adapt
                </button>
              </form>
            </div>

            {/* Adaptive UI Output Grid */}
            {adaptiveLoading ? (
              <div className="flex items-center gap-3 py-8 font-mono text-xs text-cyan-300">
                <span className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span>Reconfiguring workspace telemetry...</span>
              </div>
            ) : (
              adaptiveData && (
                <div className="grid grid-cols-12 gap-6 items-stretch">
                  {/* Priority Metric Card */}
                  <div className="col-span-12 lg:col-span-4 rounded-xl border border-white/10 bg-black p-5 flex flex-col justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-400">
                      [ {adaptiveData.mode_title} ]
                    </div>
                    <div className="my-4">
                      <div className="text-xs text-zinc-400">{adaptiveData.priority_metric.label}</div>
                      <div className="font-mono text-3xl font-bold text-white mt-1">
                        {adaptiveData.priority_metric.value}
                      </div>
                      <div className="font-mono text-xs text-emerald-400 mt-1">
                        {adaptiveData.priority_metric.delta}
                      </div>
                    </div>
                    <a
                      href={adaptiveData.highlighted_route}
                      className="inline-block font-mono text-xs text-emerald-400 hover:underline"
                    >
                      Go to primary view →
                    </a>
                  </div>

                  {/* Recommended Actions from Real Data */}
                  <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adaptiveData.recommended_actions.map((act, i) => (
                      <a
                        key={i}
                        href={act.route}
                        className="group rounded-xl border border-white/10 bg-black/60 p-5 transition hover:border-emerald-500/40 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <span className="inline-block rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                            {act.badge}
                          </span>
                          <h3 className="font-mono text-base font-semibold text-white group-hover:text-emerald-400">
                            {act.title}
                          </h3>
                          <p className="text-xs text-zinc-400 leading-relaxed">{act.reason}</p>
                        </div>
                        <span className="mt-4 font-mono text-xs text-zinc-300 group-hover:text-white">
                          Execute action →
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Personalized Onboarding Agent Checklist */}
          {!onboardingDismissed && (
            <div className="relative rounded-2xl border border-cyan-400/25 bg-zinc-950/90 p-6 space-y-5">
              <span className="absolute top-0 left-0 h-2.5 w-2.5 border-t border-l border-cyan-400" />
              <span className="absolute top-0 right-0 h-2.5 w-2.5 border-t border-r border-cyan-400" />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-400">
                    [ ONBOARDING AGENT // FASTEST PATH TO FIRST OUTCOME ]
                  </span>
                  <h3 className="font-mono text-lg font-bold text-white mt-1">
                    {onboardingData?.welcome_message || "What are you trying to accomplish today?"}
                  </h3>
                  <p className="text-xs text-zinc-400">{onboardingData?.summary}</p>
                </div>

                {/* Goal Selector + Custom Input with Character Limit */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={userGoal}
                    onChange={(e) => {
                      setUserGoal(e.target.value);
                      fetchOnboardingPath(e.target.value, completedSteps);
                    }}
                    className="rounded-lg border border-white/10 bg-black px-3 py-1.5 font-mono text-xs text-zinc-200"
                  >
                    <option value="Fix my first production bug automatically">
                      Goal: Fix first bug automatically
                    </option>
                    <option value="Connect Sentry webhook & test pipeline">
                      Goal: Wire Sentry webhook fast
                    </option>
                    <option value="Review and merge verified GitHub PRs">
                      Goal: Audit & merge AI PRs
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setCompletedSteps([]);
                      localStorage.removeItem("autoheal_onboarding_steps");
                      fetchOnboardingPath(userGoal, []);
                    }}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-xs text-zinc-400 hover:text-white"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingDismissed(true);
                      localStorage.setItem("autoheal_onboarding_dismissed", "true");
                    }}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {onboardingLoading ? (
                <div className="flex items-center gap-2 py-4 font-mono text-xs text-cyan-300">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span>Creating your setup...</span>
                </div>
              ) : (
                onboardingData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {onboardingData.steps.map((step, idx) => {
                      const isDone = step.status === "completed";
                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border p-4 flex flex-col justify-between transition ${
                            isDone
                              ? "border-emerald-500/40 bg-emerald-950/10"
                              : "border-white/10 bg-black/60"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between font-mono text-[10px]">
                              <span className={isDone ? "text-emerald-400" : "text-cyan-400"}>
                                STEP 0{idx + 1} // {step.priority.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleStepComplete(idx)}
                                className="underline text-zinc-400 hover:text-white"
                              >
                                {isDone ? "✓ Completed" : "Mark done"}
                              </button>
                            </div>
                            <h4 className="font-mono text-sm font-semibold text-white">
                              {step.title}
                            </h4>
                            <p className="text-xs text-zinc-400">{step.description}</p>
                            <p className="font-mono text-[11px] text-zinc-500">
                              Why: {step.why_it_matters}
                            </p>
                          </div>

                          <a
                            href={step.action_target}
                            className="mt-4 inline-flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-white hover:border-emerald-400"
                          >
                            <span>{step.action_label}</span>
                            <span>→</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* =========================================================
            SECTION 4: ASYMMETRIC FEATURE HIERARCHY (1 Dominant + 2 Secondary)
        ========================================================= */}
        <section
          data-section="Why AutoHeal Is Different — Sandbox Verification"
          className="py-24 border-b border-white/[0.08] space-y-14"
        >
          <div className="grid grid-cols-12 gap-8 items-end">
            <div className="col-span-12 lg:col-span-5 space-y-2">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                [ 03 // ARCHITECTURAL DIFFERENCE ]
              </div>
              <h2 className="font-mono text-3xl font-bold tracking-tight">
                Never merge an unverified{" "}
                <span className="text-emerald-400">hallucinated patch again.</span>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-7">
              <p className="text-[17px] text-zinc-400 leading-relaxed">
                Most AI coding tools guess a fix from a single file and hope it compiles. AutoHeal proves the fix inside an isolated container before it ever opens a Pull Request on your repository.
              </p>
            </div>
          </div>

          {/* 1 Dominant Card (8 Cols) + 2 Lighter Secondary Cards (4 Cols Stacked) */}
          <div className="grid grid-cols-12 gap-6 items-stretch">
            {/* DOMINANT FEATURE CARD */}
            <div
              data-help-label="Dominant Capability: Ephemeral Docker Sandbox Verification"
              className="col-span-12 lg:col-span-8 relative rounded-2xl border border-white/15 bg-zinc-950 p-8 flex flex-col justify-between shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
            >
              <span className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-emerald-400" />
              <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-emerald-400" />

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400">
                  ★ CORE ENGINE // EPHEMERAL DOCKER SANDBOX
                </div>
                <h3 className="font-mono text-2xl sm:text-3xl font-bold text-white">
                  Every Pull Request is battle-tested against your own test suite before you see it.
                </h3>
                <p className="text-base text-zinc-300 leading-relaxed max-w-2xl">
                  When an exception lands, AutoHeal clones the target commit into a disposable Docker container, injects a regression test specifically for that stack trace, applies the patch, and runs <code className="text-emerald-400">pytest</code> or <code className="text-emerald-400">npm run build</code>. If the tests fail, the patch is discarded silently.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/[0.08] pt-6 font-mono">
                <div>
                  <div className="text-xs text-zinc-500">SANDBOX ISOLATION</div>
                  <div className="text-lg font-bold text-white mt-0.5">Subprocess Docker</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">FALSE-POSITIVE PRs</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">0 Unverified</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">HUMAN CONTROL</div>
                  <div className="text-lg font-bold text-white mt-0.5">Co-Pilot or Auto-Merge</div>
                </div>
              </div>
            </div>

            {/* SECONDARY TIER (2 Lighter Stacked Cards) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <div
                data-help-label="Least-Privilege GitHub App Integration"
                className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 space-y-2.5"
              >
                <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  01 / LEAST-PRIVILEGE ACCESS
                </div>
                <h4 className="font-mono text-lg font-semibold text-white">
                  Scoped GitHub App Tokens
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Uses short-lived RS256 installation tokens (10-minute TTL) scoped strictly to the repositories you select. No personal access tokens stored.
                </p>
              </div>

              <div
                data-help-label="Founder ROI & Engineering Time Saved Calculator"
                className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 space-y-2.5"
              >
                <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  02 / MEASURABLE ROI
                </div>
                <h4 className="font-mono text-lg font-semibold text-white">
                  18.5 Engineering Hours Saved / Mo
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Every automated PR saves ~2 hours of context switching, log hunting, and manual branch testing—paying for Pro ($29/mo) on the very first bug.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 5: CLOSING SECTION — WHAT IT FEELS LIKE DAY TO DAY
        ========================================================= */}
        <section
          data-section="Day-to-Day Experience with AutoHeal"
          className="py-24 border-b border-white/[0.08] space-y-12"
        >
          <div className="grid grid-cols-12 gap-8 items-end">
            <div className="col-span-12 lg:col-span-5 space-y-2">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                [ 04 // DAY-TO-DAY REALITY ]
              </div>
              <h2 className="font-mono text-3xl font-bold tracking-tight">
                What shipping feels like{" "}
                <span className="text-emerald-400">when bugs fix themselves.</span>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-7">
              <p className="text-[17px] text-zinc-400 leading-relaxed">
                Instead of waking up to angry customer emails and raw stack traces, your morning starts with a clean, verified Pull Request waiting for your review.
              </p>
            </div>
          </div>

          {/* Large Product Visual + 3 Short Summary Lines */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs border-b border-white/[0.08] pb-8">
              <div className="rounded-xl border border-white/[0.06] bg-black p-4 space-y-1.5">
                <span className="text-red-400">03:14:02 AM — SENTRY WEBHOOK</span>
                <p className="text-zinc-200 font-sans text-sm">
                  Unhandled <code className="font-mono text-red-300">TypeError</code> detected in production checkout route.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-950/10 p-4 space-y-1.5">
                <span className="text-cyan-400">03:14:19 AM — DOCKER SANDBOX</span>
                <p className="text-zinc-200 font-sans text-sm">
                  Root cause isolated. Null-guard patch generated and verified against 14 unit tests.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-1.5">
                <span className="text-emerald-400">03:14:40 AM — GITHUB PR #3 OPENED</span>
                <p className="text-zinc-200 font-sans text-sm">
                  Vercel preview deployment ready. Merged with 1 click over morning coffee.
                </p>
              </div>
            </div>

            {/* Three Short Summary Lines */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
              <div>
                <h4 className="font-mono text-sm font-semibold text-white">
                  1. Zero Context-Switching
                </h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Stay focused on building features while background errors are diagnosed and patched automatically.
                </p>
              </div>
              <div>
                <h4 className="font-mono text-sm font-semibold text-white">
                  2. Full Read-Only Transparency
                </h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Every step—from stack trace to test output—is logged in a collapsible reasoning accordion.
                </p>
              </div>
              <div>
                <h4 className="font-mono text-sm font-semibold text-white">
                  3. Predictable Usage Control
                </h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Start with 5 free verified heals every month. Upgrade to Pro ($29/mo) only when your team scales.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 6: THE ASK (Final Call To Action)
        ========================================================= */}
        <section
          data-section="Final Call to Action"
          className="py-24 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8"
        >
          <div className="space-y-3 max-w-xl">
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
              [ 05 // DEPLOY IN 60 SECONDS ]
            </div>
            <h2 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to let your codebase{" "}
              <span className="text-emerald-400">heal itself tonight?</span>
            </h2>
            <p className="text-base text-zinc-400">
              Connect your GitHub repository and get your first 5 autonomous Pull Requests every month for free.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/dashboard/repositories"
              className="rounded-xl bg-emerald-500 px-7 py-4 font-mono text-sm font-semibold text-black shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:bg-emerald-400 transition"
            >
              Start Healing Free (5 PRs/mo) →
            </a>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-6 py-4 font-mono text-sm text-zinc-200 hover:border-cyan-400/50 transition"
            >
              Explore Capabilities [⌘K]
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}