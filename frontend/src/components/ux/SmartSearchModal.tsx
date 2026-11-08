// src/components/ux/SmartSearchModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { SmartSearchResponse } from "@/lib/ux-ai-engine";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SmartSearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SmartSearchResponse | null>(null);

  const runSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ux-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "smart_search",
          payload: { query: searchQuery, plan: "free" },
        }),
      });
      if (!res.ok) throw new Error("Search request failed");
      const json: SmartSearchResponse = await res.json();
      setData(json);
    } catch {
      setError("Unable to reach search engine. Showing local routes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !data) {
      runSearch("How do I set up my first project?");
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/80 backdrop-blur-md pt-20 px-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-950/95 border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Corner Signature */}
        <span className="absolute top-0 left-0 h-2.5 w-2.5 border-t border-l border-emerald-400" />
        <span className="absolute top-0 right-0 h-2.5 w-2.5 border-t border-r border-emerald-400" />

        {/* Search Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4"
        >
          <span className="font-mono text-xs text-cyan-400">[SEARCH]</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Ask anything: "How do I set up my first project?" or "Where is billing?"'
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            autoFocus
          />
          {loading && (
            <span className="h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-zinc-400 hover:text-white"
          >
            ESC
          </button>
        </form>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              <span>{error}</span>
              <button
                onClick={() => runSearch(query)}
                className="font-mono underline hover:text-white"
              >
                Retry
              </button>
            </div>
          )}

          {data && (
            <>
              {/* Interpreted Intent & Direct Answer */}
              <div className="rounded-xl bg-white/[0.02] border border-cyan-400/20 p-3.5 space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-400">
                  <span>INTENT // {data.interpreted_intent}</span>
                  <span>CONFIDENCE: {data.confidence.toUpperCase()}</span>
                </div>
                <p className="text-xs text-zinc-200">{data.answer}</p>
              </div>

              {/* Ranked Results */}
              <div className="space-y-2.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  [ RANKED WORKSPACE DESTINATIONS ]
                </div>
                {data.results.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5 transition hover:border-emerald-500/40 hover:bg-white/[0.04]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] uppercase text-zinc-300">
                          {item.type}
                        </span>
                        <h4 className="font-mono text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-400">{item.description}</p>
                      <p className="font-mono text-[11px] text-cyan-400/80">
                        Why it matches: {item.reason}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-300 group-hover:bg-emerald-500 group-hover:text-black transition">
                      {item.action_label} →
                    </span>
                  </a>
                ))}
              </div>

              {/* Suggested Actions & Related Searches */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-4">
                <div>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 mb-2">
                    QUICK ACTIONS
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {data.suggested_actions.map((act, i) => (
                      <a
                        key={i}
                        href={act.target}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-xs text-zinc-200 hover:border-emerald-400"
                      >
                        ⚡ {act.label}
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 mb-2">
                    TRY ASKING
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {data.related_searches.map((rel, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setQuery(rel);
                          runSearch(rel);
                        }}
                        className="text-left font-mono text-[11px] text-zinc-400 hover:text-cyan-300 underline decoration-white/20"
                      >
                        “{rel}”
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}