'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  Crown,
  Building2,
  Clock,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';

// ============================================================================
// STANDALONE REFLEX PLANS & BILLING PAGE (NO API KEY TABS MIXED IN!)
// File path in VS Code: src/app/dashboard/settings/billing/page.tsx
// ============================================================================

export default function ReflexBillingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    'monthly'
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3400);
  };

  const proPrice = billingCycle === 'monthly' ? 29 : 24;

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

      {/* 1. STANDALONE PAGE HEADER (Strictly Plans & Billing — Zero API Tabs) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Subscription Quota & Engineering ROI Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Plans & Billing
          </h1>
        </div>

        {/* Monthly / Annual Billing Switcher */}
        <div className="inline-flex p-1 rounded-2xl border bg-slate-100/80 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 font-mono text-xs">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>Annual</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* 2. CURRENT WORKSPACE QUOTA & ROI SUMMARY CARD */}
      <section className="relative z-10 rounded-3xl border p-6 sm:p-8 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 7 Columns: Current Quota Meter */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full font-mono text-xs font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                ACTIVE PLAN: STARTER FREE
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                Resets on Dec 1, 2026
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              3 of 5 free autonomous Reflexes used this month
            </h2>

            <div className="space-y-2 max-w-lg">
              <div className="w-full h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                2 free autonomous fixes remaining before quota pause.
              </p>
            </div>
          </div>

          {/* Right 5 Columns: Net Engineering ROI */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4 font-mono">
            <div className="rounded-2xl border p-4 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Time Saved</span>
                <Clock className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-sky-600 dark:text-sky-400">
                7.5 hrs
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                @ 2.5 hrs / PR
              </div>
            </div>

            <div className="rounded-2xl border p-4 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Value Created</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                $487.50
              </div>
              <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                16.8x vs $29 Pro
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 3-TIER PRICING COMPARISON GRID */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* TIER 1: STARTER (FREE) */}
        <div className="rounded-3xl border p-7 bg-white/95 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Starter</h3>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                Current Plan
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-1 font-mono">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                / month
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              For individual developers testing autonomous self-healing on side
              projects.
            </p>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm">
              {[
                '5 autonomous Reflexes / month',
                'Up to 2 GitHub repositories',
                'Standard Docker sandbox verification',
                'Automated GitHub Pull Requests',
              ].map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            disabled
            className="mt-8 w-full py-3 rounded-2xl font-mono text-xs font-semibold border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-400 cursor-default"
          >
            Current Active Tier
          </button>
        </div>

        {/* TIER 2: REFLEX PRO ($29/MO — FEATURED) */}
        <div className="relative rounded-3xl border p-7 bg-gradient-to-b from-indigo-50/80 via-white to-white dark:from-indigo-950/45 dark:via-[#0b0d17] dark:to-[#0b0d17] border-indigo-500/60 shadow-[0_12px_45px_rgba(99,102,241,0.18)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-indigo-500" />
                <h3 className="text-lg font-bold">Reflex Pro</h3>
              </div>
              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                MOST POPULAR
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-1 font-mono">
              <span className="text-4xl font-extrabold">${proPrice}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                / month
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Unlimited 24/7 autonomous healing and zero-pager peace of mind for
              production teams.
            </p>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm">
              {[
                'Unlimited autonomous Reflexes / month',
                'Unlimited connected GitHub repositories',
                'Priority isolated Docker sandbox (`pytest` & `npm test`)',
                'Slack & Discord live PR webhook embeds',
                'One-Click Merge & Instant Rollback shield',
              ].map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() =>
              triggerToast(
                `Opening Stripe / Lemon Squeezy Checkout for Reflex Pro ($${proPrice}/mo)...`
              )
            }
            className="mt-8 w-full py-3.5 rounded-2xl font-mono text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_25px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>Upgrade to Pro — ${proPrice}/mo</span>
          </button>
        </div>

        {/* TIER 3: ENTERPRISE (CUSTOM VPC) */}
        <div className="rounded-3xl border p-7 bg-white/95 dark:bg-[#0b0d17]/90 border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-violet-400" />
                <h3 className="text-lg font-bold">Enterprise</h3>
              </div>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                Custom VPC
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-1 font-mono">
              <span className="text-3xl font-extrabold">Custom</span>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dedicated self-hosted sandbox runners, SOC2 compliance, and custom
              SLAs.
            </p>

            <ul className="mt-6 space-y-3 text-xs sm:text-sm">
              {[
                'Self-hosted VPC Docker sandbox runners',
                'Custom LLM model routing (Private Bedrock/Azure)',
                'SAML SSO & role-based access control',
                'Dedicated 99.99% uptime SLA & SRE engineer',
              ].map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() =>
              triggerToast('Enterprise inquiry dispatched to Reflex founders!')
            }
            className="mt-8 w-full py-3 rounded-2xl font-mono text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Contact Founders</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

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