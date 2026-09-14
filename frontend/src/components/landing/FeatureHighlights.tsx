"use client";

import {
  DollarSign,
  GitMerge,
  KeyRound,
  RefreshCw,
  Scale,
  Shield,
  Sparkles,
  Users2,
} from "lucide-react";

export function FeatureHighlights() {
  const highlights = [
    {
      title: "Non-Destructive PR Workflow",
      subtitle: "Never pushes to production without human review",
      description:
        "AutoHeal creates isolated branches and formatted Pull Requests with unified diffs and Root Cause Analysis. Your engineering team retains 100% final merge authority.",
      icon: GitMerge,
      color: "text-emerald-400",
      accentBg: "bg-emerald-500/10",
      accentBorder: "border-emerald-500/20",
    },
    {
      title: "Self-Healing Retry Loop",
      subtitle: "Dynamic compiler feedback and test adaptation",
      description:
        "If a proposed patch fails sandbox assertions, compiler and test stderr are fed back into the reasoning engine (up to 2 iterations) to self-correct edge cases.",
      icon: RefreshCw,
      color: "text-purple-400",
      accentBg: "bg-purple-500/10",
      accentBorder: "border-purple-500/20",
    },
    {
      title: "Multi-Tenant API Key Governance",
      subtitle: "Scoped access, instant revocation, and audit trails",
      description:
        "Organizations manage multiple scoped API keys with prefix masking (`ah_live_...`), SHA-256 hash storage, and per-tenant incident isolation.",
      icon: KeyRound,
      color: "text-cyan-400",
      accentBg: "bg-cyan-500/10",
      accentBorder: "border-cyan-500/20",
    },
    {
      title: "Cost & Token Observability",
      subtitle: "Detailed visibility into inference economics",
      description:
        "Every remediation attempt records prompt tokens, completion tokens, execution duration, and estimated USD cost directly on your analytics dashboard.",
      icon: DollarSign,
      color: "text-amber-400",
      accentBg: "bg-amber-500/10",
      accentBorder: "border-amber-500/20",
    },
  ];

  return (
    <section id="features" className="py-20 bg-[#09090b] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase mb-2 block">
            Enterprise Architecture
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Engineered For Zero Risk
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400">
            Safety-first autonomous infrastructure designed for mission-critical production systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl border border-zinc-800/80 bg-[#121216]/60 backdrop-blur-xl hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className={`p-3 rounded-2xl border ${item.accentBg} ${item.accentBorder} ${item.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-400">{item.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span>Guaranteed Isolation</span>
                  <span className="text-emerald-400 font-semibold">Active Guardrail</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
