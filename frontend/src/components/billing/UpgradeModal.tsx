"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Crown,
  Loader2,
  Mail,
  X,
  Zap,
} from "lucide-react";
import { PAYWALL_TRIGGER_EVENT } from "@/lib/api-client";

export function UpgradeModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Listen to global paywall trigger from TopNav, CommandPalette, and HTTP 402 responses
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      setCustomMessage(customEvent.detail?.message || null);
      setIsOpen(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener(PAYWALL_TRIGGER_EVENT, handleTrigger);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener(PAYWALL_TRIGGER_EVENT, handleTrigger);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
    setCustomMessage(null);
  };

  const handleUpgradeClick = () => {
    setIsRedirecting(true);
    const checkoutUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    setTimeout(() => {
      setIsRedirecting(false);
      handleClose();
      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank");
      } else {
        router.push("/dashboard/settings/billing");
      }
    }, 500);
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-indigo-500/40 bg-white/95 dark:bg-[#0b0d17]/95 backdrop-blur-2xl text-slate-900 dark:text-white p-7 sm:p-8 shadow-[0_25px_80px_rgba(99,102,241,0.28)] overflow-hidden space-y-6"
      >
        {/* Top Ambient Indigo Spotlight */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-30"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #8b5cf6 60%, transparent 100%)",
          }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" />
            <span>REFLEX PRO</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white font-mono leading-snug">
            Unlock Unlimited Autonomous Reflexes
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {customMessage ||
              "Free tier is capped at 5 autonomous Reflexes per month. Upgrade to Pro for unlimited AI patch generation, priority Docker sandbox execution, and verified GitHub PRs."}
          </p>
        </div>

        {/* Price Box */}
        <div className="relative z-10 rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.06] dark:bg-white/[0.03] p-4 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl font-extrabold text-slate-950 dark:text-white">
                $29
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                / month
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              Cancel anytime • Zero setup fees
            </p>
          </div>

          <span className="px-3 py-1 rounded-xl font-mono text-xs font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
            Unlimited Tier
          </span>
        </div>

        {/* Features List */}
        <div className="space-y-3 relative z-10">
          <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-400">
            PRO PLAN INCLUSIONS:
          </div>

          <ul className="space-y-2.5 text-xs">
            {[
              {
                bold: "Unlimited PRs:",
                text: "No monthly remediation caps or paywall blocks.",
              },
              {
                bold: "Priority Agent Execution:",
                text: "Instant AST triage using GPT-4o & Claude 3.5.",
              },
              {
                bold: "Multi-repo SRE:",
                text: "Continuous monitoring across all linked repositories.",
              },
              {
                bold: "Docker Sandbox Verification:",
                text: "Full regression testing before every PR.",
              },
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">
                    {item.bold}
                  </strong>{" "}
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Primary Upgrade CTA */}
        <div className="space-y-3 pt-1 relative z-10">
          <button
            type="button"
            onClick={handleUpgradeClick}
            disabled={isRedirecting}
            className="w-full py-3.5 px-5 rounded-2xl font-mono text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_6px_30px_rgba(99,102,241,0.45)] flex items-center justify-center gap-2 transition-all"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Opening Pro Checkout...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Upgrade to Pro — $29/mo</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs font-mono pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              Close
            </button>

            <a
              href="mailto:founders@reflex.dev?subject=Reflex%20Enterprise%20Inquiry"
              className="text-indigo-500 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Enterprise Sales</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}