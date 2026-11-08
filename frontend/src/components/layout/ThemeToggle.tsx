"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      className={cn(
        "group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 select-none",
        "border border-white/10 dark:border-white/10 light:border-zinc-300",
        "bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100",
        "hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-zinc-200",
        "text-zinc-300 dark:text-zinc-300 light:text-zinc-700",
        "backdrop-blur-xl",
        className
      )}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-zinc-700 group-hover:-rotate-12 transition-transform duration-300" />
        )}
      </div>
      {showLabel && (
        <span className="text-[11px] font-mono tracking-tight uppercase">
          {isDark ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
}
