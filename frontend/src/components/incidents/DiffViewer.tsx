"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileCode2 } from "lucide-react";

interface DiffViewerProps {
  diffText: string;
  filePath?: string | null;
}

interface ParsedDiffLine {
  type: "header" | "hunk" | "add" | "del" | "normal";
  content: string;
  oldLineNumber?: number | string;
  newLineNumber?: number | string;
}

export function DiffViewer({ diffText, filePath }: DiffViewerProps) {
  const [copied, setCopied] = useState(false);

  const { lines, additionsCount, deletionsCount, detectedFilePath } = useMemo(() => {
    if (!diffText) {
      return { lines: [], additionsCount: 0, deletionsCount: 0, detectedFilePath: filePath };
    }

    const rawLines = diffText.split("\n");
    let adds = 0;
    let dels = 0;
    let foundPath = filePath || "";

    let oldLine = 0;
    let newLine = 0;

    const parsed: ParsedDiffLine[] = rawLines.map((raw) => {
      if (raw.startsWith("--- ") || raw.startsWith("+++ ")) {
        if (!foundPath && raw.startsWith("+++ b/")) {
          foundPath = raw.replace("+++ b/", "");
        }
        return { type: "header", content: raw };
      }

      if (raw.startsWith("@@")) {
        // Parse hunk header: @@ -10,9 +10,13 @@
        const match = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLine = parseInt(match[1], 10);
          newLine = parseInt(match[2], 10);
        }
        return { type: "hunk", content: raw };
      }

      if (raw.startsWith("+")) {
        adds++;
        const curNew = newLine;
        newLine++;
        return { type: "add", content: raw, newLineNumber: curNew };
      }

      if (raw.startsWith("-")) {
        dels++;
        const curOld = oldLine;
        oldLine++;
        return { type: "del", content: raw, oldLineNumber: curOld };
      }

      // Context line
      const curOld = oldLine > 0 ? oldLine++ : undefined;
      const curNew = newLine > 0 ? newLine++ : undefined;
      return {
        type: "normal",
        content: raw,
        oldLineNumber: curOld,
        newLineNumber: curNew,
      };
    });

    return {
      lines: parsed,
      additionsCount: adds,
      deletionsCount: dels,
      detectedFilePath: foundPath || filePath || "Unified Patch",
    };
  }, [diffText, filePath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!diffText) {
    return (
      <div className="p-8 text-center rounded-2xl liquid-glass border-dashed text-xs text-zinc-500 font-mono">
        No code diff available for this remediation proposal.
      </div>
    );
  }

  return (
    <div className="rounded-2xl liquid-glass overflow-hidden shadow-inner flex flex-col">
      {/* ── Diff Header Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-100 border-b border-white/10 dark:border-white/10 light:border-zinc-200 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="w-4 h-4 text-emerald-400 flex-shrink-0 glow-emerald" />
          <span className="font-mono text-zinc-200 dark:text-zinc-200 light:text-zinc-900 font-medium truncate">
            {detectedFilePath}
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 glow-emerald">
              +{additionsCount}
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 glow-crimson">
              -{deletionsCount}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200 hover:bg-white/[0.1] dark:hover:bg-white/[0.1] light:hover:bg-zinc-300 text-zinc-300 dark:text-zinc-300 light:text-zinc-800 hover:text-white dark:hover:text-white light:hover:text-zinc-950 text-xs font-mono transition-colors flex-shrink-0"
          title="Copy raw git patch"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy Diff"}</span>
        </button>
      </div>

      {/* ── Line-by-Line Unified Code Diff ─────────────────────────── */}
      <div className="overflow-x-auto text-[11px] font-mono leading-relaxed select-text py-1 bg-black/40 dark:bg-black/40 light:bg-zinc-50">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              if (line.type === "header") {
                return (
                  <tr key={idx} className="text-zinc-500 bg-white/[0.02] select-none">
                    <td className="w-10 px-2 py-0.5 text-right opacity-30 select-none border-r border-white/5"></td>
                    <td className="w-10 px-2 py-0.5 text-right opacity-30 select-none border-r border-white/5"></td>
                    <td className="px-3 py-0.5 whitespace-pre font-bold font-mono">{line.content}</td>
                  </tr>
                );
              }

              if (line.type === "hunk") {
                return (
                  <tr key={idx} className="bg-cyan-950/25 text-cyan-400 font-semibold select-none border-y border-cyan-800/30">
                    <td className="w-10 px-2 py-1 text-center opacity-40 select-none border-r border-cyan-800/30">...</td>
                    <td className="w-10 px-2 py-1 text-center opacity-40 select-none border-r border-cyan-800/30">...</td>
                    <td className="px-3 py-1 whitespace-pre font-mono">{line.content}</td>
                  </tr>
                );
              }

              if (line.type === "add") {
                return (
                  <tr key={idx} className="bg-emerald-950/35 text-emerald-300 hover:bg-emerald-950/50 transition-colors">
                    <td className="w-10 px-2 py-0.5 text-right text-emerald-600/70 select-none border-r border-emerald-900/30"></td>
                    <td className="w-10 px-2 py-0.5 text-right text-emerald-400 font-medium select-none border-r border-emerald-900/30">
                      {line.newLineNumber}
                    </td>
                    <td className="px-3 py-0.5 whitespace-pre border-l-2 border-[#05df72]">
                      <span className="select-none font-bold mr-1 text-emerald-400">+</span>
                      {line.content.substring(1)}
                    </td>
                  </tr>
                );
              }

              if (line.type === "del") {
                return (
                  <tr key={idx} className="bg-rose-950/35 text-rose-300 hover:bg-rose-950/50 transition-colors">
                    <td className="w-10 px-2 py-0.5 text-right text-rose-400 font-medium select-none border-r border-rose-900/30">
                      {line.oldLineNumber}
                    </td>
                    <td className="w-10 px-2 py-0.5 text-right text-rose-600/70 select-none border-r border-rose-900/30"></td>
                    <td className="px-3 py-0.5 whitespace-pre border-l-2 border-[#ef4444]">
                      <span className="select-none font-bold mr-1 text-rose-400">-</span>
                      {line.content.substring(1)}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={idx} className="text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:bg-white/[0.02] dark:hover:bg-white/[0.02] light:hover:bg-zinc-200/50 transition-colors">
                  <td className="w-10 px-2 py-0.5 text-right text-zinc-600 select-none border-r border-white/5">
                    {line.oldLineNumber || ""}
                  </td>
                  <td className="w-10 px-2 py-0.5 text-right text-zinc-600 select-none border-r border-white/5">
                    {line.newLineNumber || ""}
                  </td>
                  <td className="px-3 py-0.5 whitespace-pre">
                    <span className="select-none text-transparent mr-1"> </span>
                    {line.content.startsWith(" ") ? line.content.substring(1) : line.content}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
