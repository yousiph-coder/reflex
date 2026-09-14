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
      <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215]">
        <div className="flex items-center gap-2 mb-4">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-white">Top Crash Locations</h4>
        </div>

        <div className="space-y-3">
          {topFiles.map((file, idx) => (
            <div key={file.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                <span className="text-[11px] font-mono text-zinc-500 w-4">{idx + 1}.</span>
                <span className="font-mono text-zinc-300 truncate hover:text-white" title={file.name}>
                  {file.name}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-[11px] font-mono text-zinc-300">
                {file.count} fixes
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Frequent Exception Classes ─────────────────────────── */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215]">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-semibold text-white">Frequent Exception Classes</h4>
        </div>

        <div className="space-y-3">
          {topErrors.map((err, idx) => (
            <div key={err.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                <span className="text-[11px] font-mono text-zinc-500 w-4">{idx + 1}.</span>
                <span className="font-mono text-zinc-300 truncate hover:text-white" title={err.name}>
                  {err.name}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-[11px] font-mono text-zinc-300">
                {err.count} crashes
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
