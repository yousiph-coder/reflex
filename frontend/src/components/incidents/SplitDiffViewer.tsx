"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Columns2,
  Copy,
  FileCode2,
  Rows,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SplitDiffViewerProps {
  diffText: string;
  filePath?: string | null;
}

interface DiffLine {
  type: "header" | "hunk" | "add" | "del" | "normal";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function SplitDiffViewer({ diffText, filePath }: SplitDiffViewerProps) {
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");
  const [copied, setCopied] = useState(false);

  const { leftLines, rightLines, unifiedLines, additions, deletions, detectedFile } = useMemo(() => {
    if (!diffText) {
      return {
        leftLines: [],
        rightLines: [],
        unifiedLines: [],
        additions: 0,
        deletions: 0,
        detectedFile: filePath || "diff.patch",
      };
    }

    const raw = diffText.split("\n");
    let adds = 0;
    let dels = 0;
    let foundFile = filePath || "";

    let oldLine = 1;
    let newLine = 1;

    const uLines: DiffLine[] = [];
    const lLines: { lineNum?: number; text: string; isDel: boolean }[] = [];
    const rLines: { lineNum?: number; text: string; isAdd: boolean }[] = [];

    for (const line of raw) {
      if (line.startsWith("--- ") || line.startsWith("+++ ")) {
        if (!foundFile && line.startsWith("+++ b/")) {
          foundFile = line.replace("+++ b/", "");
        }
        uLines.push({ type: "header", content: line });
        continue;
      }

      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLine = parseInt(match[1], 10);
          newLine = parseInt(match[2], 10);
        }
        uLines.push({ type: "hunk", content: line });
        lLines.push({ text: line, isDel: false });
        rLines.push({ text: line, isAdd: false });
        continue;
      }

      if (line.startsWith("-")) {
        dels++;
        uLines.push({ type: "del", content: line, oldLineNumber: oldLine });
        lLines.push({ lineNum: oldLine, text: line.substring(1), isDel: true });
        oldLine++;
      } else if (line.startsWith("+")) {
        adds++;
        uLines.push({ type: "add", content: line, newLineNumber: newLine });
        rLines.push({ lineNum: newLine, text: line.substring(1), isAdd: true });
        newLine++;
      } else {
        uLines.push({
          type: "normal",
          content: line,
          oldLineNumber: oldLine,
          newLineNumber: newLine,
        });
        lLines.push({ lineNum: oldLine, text: line.startsWith(" ") ? line.substring(1) : line, isDel: false });
        rLines.push({ lineNum: newLine, text: line.startsWith(" ") ? line.substring(1) : line, isAdd: false });
        oldLine++;
        newLine++;
      }
    }

    // Align row counts for side-by-side view
    const maxRows = Math.max(lLines.length, rLines.length);
    while (lLines.length < maxRows) {
      lLines.push({ text: "", isDel: false });
    }
    while (rLines.length < maxRows) {
      rLines.push({ text: "", isAdd: false });
    }

    return {
      leftLines: lLines,
      rightLines: rLines,
      unifiedLines: uLines,
      additions: adds,
      deletions: dels,
      detectedFile: foundFile || filePath || "Unified Code Patch",
    };
  }, [diffText, filePath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!diffText) {
    return (
      <div className="p-10 rounded-2xl liquid-glass text-center font-mono text-xs text-zinc-500">
        No code diff available for this remediation attempt.
      </div>
    );
  }

  return (
    <div className="rounded-3xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
      {/* ── Diff Header Bar ────────────────────────────────────────── */}
      <div className="px-5 py-3.5 bg-zinc-100/70 dark:bg-black/70 border-b border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <FileCode2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span className="font-bold text-zinc-900 dark:text-white truncate">
            {detectedFile}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] ml-2">
            <span className="px-1.5 py-0.2 rounded font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              +{additions}
            </span>
            <span className="px-1.5 py-0.2 rounded font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              -{deletions}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                viewMode === "split"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("unified")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                viewMode === "unified"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Rows className="w-3.5 h-3.5" />
              <span>Unified</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all text-[11px]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy Diff"}</span>
          </button>
        </div>
      </div>

      {/* ── Diff Content Viewport ──────────────────────────────────── */}
      {viewMode === "split" ? (
        /* Side-by-Side Split View */
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-white/10 bg-[#000000]">
          {/* Left Column: Original Broken Code */}
          <div className="overflow-x-auto">
            <div className="px-4 py-2 bg-rose-950/20 border-b border-rose-500/20 text-rose-400 text-[11px] font-semibold flex items-center justify-between">
              <span>Original (Broken Source)</span>
              <span className="text-[10px] text-rose-500/80">-{deletions} lines</span>
            </div>
            <div className="py-2 text-[11px] leading-relaxed">
              {leftLines.map((line, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center px-2 py-0.5 transition-colors",
                    line.isDel
                      ? "bg-rose-500/15 text-rose-300 dark:text-rose-200"
                      : "text-zinc-400"
                  )}
                >
                  <span className="w-8 flex-shrink-0 text-right pr-3 select-none text-zinc-600 font-mono text-[10px]">
                    {line.lineNum ?? ""}
                  </span>
                  <pre className="font-mono overflow-x-auto whitespace-pre">
                    {line.text}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: AI-Generated Patch */}
          <div className="overflow-x-auto">
            <div className="px-4 py-2 bg-emerald-950/20 border-b border-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                AutoHeal Generated Patch
              </span>
              <span className="text-[10px] text-emerald-400/80">+{additions} lines</span>
            </div>
            <div className="py-2 text-[11px] leading-relaxed">
              {rightLines.map((line, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center px-2 py-0.5 transition-colors",
                    line.isAdd
                      ? "bg-emerald-500/15 text-emerald-300 dark:text-emerald-200"
                      : "text-zinc-400"
                  )}
                >
                  <span className="w-8 flex-shrink-0 text-right pr-3 select-none text-zinc-600 font-mono text-[10px]">
                    {line.lineNum ?? ""}
                  </span>
                  <pre className="font-mono overflow-x-auto whitespace-pre">
                    {line.text}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Unified View */
        <div className="overflow-x-auto bg-[#000000] p-3 text-[11px] leading-relaxed">
          {unifiedLines.map((line, idx) => {
            const isAdd = line.type === "add";
            const isDel = line.type === "del";
            const isHunk = line.type === "hunk";

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center px-2 py-0.5 font-mono",
                  isAdd && "bg-emerald-500/15 text-emerald-300",
                  isDel && "bg-rose-500/15 text-rose-300",
                  isHunk && "text-purple-400 font-bold bg-purple-950/20 my-1 py-1"
                )}
              >
                <span className="w-8 flex-shrink-0 text-right pr-2 text-zinc-600 select-none text-[10px]">
                  {line.oldLineNumber ?? ""}
                </span>
                <span className="w-8 flex-shrink-0 text-right pr-3 text-zinc-600 select-none text-[10px]">
                  {line.newLineNumber ?? ""}
                </span>
                <pre className="whitespace-pre overflow-x-auto">
                  {line.content}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
