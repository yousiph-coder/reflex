"use client";

import Link from "next/link";
import { ArrowRight, Bot, Github, Sparkles } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-20 sm:py-28 bg-[#09090b] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-[#16161b] to-[#0f0f13] p-8 sm:p-14 lg:p-16 text-center shadow-2xl relative overflow-hidden">
          {/* Subtle grid pattern inside */}
          <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

          <div className="relative max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
              <Bot className="w-4 h-4" />
              <span>Deploy Autonomous Remediation Today</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Stop Waking Up at 3 AM for Preventable Crashes
            </h2>

            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Connect your Sentry webhook, authenticate your GitHub App, and let AutoHeal isolate root causes and open verified PRs while you sleep.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/35 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Launch AutoHeal Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="https://github.com/yousiph-coder/autoheal-target-demo"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2.5"
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
