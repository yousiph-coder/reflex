"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { apiClient, PAYWALL_TRIGGER_EVENT } from "@/lib/api-client";
import { useTenant } from "@/context/TenantContext";

interface UpgradeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function UpgradeModal({ isOpen: controlledIsOpen, onClose }: UpgradeModalProps) {
  const { currentOrg, billingUsage } = useTenant();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tenantPlan = (billingUsage?.plan || currentOrg?.plan || "free").toLowerCase();
  const isPro = tenantPlan === "pro";
  const isEnterprise = tenantPlan === "enterprise";

  const isVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Listen to global 402 Paywall Interceptor event
  useEffect(() => {
    const handlePaywallTrigger = () => {
      setErrorMessage(null);
      setInternalIsOpen(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PAYWALL_TRIGGER_EVENT, handlePaywallTrigger);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(PAYWALL_TRIGGER_EVENT, handlePaywallTrigger);
      }
    };
  }, []);

  const handleClose = () => {
    setInternalIsOpen(false);
    setErrorMessage(null);
    if (onClose) onClose();
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.createCheckoutSession();
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        throw new Error("Missing checkout session redirection URL");
      }
    } catch (err: any) {
      console.error("Failed to initiate checkout:", err);
      setErrorMessage(
        err?.message || "Failed to initiate Stripe Checkout session. Please try again."
      );
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg liquid-glass-elevated rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent Background */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-950 hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold tracking-wide font-mono glow-emerald">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AUTOHEAL PRO</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white dark:text-white light:text-zinc-950 font-mono">
            Unlock Unlimited Autonomous Heals
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed font-sans">
            Free tier is capped at 5 autonomous heals per month. Upgrade to Pro for unlimited AI patch generation, sandbox execution, and automated verified GitHub PRs.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="p-4 rounded-xl liquid-glass border-emerald-500/30 mb-6 flex items-baseline justify-between glow-emerald">
          <div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl font-extrabold text-white dark:text-white light:text-zinc-950 tracking-tight">$29</span>
              <span className="text-sm font-medium text-zinc-400">/ month</span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-0.5 font-mono">Cancel anytime • Zero setup fees</p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 font-mono">
            Unlimited Tier
          </span>
        </div>

        {/* Features List */}
        <div className="space-y-2.5 mb-7">
          <div className="text-xs font-semibold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 uppercase tracking-wider font-mono">
            Pro Plan Inclusions:
          </div>

          <ul className="space-y-2 text-xs text-zinc-300 dark:text-zinc-300 light:text-zinc-700 font-sans leading-relaxed">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
              <span>
                <strong className="text-white dark:text-white light:text-zinc-950 font-mono">Unlimited PRs:</strong> No monthly remediation caps or paywall blocks.
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
              <span>
                <strong className="text-white dark:text-white light:text-zinc-950 font-mono">Priority Agent Execution:</strong> Instant triage using GPT-4o & Claude 3.5.
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
              <span>
                <strong className="text-white dark:text-white light:text-zinc-950 font-mono">Multi-repo SRE:</strong> Continuous monitoring across all linked repositories.
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
              <span>
                <strong className="text-white dark:text-white light:text-zinc-950 font-mono">Docker Sandbox Verification:</strong> Full regression testing before every PR.
              </span>
            </li>
          </ul>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2 font-mono glow-crimson">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-2.5 font-mono">
          {isPro ? (
            <button
              type="button"
              disabled
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-not-allowed flex items-center justify-center gap-2 glow-emerald"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Current Plan (AutoHeal Pro)</span>
            </button>
          ) : isEnterprise ? (
            <button
              type="button"
              disabled
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-purple-500/20 text-purple-400 border border-purple-500/40 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-purple-400" />
              <span>Current Plan (Enterprise Dedicated)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/30 glow-emerald transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Redirecting to Stripe Checkout...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Upgrade to Pro — $29/mo</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="text-xs font-medium text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors disabled:opacity-50"
            >
              Close
            </button>

            <a
              href="mailto:sales@autoheal.ai?subject=AutoHeal%20Enterprise%20Tier%20Inquiry"
              className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2 flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              <span>Contact Enterprise Sales</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
