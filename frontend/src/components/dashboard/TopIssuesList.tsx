import { MetricItem } from "@/lib/types";
import { AlertCircle, FileCode } from "lucide-react";

interface TopIssuesListProps {
  topFiles: MetricItem[];
  topErrors: MetricItem[];
}

export function TopIssuesList({ topFiles, topErrors }: TopIssuesListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── Top Crash Locations ────────────────────────────────── */}
      <div className="p-6 rounded-2xl liquid-glass">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 glow-emerald">
            <FileCode className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-white dark:text-white light:text-zinc-950 font-mono tracking-tight">
            Top Crash Locations
          </h4>
        </div>

        <div className="space-y-3">
          {topFiles.length === 0 ? (
            <p className="text-xs text-zinc-500 font-mono py-2">No crash files recorded</p>
          ) : (
            topFiles.map((file, idx) => (
              <div key={file.name} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500 light:text-zinc-400 w-4">
                    {idx + 1}.
                  </span>
                  <span
                    className="font-mono text-zinc-300 dark:text-zinc-300 light:text-zinc-700 truncate hover:text-emerald-400 dark:hover:text-emerald-400 light:hover:text-emerald-600 transition-colors"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-[11px] font-mono text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-semibold">
                  {file.count} fixes
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Frequent Exception Classes ─────────────────────────── */}
      <div className="p-6 rounded-2xl liquid-glass">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <AlertCircle className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-white dark:text-white light:text-zinc-950 font-mono tracking-tight">
            Frequent Exception Classes
          </h4>
        </div>

        <div className="space-y-3">
          {topErrors.length === 0 ? (
            <p className="text-xs text-zinc-500 font-mono py-2">No exception classes recorded</p>
          ) : (
            topErrors.map((err, idx) => (
              <div key={err.name} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500 light:text-zinc-400 w-4">
                    {idx + 1}.
                  </span>
                  <span
                    className="font-mono text-zinc-300 dark:text-zinc-300 light:text-zinc-700 truncate hover:text-purple-400 dark:hover:text-purple-400 light:hover:text-purple-600 transition-colors"
                    title={err.name}
                  >
                    {err.name}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-[11px] font-mono text-purple-400 dark:text-purple-400 light:text-purple-600 font-semibold">
                  {err.count} crashes
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
