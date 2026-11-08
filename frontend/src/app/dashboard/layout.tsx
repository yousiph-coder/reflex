"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopNav } from "@/components/layout/TopNav";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { Loader2, Sparkles } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, sessionToken, isAuthenticated, isLoading } = useTenant();
  const hasSession = Boolean(session || sessionToken || isAuthenticated);

  useEffect(() => {
    // If loading has completed and no active session exists: redirect to /login
    if (!isLoading && !hasSession) {
      const from = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?from=${from}`);
    }
  }, [isLoading, hasSession, pathname, router]);

  // ── 1. If session hydration is pending: render spinner with Apple Glass aesthetics ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center gap-4 select-none transition-colors duration-200">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl liquid-glass flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-glow-emerald animate-pulse">
            <Sparkles className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
          </div>
          <Loader2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white font-mono">
            AutoHeal AI
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            Verifying SRE tenant session...
          </p>
        </div>
      </div>
    );
  }

  // ── 2. If session resolved to null: prevent rendering protected content while redirecting ──
  if (!hasSession) {
    return null;
  }

  // ── 3. Session verified: render protected dashboard shell with Liquid Glass & OLED surfaces ──
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopNav />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Global Paywall / Upgrade Modal */}
      <UpgradeModal />
    </div>
  );
}
