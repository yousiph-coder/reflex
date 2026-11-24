"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  ExternalLink,
  FolderGit2,
  KeyRound,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Zap,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { useTheme } from "@/context/ThemeContext";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  shortcut?: string;
  badge?: string;
  icon: React.ElementType;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { openUpgradeModal } = useTenant();
  const { theme, toggleTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: "overview",
      title: "Overview Dashboard",
      subtitle: "Real-time MTTR, Reflex volume & vitality metrics",
      shortcut: "G O",
      icon: LayoutDashboard,
      action: () => {
        router.push("/dashboard");
        onClose();
      },
    },
    {
      id: "incidents",
      title: "Incident Explorer",
      subtitle: "Browse active crashes, AST patches & verified PR logs",
      shortcut: "G I",
      icon: AlertTriangle,
      action: () => {
        router.push("/dashboard/incidents");
        onClose();
      },
    },
    {
      id: "repositories",
      title: "Monitored Repositories",
      subtitle: "Manage GitHub repositories and Sentry webhook mappings",
      shortcut: "G R",
      icon: FolderGit2,
      action: () => {
        router.push("/dashboard/repositories");
        onClose();
      },
    },
    {
      id: "billing",
      title: "Plans & Billing",
      subtitle: "View monthly Reflex quotas, ROI savings & Pro plan details",
      shortcut: "G B",
      icon: CreditCard,
      action: () => {
        router.push("/dashboard/settings/billing");
        onClose();
      },
    },
    {
      id: "settings",
      title: "API Keys & Setup",
      subtitle: "Manage webhook secrets, API tokens & Slack/Discord alerts",
      shortcut: "G S",
      icon: KeyRound,
      action: () => {
        router.push("/dashboard/settings");
        onClose();
      },
    },
    {
      id: "upgrade",
      title: "Upgrade to Reflex Pro",
      subtitle: "Unlock unlimited autonomous Reflexes, priority sandbox & SLA",
      badge: "PRO",
      icon: Zap,
      action: () => {
        onClose();
        openUpgradeModal();
      },
    },
    {
      id: "connect-repo",
      title: "Connect New Repository",
      subtitle: "Configure autonomous closed-loop healing for codebase",
      icon: Plus,
      action: () => {
        router.push("/dashboard/repositories");
        onClose();
      },
    },
    {
      id: "theme",
      title: theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
      subtitle: "Toggle between Deep Cosmic Indigo and Crisp Daylight mode",
      shortcut: "T T",
      icon: theme === "dark" ? Sun : Moon,
      action: () => {
        toggleTheme();
        onClose();
      },
    },
    {
      id: "github-repo",
      title: "Open Connected GitHub Repository",
      subtitle: "View live GitHub repository: yousiph-coder/reflex",
      icon: ExternalLink,
      action: () => {
        window.open("https://github.com/yousiph-coder/reflex", "_blank");
        onClose();
      },
    },
    {
      id: "health",
      title: "Reflex Engine Health Check",
      subtitle: "Status: ONLINE • GPT-4o AST Engine • Isolated Docker Runner",
      badge: "ACTIVE",
      icon: ShieldCheck,
      action: () => {
        router.push("/dashboard");
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0
            ? (prev - 1 + filteredCommands.length) % filteredCommands.length
            : 0
        );
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-indigo-500/35 bg-white/95 dark:bg-[#0b0d17]/95 backdrop-blur-2xl text-slate-900 dark:text-white shadow-[0_25px_70px_rgba(0,0,0,0.65)] overflow-hidden"
      >
        {/* Top Search Input Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
          <Search className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search (e.g. incidents, repos, billing, theme)..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-sans"
          />
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10"
          >
            ESC
          </button>
        </div>

        {/* Command Items List */}
        <div className="p-2 max-h-[380px] overflow-y-auto space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-10 text-center text-xs font-mono text-slate-400">
              No matching Reflex commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={cmd.action}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 border border-indigo-500/40 text-slate-950 dark:text-white shadow-sm"
                      : "border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-600 dark:text-indigo-400"
                          : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold truncate">
                          {cmd.title}
                        </span>
                        {cmd.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {cmd.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
          </div>
          <span className="text-indigo-500 dark:text-indigo-400 font-semibold">
            Reflex Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}