"use client";

import {
  Boxes,
  Code2,
  Cpu,
  Database,
  Github,
  Globe,
  Hash,
  Layers,
  Radio,
  Server,
  Shield,
  Terminal,
  Webhook,
} from "lucide-react";

export function IntegrationsGrid() {
  const integrations = [
    {
      name: "GitHub App",
      category: "Source Code & PRs",
      badge: "RS256 JWT Auth",
      description: "Automated PR opening, AST file context windowing, and blame analysis via Git Data API.",
      icon: Github,
      color: "text-white",
      borderColor: "hover:border-zinc-500",
    },
    {
      name: "Sentry",
      category: "Crash Telemetry",
      badge: "Inbound Webhook",
      description: "Real-time exception event triggers with HMAC-SHA256 signature verification.",
      icon: Radio,
      color: "text-rose-400",
      borderColor: "hover:border-rose-500/50",
    },
    {
      name: "Datadog",
      category: "APM & Monitors",
      badge: "Webhook Sinks",
      description: "Automated incident triggers from custom metric monitors and anomaly alerts.",
      icon: Globe,
      color: "text-purple-400",
      borderColor: "hover:border-purple-500/50",
    },
    {
      name: "Docker Engine",
      category: "Ephemeral Sandbox",
      badge: "cap_drop=ALL",
      description: "Zero-network isolated containers for executing test assertions before opening PRs.",
      icon: Boxes,
      color: "text-cyan-400",
      borderColor: "hover:border-cyan-500/50",
    },
    {
      name: "Slack",
      category: "Notifications",
      badge: "Block Kit",
      description: "Rich interactive notifications with direct buttons linking to GitHub Pull Requests.",
      icon: Hash,
      color: "text-emerald-400",
      borderColor: "hover:border-emerald-500/50",
    },
    {
      name: "Discord",
      category: "Engineering Rooms",
      badge: "Rich Embeds",
      description: "Real-time incident updates, stack summaries, and verified fix statuses.",
      icon: Webhook,
      color: "text-indigo-400",
      borderColor: "hover:border-indigo-500/50",
    },
    {
      name: "FastAPI & Python",
      category: "High-Throughput Core",
      badge: "Async ASGI",
      description: "Sub-millisecond routing, strict Pydantic schemas, and token observability.",
      icon: Terminal,
      color: "text-amber-400",
      borderColor: "hover:border-amber-500/50",
    },
    {
      name: "Next.js 15",
      category: "SaaS Dashboard",
      badge: "App Router",
      description: "Modern Zinc dark UI, real-time analytics, and incident explorer drawer.",
      icon: Layers,
      color: "text-white",
      borderColor: "hover:border-zinc-400",
    },
  ];

  return (
    <section id="integrations" className="py-20 bg-[#0c0c0f] border-t border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase mb-2 block">
            Ecosystem & Native Tooling
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Seamless Integration With Your Stack
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400">
            Plug AutoHeal into your existing observability, version control, and team alert pipelines in under two minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {integrations.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border border-zinc-800 bg-[#121216]/50 backdrop-blur-md transition-all group ${item.borderColor}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 group-hover:scale-105 transition-transform">
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {item.badge}
                  </span>
                </div>

                <span className="text-[11px] font-mono text-zinc-500 block mb-0.5">
                  {item.category}
                </span>

                <h3 className="text-base font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  {item.name}
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
