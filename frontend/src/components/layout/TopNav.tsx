"use client";

import { Bell, CheckCircle2, ChevronRight, Globe, Layers, ShieldCheck } from "lucide-react";

export function TopNav() {
  return (
    <header className="h-16 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-500 font-medium">Workspace</span>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-zinc-200 font-semibold text-xs">Demo Organization</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Environment badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
          <Globe className="w-3 h-3 text-emerald-400" />
          Production-US-East
        </div>

        {/* API connection indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          API Connected
        </div>
      </div>
    </header>
  );
}
