"use client";

import Link from "next/link";
import { Bot, Github, Heart, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-glow-emerald">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">AutoHeal AI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                v1.0
              </span>
            </Link>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm leading-relaxed">
              Autonomous SRE & incident remediation AI agent. Detects unhandled exceptions, synthesizes AST patches, verifies in ephemeral sandboxes, and opens automated pull requests.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 pt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-glow-emerald"></span>
              </span>
              <span>All Autonomous Pipelines Operational</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-300 font-mono">
              Product & App
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Overview Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/incidents" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Incident Explorer & PRs
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  API Keys & Integrations
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-300 font-mono">
              Resources & Repos
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                <a
                  href="https://github.com/yousiph-coder/autoheal-target-demo"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>Target Demo Repo</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/yousiph-coder/autoheal-target-demo/pull/1"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Sample PR #1 (AutoHeal)
                </a>
              </li>
              <li>
                <Link href="/dashboard/settings" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Deployment Guide
                </Link>
              </li>
              <li>
                <span className="text-zinc-400 dark:text-zinc-600 font-mono text-[11px]">MIT License • 2026</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-mono">
          <p>© 2026 AutoHeal AI. Closed-loop autonomous reliability engineering.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              Built for production SRE teams
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
