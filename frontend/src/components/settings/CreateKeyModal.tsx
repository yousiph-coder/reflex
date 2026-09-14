"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, KeyRound, ShieldAlert, X } from "lucide-react";
import { APIKeyCreated } from "@/lib/types";

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, days?: number) => Promise<APIKeyCreated>;
}

export function CreateKeyModal({ isOpen, onClose, onCreate }: CreateKeyModalProps) {
  const [name, setName] = useState("");
  const [days, setDays] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<APIKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await onCreate(name.trim(), days);
      setCreatedKey(res);
    } catch (err) {
      console.error("Failed to create key:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (createdKey?.raw_key) {
      navigator.clipboard.writeText(createdKey.raw_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName("");
    setDays(undefined);
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">
              {createdKey ? "API Key Generated" : "Create Organization API Key"}
            </h3>
          </div>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdKey ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex gap-3 text-xs text-amber-300/90">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p>
                Make sure to copy your API key now. You will not be able to see this secret again!
              </p>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Secret API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdKey.raw_key}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs text-emerald-400 select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-300 font-medium block mb-1">Key Label</label>
              <input
                type="text"
                required
                placeholder="e.g. Sentry Webhook Ingestion"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-300 font-medium block mb-1">Expiration (Optional)</label>
              <select
                value={days || ""}
                onChange={(e) => setDays(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Never Expires</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {isSubmitting ? "Generating..." : "Generate Key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
