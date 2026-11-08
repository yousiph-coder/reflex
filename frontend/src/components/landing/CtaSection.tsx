"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Github, LayoutDashboard, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function CtaSection() {
  const { session, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoggedIn = mounted && !isLoading && Boolean(session);

  return (
    <section className="py-20 sm:py-28 bg-zinc-50/50 dark:bg-black relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 liquid-glass-elevated p-8 sm:p-14 lg:p-16 text-center shadow-2xl relative overflow-hidden">
          {/* Subtle grid pattern inside */}
          <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

          <div className="relative max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold shadow-glow-emerald">
              <Bot className="w-4 h-4" />
              <span>Deploy Autonomous Remediation Today</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
              Stop Waking Up at 3 AM for Preventable Crashes
            </h2>

            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Connect your Sentry webhook, authenticate your GitHub App, and let AutoHeal isolate root causes and open verified PRs while you sleep.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 font-mono">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all flex items-center justify-center gap-2 group"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20 text-zinc-900 dark:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Sign In</span>
                  </Link>
                </>
              )}

              <a
                href="https://github.com/yousiph-coder/autoheal-target-demo"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20 text-zinc-900 dark:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2.5"
              >
                <Github className="w-4 h-4" />
                <span>View Target Repo</span>
              </a>
            </div>

            <p className="text-xs text-zinc-500 pt-2 font-mono">
              Free & Open Source Core • Self-Hostable on Render or Docker
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
