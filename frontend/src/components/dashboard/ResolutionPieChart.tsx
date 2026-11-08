"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "@/context/ThemeContext";

interface ResolutionPieChartProps {
  resolved: number;
  failed: number;
  pending: number;
  remediating: number;
  successRate?: number;
}

export function ResolutionPieChart({
  resolved = 0,
  failed = 0,
  pending = 0,
  remediating = 0,
  successRate,
}: ResolutionPieChartProps) {
  const { isDark } = useTheme();

  const data = [
    { name: "Auto-Healed (PR Opened)", value: resolved, color: "#05df72" },
    { name: "Failed / Retried Out", value: failed, color: "#ef4444" },
    { name: "Remediating in Sandbox", value: remediating, color: "#a855f7" },
    { name: "Pending Analysis", value: pending, color: "#f59e0b" },
  ];

  const total = resolved + failed + pending + remediating;
  const displaySuccessRate =
    successRate !== undefined
      ? successRate
      : total > 0
      ? Number(((resolved / (resolved + failed || 1)) * 100).toFixed(1))
      : 100;

  return (
    <div className="p-6 rounded-2xl liquid-glass flex flex-col justify-between transition-colors duration-200">
      <div>
        <h3 className="text-base font-semibold text-white dark:text-white light:text-zinc-950 font-mono tracking-tight">
          Resolution Breakdown
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-500 mt-1 font-sans leading-relaxed">
          Closed-loop autonomous remediation outcomes across production telemetry
        </p>
      </div>

      <div className="relative h-[220px] w-full flex items-center justify-center my-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "rgba(10, 10, 12, 0.95)" : "rgba(255, 255, 255, 0.95)",
                borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.10)",
                borderRadius: "0.75rem",
                color: isDark ? "#f4f4f5" : "#09090b",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                backdropFilter: "blur(12px)",
                boxShadow: isDark ? "0 10px 25px rgba(0,0,0,0.5)" : "0 10px 25px rgba(0,0,0,0.1)",
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={92}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={isDark ? "#000000" : "#ffffff"}
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Success Rate Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono text-white dark:text-white light:text-zinc-950">
            {displaySuccessRate}%
          </span>
          <span className="text-[10px] uppercase font-mono font-semibold text-emerald-400 glow-emerald">
            Success Rate
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-2.5 text-xs pt-3.5 border-t border-white/10 dark:border-white/10 light:border-zinc-200">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: item.color,
                boxShadow: item.color === "#05df72" ? "0 0 8px rgba(5,223,114,0.4)" : undefined,
              }}
            />
            <span className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 truncate text-[11px] font-sans">
              {item.name}
            </span>
            <span className="ml-auto font-mono text-white dark:text-white light:text-zinc-900 text-[11px] font-semibold">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
