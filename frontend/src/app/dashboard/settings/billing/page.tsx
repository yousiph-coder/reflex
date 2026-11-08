"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const { currentOrg, billingUsage, refreshUsage } = useTenant();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toLowerCase();
  const isFree = activePlan === "free" || activePlan === "starter";
  const isPro = activePlan === "pro";
  const isEnterprise = activePlan === "enterprise";

  const healsUsed = billingUsage?.heals_used ?? 0;
  const maxLimit = billingUsage?.limit ?? 5;
  const usagePct = Math.min(100, Math.round((healsUsed / maxLimit) * 100));

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const handleUpgradeToPro = async () => {
    setIsUpgrading(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.createCheckoutSession();
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        throw new Error("Missing Stripe Checkout redirection URL.");
      }
    } catch (err: any) {
      console.error("Failed to initiate checkout session:", err);
      setErrorMessage(
        err?.message || "Failed to launch Stripe Checkout. Please verify API connection or try again."
      );
      setIsUpgrading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl pb-16 select-none">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white dark:text-white light:text-zinc-950 flex items-center gap-2.5 font-mono">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 glow-emerald">
            <CreditCard className="w-5 h-5 text-emerald-400" />
          </div>
          Subscription & Plans
        </h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1.5 font-sans leading-relaxed">
          Manage your organization subscription, view autonomous heal usage, or unlock unlimited agent remediations.
        </p>
      </div>

      {/* ── Settings Navigation Tabs (Apple Liquid Glass) ───────── */}
      <div className="flex border-b border-white/10 dark:border-white/10 light:border-zinc-200 font-mono text-xs">
        <Link
          href="/dashboard/settings"
          className="px-4 py-2.5 font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-950 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <KeyRound className="w-3.5 h-3.5" />
          API Keys & Integrations
        </Link>
        <Link
          href="/dashboard/settings/billing"
          className="px-4 py-2.5 font-semibold text-emerald-400 border-b-2 border-emerald-400 flex items-center gap-2 glow-emerald"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Subscription & Plans
        </Link>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-2xl liquid-glass border-rose-500/30 text-rose-300 text-xs flex items-center justify-between glow-crimson font-mono">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Current Plan & Usage Summary Box (Liquid Glass Elevated) */}
      <div className="rounded-2xl liquid-glass-elevated p-6 sm:p-7 relative overflow-hidden transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10 dark:border-white/10 light:border-zinc-200">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono">
                Active Subscription
              </span>
              {isEnterprise ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  Enterprise Dedicated
                </span>
              ) : isPro ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 glow-emerald">
                  AutoHeal Pro
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 text-zinc-400 border border-white/10 dark:border-white/10 light:border-zinc-200">
                  Free Tier
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-zinc-700 font-medium mt-1 font-sans">
              Organization: <span className="text-white dark:text-white light:text-zinc-950 font-semibold">{currentOrg?.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFree && (
              <button
                type="button"
                onClick={handleUpgradeToPro}
                disabled={isUpgrading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30 glow-emerald transition-all flex items-center gap-1.5 font-mono"
              >
                {isUpgrading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                )}
                <span>Upgrade to Pro ($29/mo)</span>
              </button>
            )}
          </div>
        </div>

        {/* Usage Progress / Plan Details */}
        <div className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <span className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono">Remediation Limit</span>
            {isPro || isEnterprise ? (
              <div className="text-base font-semibold text-emerald-400 flex items-center gap-1.5 font-mono glow-emerald">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Unlimited Remediations</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300 dark:text-zinc-300 light:text-zinc-700">{healsUsed} used</span>
                  <span className="text-zinc-500 dark:text-zinc-500 light:text-zinc-400">{maxLimit} max / month</span>
                </div>
                <div className="w-full bg-white/[0.08] dark:bg-white/[0.08] light:bg-zinc-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      healsUsed >= maxLimit
                        ? "bg-rose-500 glow-crimson"
                        : healsUsed >= 4
                        ? "bg-amber-400 glow-amber"
                        : "bg-emerald-500 glow-emerald"
                    )}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono">Agent Concurrency</span>
            <div className="text-base font-semibold text-white dark:text-white light:text-zinc-950 font-mono">
              {isEnterprise ? "Dedicated VPC Clusters" : isPro ? "High-Priority GPT-4o" : "Standard Pool"}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500 light:text-zinc-400 font-mono">Docker isolated sandbox runner</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono">Billing Cycle</span>
            <div className="text-base font-semibold text-white dark:text-white light:text-zinc-950 font-mono">
              {isEnterprise ? "Annual Contract" : isPro ? "$29 / month via Stripe" : "Free Forever"}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500 light:text-zinc-400 font-mono">Monthly reset on 1st of each month</p>
          </div>
        </div>
      </div>

      {/* ── Plans Grid (Production Pricing Cards) ───────────────── */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white dark:text-white light:text-zinc-950 tracking-tight font-mono">
            Available Subscription Plans
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1 font-sans leading-relaxed">
            Select the plan that fits your continuous delivery and autonomous SRE requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* ── Card 1: Free Plan ─────────────────────────────────── */}
          <div className={cn(
            "rounded-2xl liquid-glass p-6 flex flex-col justify-between transition-all",
            isFree && "border-white/20 dark:border-white/20 light:border-zinc-400 shadow-md"
          )}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-mono">
                  Starter / Free
                </span>
                {isFree && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.08] dark:bg-white/[0.08] light:bg-zinc-200 text-zinc-300 dark:text-zinc-300 light:text-zinc-800 border border-white/10 dark:border-white/10 light:border-zinc-300">
                    Active
                  </span>
                )}
              </div>

              <div className="mt-4 mb-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white dark:text-white light:text-zinc-950 tracking-tight font-mono">$0</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-mono">/ month</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-6 leading-relaxed font-sans">
                For developers experimenting with autonomous error healing on personal repos.
              </p>

              <div className="border-t border-white/10 dark:border-white/10 light:border-zinc-200 pt-4 space-y-3 mb-8">
                <div className="text-xs font-semibold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 uppercase tracking-wider font-mono">
                  Plan Inclusions:
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span><strong className="text-white dark:text-white light:text-zinc-950 font-mono">5 Autonomous Heals</strong> / month</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span>1 Connected GitHub Repository</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span>Standard GPT-4o Patch Generator</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span>Automated PR Creation & Diffs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span>Community Discord & GitHub Support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Free Plan CTA */}
            <div>
              {isFree ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200 text-zinc-400 dark:text-zinc-400 light:text-zinc-600 border border-white/10 dark:border-white/10 light:border-zinc-300 cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Current Plan</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold bg-white/[0.02] text-zinc-600 border border-white/5 cursor-not-allowed"
                >
                  Included in Your Tier
                </button>
              )}
            </div>
          </div>

          {/* ── Card 2: Pro Plan ($29/mo) ─────────────────────────── */}
          <div className={cn(
            "rounded-2xl liquid-glass p-6 flex flex-col justify-between transition-all relative overflow-hidden border-emerald-500/40 glow-emerald",
            isPro && "border-emerald-500/60 ring-1 ring-emerald-500/40"
          )}>
            {/* Top Accent Highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-[#05df72] to-teal-400" />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                  AutoHeal Pro
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono glow-emerald">
                  MOST POPULAR
                </span>
              </div>

              <div className="mt-4 mb-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white dark:text-white light:text-zinc-950 tracking-tight font-mono">$29</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-mono">/ month</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-6 leading-relaxed font-sans">
                Autonomous SRE engineer for fast-moving startups and continuous production services.
              </p>

              <div className="border-t border-white/10 dark:border-white/10 light:border-zinc-200 pt-4 space-y-3 mb-8">
                <div className="text-xs font-semibold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 uppercase tracking-wider font-mono">
                  Everything in Free, plus:
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-200 dark:text-zinc-200 light:text-zinc-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span><strong className="text-white dark:text-white light:text-zinc-950 font-mono">Unlimited Autonomous Heals & PRs</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span><strong className="text-white dark:text-white light:text-zinc-950 font-mono">Unlimited Connected Repositories</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span><strong className="text-white dark:text-white light:text-zinc-950 font-mono">Priority Agent Execution:</strong> GPT-4o & Claude 3.5</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span><strong className="text-white dark:text-white light:text-zinc-950 font-mono">Docker Sandbox Verification</strong> before PRs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span><strong className="text-white dark:text-white light:text-zinc-950 font-mono">Automated Root Cause Analysis (RCA)</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span>Real-Time Crash Telemetry Interceptors</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
                    <span>Priority Email & Slack Support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Pro Plan CTA */}
            <div>
              {isPro ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-not-allowed flex items-center justify-center gap-1.5 glow-emerald"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Current Plan</span>
                </button>
              ) : isFree ? (
                <button
                  type="button"
                  onClick={handleUpgradeToPro}
                  disabled={isUpgrading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg border border-emerald-400/30 glow-emerald transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Redirecting to Stripe...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>Upgrade to Pro ($29/mo)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold bg-white/[0.02] text-zinc-600 border border-white/5 cursor-not-allowed"
                >
                  Included in Enterprise
                </button>
              )}
            </div>
          </div>

          {/* ── Card 3: Enterprise Plan ───────────────────────────── */}
          <div className={cn(
            "rounded-2xl liquid-glass p-6 flex flex-col justify-between transition-all",
            isEnterprise && "border-purple-500/60 ring-1 ring-purple-500/40 shadow-xl"
          )}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 font-mono">
                  Enterprise
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  VPC ISOLATION
                </span>
              </div>

              <div className="mt-4 mb-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white dark:text-white light:text-zinc-950 tracking-tight font-mono">Custom</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-6 leading-relaxed font-sans">
                For organizations with strict compliance, on-prem VPC infrastructure, and custom SLAs.
              </p>

              <div className="border-t border-white/10 dark:border-white/10 light:border-zinc-200 pt-4 space-y-3 mb-8">
                <div className="text-xs font-semibold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 uppercase tracking-wider font-mono">
                  Enterprise Capabilities:
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span><strong className="text-white dark:text-white light:text-zinc-950 font-mono">Unlimited Everything</strong> (Seats, Repos & Heals)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span><strong className="text-white dark:text-white light:text-zinc-950 font-mono">Self-Hosted / VPC Docker Runners</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Custom LLM Fine-Tuning & Private Models</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>99.99% Uptime SLA & 15m Incident Response</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>SOC2 Type II, HIPAA & ISO 27001 Package</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Dedicated Solutions Architect & 24/7 Slack Channel</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Enterprise CTA */}
            <div>
              {isEnterprise ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/40 cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>Current Plan</span>
                </button>
              ) : (
                <a
                  href="mailto:sales@autoheal.ai?subject=AutoHeal%20Enterprise%20Plan%20Inquiry"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold text-zinc-200 dark:text-zinc-200 light:text-zinc-800 bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200 hover:bg-white/[0.1] border border-white/10 dark:border-white/10 light:border-zinc-300 transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>Contact Sales</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Security & Compliance Assurance (Liquid Glass) ────────── */}
      <div className="rounded-2xl liquid-glass p-6 space-y-4">
        <div className="flex items-center gap-2 text-white dark:text-white light:text-zinc-950 font-semibold text-sm font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 glow-emerald" />
          <span>Enterprise-Grade Security & Privacy Commitments</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-sans leading-relaxed">
          <div className="space-y-1">
            <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-900 font-medium font-mono">Zero Code Retention</span>
            <p>Your source code is never used to train foundational AI models. Patches execute in ephemeral containers.</p>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-900 font-medium font-mono">Encrypted In Flight & At Rest</span>
            <p>All telemetry webhooks and GitHub access tokens use AES-256 encryption with automated rotation.</p>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-900 font-medium font-mono">Granular App Scopes</span>
            <p>The AutoHeal GitHub App only requires minimal read/write repo contents and pull request permissions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
