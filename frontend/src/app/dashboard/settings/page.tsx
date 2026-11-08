"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sliders, KeyRound, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { APIKeyCreated, APIKeyItem } from "@/lib/types";
import { ApiKeyTable } from "@/components/settings/ApiKeyTable";
import { CreateKeyModal } from "@/components/settings/CreateKeyModal";
import { WebhookGuide } from "@/components/settings/WebhookGuide";

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<APIKeyItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const keys = await apiClient.getApiKeys();
      setApiKeys(keys);
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (name: string, days?: number): Promise<APIKeyCreated> => {
    const newKey = await apiClient.createApiKey({
      name,
      expires_in_days: days,
    });
    setApiKeys((prev) => [newKey, ...prev]);
    return newKey;
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white dark:text-white light:text-zinc-950 flex items-center gap-2.5 font-mono">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 glow-emerald">
            <Sliders className="w-5 h-5 text-emerald-400" />
          </div>
          Settings & Integrations
        </h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1.5 font-sans leading-relaxed">
          Manage Organization API Keys, inbound crash telemetry webhooks, and alert routing channels.
        </p>
      </div>

      {/* ── Settings Navigation Tabs (Apple Liquid Glass) ───────── */}
      <div className="flex border-b border-white/10 dark:border-white/10 light:border-zinc-200 font-mono text-xs">
        <Link
          href="/dashboard/settings"
          className="px-4 py-2.5 font-semibold text-emerald-400 border-b-2 border-emerald-400 flex items-center gap-2 glow-emerald"
        >
          <KeyRound className="w-3.5 h-3.5" />
          API Keys & Integrations
        </Link>
        <Link
          href="/dashboard/settings/billing"
          className="px-4 py-2.5 font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-950 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Subscription & Plans
        </Link>
      </div>

      {/* ── API Keys Table ──────────────────────────────────────── */}
      <ApiKeyTable
        apiKeys={apiKeys}
        onOpenCreate={() => setIsModalOpen(true)}
      />

      {/* ── Telemetry & Alert Integrations ───────────────────────── */}
      <WebhookGuide />

      {/* ── Create Key Modal ─────────────────────────────────────── */}
      <CreateKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateKey}
      />
    </div>
  );
}
