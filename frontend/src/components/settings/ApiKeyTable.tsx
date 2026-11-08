"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { APIKeyItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

interface ApiKeyTableProps {
  apiKeys: APIKeyItem[];
  onOpenCreate: () => void;
}

export function ApiKeyTable({ apiKeys, onOpenCreate }: ApiKeyTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPrefix = (id: string, prefix: string) => {
    navigator.clipboard.writeText(prefix);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 rounded-2xl liquid-glass space-y-4 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white dark:text-white light:text-zinc-950 flex items-center gap-2 font-mono">
            <KeyRound className="w-4 h-4 text-emerald-400 glow-emerald" />
            Active Organization API Keys
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1 font-sans leading-relaxed">
            Authenticate inbound webhook events and REST API clients via the <code className="font-mono text-zinc-300 dark:text-zinc-300 light:text-zinc-800 px-1 py-0.5 rounded bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100">X-API-Key</code> header.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs border border-emerald-500/30 glow-emerald transition-all whitespace-nowrap font-mono"
        >
          <Plus className="w-4 h-4" />
          Generate New Key
        </button>
      </div>

      <div className="rounded-xl border border-white/10 dark:border-white/10 light:border-zinc-200 overflow-hidden bg-black/40 dark:bg-black/40 light:bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 text-zinc-400 dark:text-zinc-400 light:text-zinc-500 border-b border-white/10 dark:border-white/10 light:border-zinc-200 font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 font-medium">Label</th>
              <th className="py-3 px-4 font-medium">Key Prefix</th>
              <th className="py-3 px-4 font-medium">Permission Scopes</th>
              <th className="py-3 px-4 font-medium">Last Used</th>
              <th className="py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] dark:divide-white/[0.06] light:divide-zinc-200">
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-zinc-500 font-mono text-xs">
                  No API keys generated yet.
                </td>
              </tr>
            ) : (
              apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-white/[0.03] dark:hover:bg-white/[0.03] light:hover:bg-zinc-100/70 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white dark:text-white light:text-zinc-950 font-mono">{key.name}</td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
                    <div className="flex items-center gap-2">
                      <span>{key.key_prefix}...</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPrefix(key.id, key.key_prefix)}
                        className="p-1 rounded-md bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200 hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors"
                        title="Copy key prefix"
                      >
                        {copiedId === key.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                      {(key.scopes || ["webhooks:write", "incidents:read"]).map((scope) => (
                        <span
                          key={scope}
                          className="px-2 py-0.5 rounded-md bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-zinc-300 dark:text-zinc-300 light:text-zinc-700"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-400 dark:text-zinc-400 light:text-zinc-500 text-[11px]">
                    {key.last_used_at ? formatRelativeTime(key.last_used_at) : "Never"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono glow-emerald">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
