"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Github, LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Navbar() {
  const { session, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoggedIn = mounted && !isLoading && Boolean(session);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/40 dark:bg-black/60 light:bg-white/80 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform glow-emerald">
            <Bot className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white dark:text-white light:text-zinc-950 tracking-tight group-hover:text-emerald-400 transition-colors font-mono">
              AutoHeal
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 glow-emerald">
              AI SRE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-sans">
          <a href="#how-it-works" className="hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors">
            How It Works
          </a>
          <a href="#metrics" className="hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors">
            Metrics & SLA
          </a>
          <a href="#integrations" className="hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors">
            Integrations
          </a>
          <a href="#features" className="hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors">
            Architecture
          </a>
          <Link href="/dashboard/settings" className="hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors">
            Setup Guide
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          <a
            href="https://github.com/yousiph-coder/autoheal-target-demo"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 dark:border-white/10 light:border-zinc-300 bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-zinc-200 text-xs font-mono font-medium text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-all"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Target Repo</span>
          </a>

          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs border border-emerald-500/30 glow-emerald transition-all font-mono"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs border border-emerald-500/30 glow-emerald transition-all font-mono"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-950 hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-zinc-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 dark:border-white/10 light:border-zinc-200 liquid-glass-elevated px-4 pt-2 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 font-mono text-xs">
          <nav className="flex flex-col space-y-2 pt-2">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white hover:bg-white/[0.05]"
            >
              How It Works
            </a>
            <a
              href="#metrics"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white hover:bg-white/[0.05]"
            >
              Metrics & SLA
            </a>
            <a
              href="#integrations"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white hover:bg-white/[0.05]"
            >
              Integrations
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white hover:bg-white/[0.05]"
            >
              Architecture
            </a>
          </nav>

          <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-zinc-200 flex flex-col gap-2">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-center glow-emerald"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-center glow-emerald"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
