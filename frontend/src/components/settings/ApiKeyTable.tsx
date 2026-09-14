"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { APIKeyItem } from "@/lib/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";

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
    <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            Active Organization API Keys
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Authenticate inbound webhook events and REST API clients via the <code className="font-mono text-zinc-300">X-API-Key</code> header.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Generate New Key
        </button>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-4 font-medium">Label</th>
              <th className="py-2.5 px-4 font-medium">Key Prefix</th>
              <th className="py-2.5 px-4 font-medium">Permission Scopes</th>
              <th className="py-2.5 px-4 font-medium">Last Used</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
                  No API keys generated yet.
                </td>
              </tr>
            ) : (
              apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-zinc-900/40">
                  <td className="py-3 px-4 font-semibold text-white">{key.name}</td>
                  <td className="py-3 px-4 font-mono text-zinc-300">
                    <div className="flex items-center gap-2">
                      <span>{key.key_prefix}...</span>
                      <button
                        onClick={() => handleCopyPrefix(key.id, key.key_prefix)}
                        className="text-zinc-500 hover:text-white"
                        title="Copy Key Prefix"
                      >
                        {copiedId === key.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 text-[10px] font-mono text-zinc-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-400">
                    {key.last_used_at ? formatRelativeTime(key.last_used_at) : "Never"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        key.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-500 border-zinc-700"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${key.is_active ? "bg-emerald-400" : "bg-zinc-500"}`} />
                      {key.is_active ? "Active" : "Revoked"}
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
