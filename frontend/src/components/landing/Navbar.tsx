"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Github, Menu, ShieldCheck, Sparkles, X } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-[#09090b]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400/60 transition-colors shadow-lg shadow-emerald-500/10">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight group-hover:text-emerald-300 transition-colors">
              AutoHeal
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              AI SRE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#metrics" className="hover:text-white transition-colors">
            Metrics & SLA
          </a>
          <a href="#integrations" className="hover:text-white transition-colors">
            Integrations
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Architecture
          </a>
          <Link href="/dashboard/settings" className="hover:text-white transition-colors">
            Setup Guide
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://github.com/yousiph-coder/autoheal-target-demo"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Target Repo</span>
          </a>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
          >
            <span>Live Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-[#0c0c0e] px-4 pt-2 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 text-sm text-zinc-300 font-medium pt-2">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-emerald-400 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#metrics"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-emerald-400 transition-colors"
            >
              Metrics & SLA
            </a>
            <a
              href="#integrations"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-emerald-400 transition-colors"
            >
              Integrations
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-emerald-400 transition-colors"
            >
              Architecture
            </a>
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-emerald-400 transition-colors"
            >
              Setup Guide
            </Link>
          </nav>

          <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors"
            >
              <span>Open Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com/yousiph-coder/autoheal-target-demo"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-medium"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Target Repo</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
