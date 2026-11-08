"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  KeyRound,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";

export function UserNavMenu() {
  const { user, logout, isAuthenticated } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isAuthenticated && !user) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs glow-emerald transition-colors font-mono"
      >
        Sign In
      </Link>
    );
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SRE";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition-all focus:outline-none"
        aria-label="User account menu"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px] glow-emerald">
          <div className="w-full h-full rounded-full bg-black dark:bg-black light:bg-zinc-900 flex items-center justify-center text-xs font-bold text-white uppercase font-mono">
            {initials}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl liquid-glass-elevated z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 border-b border-white/10 dark:border-white/10 light:border-zinc-200">
            <div className="font-semibold text-xs text-white dark:text-white light:text-zinc-900 truncate font-sans">
              {user?.name || "AutoHeal Engineer"}
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-500 truncate mt-0.5 font-mono">
              {user?.email || "engineer@autoheal.dev"}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono glow-emerald">
              <Shield className="w-3 h-3" />
              {user?.role || "Site Reliability Engineer"}
            </div>
          </div>

          <div className="p-1.5 space-y-0.5 text-xs">
            <Link
              href="/dashboard/settings/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white dark:hover:text-white light:hover:text-zinc-950 hover:bg-white/[0.06] dark:hover:bg-white/[0.06] light:hover:bg-zinc-100 transition-colors font-sans"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subscription & Billing</span>
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white dark:hover:text-white light:hover:text-zinc-950 hover:bg-white/[0.06] dark:hover:bg-white/[0.06] light:hover:bg-zinc-100 transition-colors font-sans"
            >
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              <span>API Keys & Permissions</span>
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white dark:hover:text-white light:hover:text-zinc-950 hover:bg-white/[0.06] dark:hover:bg-white/[0.06] light:hover:bg-zinc-100 transition-colors font-sans"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>Settings</span>
            </Link>
          </div>

          <div className="p-1.5 border-t border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/20 dark:bg-black/40 light:bg-zinc-50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left font-sans"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
