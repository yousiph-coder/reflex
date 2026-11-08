"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Github,
  GitPullRequest,
  LayoutDashboard,
  Lock,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { TerminalMockup } from "./TerminalMockup";

export function HeroSection() {
  const { session, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoggedIn = mounted && !isLoading && Boolean(session);

  return (
    <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden bg-grid-pattern">
      {/* ── Ambient Radial Glows ─────────────────────────────────── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[450px] h-[250px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* ── Top Pill Announcement ────────────────────────────────── */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono mb-8 shadow-glow-emerald backdrop-blur-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-glow-emerald"></span>
          </span>
          <span className="text-zinc-700 dark:text-zinc-200">Autonomous SRE Engine v1.0 Live</span>
          <span className="text-emerald-500/60">•</span>
          <span className="text-emerald-600 dark:text-emerald-300 font-semibold">Production Ready</span>
        </div>

        {/* ── Main Headline ────────────────────────────────────────── */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white max-w-4xl leading-[1.12]">
          Autonomous SRE &{" "}
          <span className="text-gradient-emerald">
            Incident Remediation
          </span>{" "}
          in Seconds
        </h1>

        {/* ── Subheadline ─────────────────────────────────────────── */}
        <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
          AutoHeal detects unhandled crashes, isolates root causes, validates fixes in ephemeral sandboxes, and opens verified Pull Requests automatically.
        </p>

        {/* ── Dual Call-to-Actions ────────────────────────────────── */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto font-mono">
          {/* Primary CTA: Install GitHub App */}
          <Link
            href={isLoggedIn ? "/dashboard/settings" : "/login?from=/dashboard/settings"}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all flex items-center justify-center gap-2.5 group"
          >
            <Github className="w-4 h-4" />
            <span>Install GitHub App</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Conditional Auth / Dashboard CTA */}
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold text-sm backdrop-blur-xl transition-all flex items-center justify-center gap-2 shadow-glow-emerald"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20 text-zinc-900 dark:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2.5 shadow-md"
            >
              <LogIn className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </Link>
          )}
        </div>

        {/* ── Trust Highlights ────────────────────────────────────── */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Zero configuration required</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Docker sandbox verified</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>100% PII & secrets redacted</span>
          </div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Non-destructive PR workflow</span>
          </div>
        </div>

        {/* ── Terminal Mockup Flow ─────────────────────────────────── */}
        <div className="mt-16 w-full">
          <TerminalMockup />
        </div>
      </div>
    </section>
  );
}
