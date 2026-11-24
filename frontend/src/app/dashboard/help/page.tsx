"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  Command,
  ExternalLink,
  FolderGit2,
  GitPullRequest,
  HelpCircle,
  Keyboard,
  Mail,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react";

const FAQS = [
  {
    q: "Does Reflex ever push code directly to my main branch?",
    a: "Never. Reflex always creates an isolated fix branch (e.g. reflex/fix-incident-745a7b31), verifies the patch against your unit tests inside an ephemeral Docker container, and opens a GitHub Pull Request for your one-click review and merge.",
  },
  {
    q: "How is my source code kept secure during sandbox verification?",
    a: "Each incident spins up a fresh, network-isolated Docker container (--network=none) that runs your test suite (pytest or npm test) and is permanently destroyed immediately after verification completes.",
  },
  {
    q: "What happens when I reach the 5/5 Free monthly Reflex limit?",
    a: "Your existing PRs and telemetry remain fully accessible. New autonomous remediations pause until the 1st of next month, or you can upgrade to Reflex Pro ($29/mo) for unlimited Reflexes.",
  },
  {
    q: "Can I undo a patch if I change my mind after merging?",
    a: "Yes. Every merged Reflex PR includes our One-Click Instant Rollback Shield inside the Incident Inspector so you can cleanly revert the commit in seconds.",
  },
];

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], label: "Open Command Search Palette" },
  { keys: ["Esc"], label: "Close any modal or dropdown" },
  { keys: ["G", "O"], label: "Jump to Overview Dashboard" },
  { keys: ["G", "I"], label: "Jump to Incident Explorer" },
  { keys: ["G", "R"], label: "Jump to Connected Repositories" },
  { keys: ["T", "T"], label: "Toggle Dark / Light Theme" },
];

export default function ReflexHelpPage() {
  const [openFaq, setOpenFaq] = useState<number>(0);

  return (
    <div className="relative w-full max-w-5xl mx-auto text-slate-900 dark:text-white space-y-10 pb-16">
      {/* Ambient Background Spotlight Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)",
          }}
        />
      </div>

      {/* 1. PAGE HEADER */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documentation, Keyboard Shortcuts & Support</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Help & Shortcuts
          </h1>
        </div>

        <a
          href="mailto:founders@reflex.dev?subject=Reflex%20Support%20Request"
          className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.35)] flex items-center gap-2 transition-all"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Contact Support</span>
        </a>
      </div>

      {/* 2. 3-STEP QUICKSTART GUIDE */}
      <section className="relative z-10 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold tracking-tight">
            3-Step Autonomous Quickstart
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              title: "Connect GitHub App",
              desc: "Install the Reflex GitHub App on your target repository so it can open verified fix branches.",
              icon: FolderGit2,
              href: "/dashboard/repositories",
              cta: "Open Repositories →",
            },
            {
              step: "02",
              title: "Wire Sentry Webhook",
              desc: "Copy your unique tenant ingestion URL from API Keys & Setup into your Sentry integration.",
              icon: Webhook,
              href: "/dashboard/settings",
              cta: "Get Webhook URL →",
            },
            {
              step: "03",
              title: "Merge Verified PRs",
              desc: "When a production crash hits, inspect the Docker-verified diff and merge in one click.",
              icon: GitPullRequest,
              href: "/dashboard/incidents",
              cta: "Inspect Incidents →",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.step}
                className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      STEP {card.step}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <Link
                  href={card.href}
                  className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {card.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. KEYBOARD SHORTCUTS */}
      <section className="relative z-10 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Keyboard className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold tracking-tight">
            Keyboard Shortcuts
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SHORTCUTS.map((sc, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-[#0b0d17]/90 px-4 py-3.5 flex items-center justify-between gap-3"
            >
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {sc.label}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {sc.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 flex items-center gap-0.5"
                  >
                    {k === "Ctrl" && <Command className="w-2.5 h-2.5" />}
                    <span>{k}</span>
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FREQUENTLY ASKED QUESTIONS */}
      <section className="relative z-10 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0b0d17]/90 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-indigo-500" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-white/5 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. FOUNDER DIRECT SUPPORT CARD */}
      <section className="relative z-10 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-50 via-white to-violet-50 dark:from-indigo-950/35 dark:via-[#0b0d17] dark:to-violet-950/25 p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
              Need custom VPC setup or direct SRE help?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Talk directly with the Reflex engineering founders — average reply under 2 hours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <a
            href="https://github.com/yousiph-coder/reflex"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-indigo-500/40 text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <span>GitHub Repo</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="mailto:founders@reflex.dev"
            className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 font-semibold"
          >
            founders@reflex.dev
          </a>
        </div>
      </section>
    </div>
  );
}