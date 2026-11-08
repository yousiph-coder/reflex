"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";

const DATA = [
  { date: "Sep 01", ingested: 8, resolved: 8 },
  { date: "Sep 03", ingested: 12, resolved: 11 },
  { date: "Sep 05", ingested: 9, resolved: 9 },
  { date: "Sep 07", ingested: 15, resolved: 14 },
  { date: "Sep 09", ingested: 18, resolved: 17 },
  { date: "Sep 11", ingested: 14, resolved: 14 },
  { date: "Sep 13", ingested: 22, resolved: 21 },
  { date: "Sep 14", ingested: 19, resolved: 18 },
];

export function IncidentTrendChart() {
  const { isDark } = useTheme();

  return (
    <div className="p-6 rounded-2xl liquid-glass flex flex-col justify-between transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-semibold text-white dark:text-white light:text-zinc-950 font-mono tracking-tight">
            Incident Ingestion & Auto-Heal Trend
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-500 mt-1 font-sans leading-relaxed">
            Daily volume of incoming telemetry crashes vs verified automated pull requests
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 glow-emerald" />
            Auto-Healed
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-400 light:text-zinc-500">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            Total Ingested
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorIngested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke={isDark ? "#71717a" : "#a1a1aa"}
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={isDark ? "#71717a" : "#a1a1aa"}
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickLine={false}
              axisLine={false}
            />
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
            <Area
              type="monotone"
              dataKey="ingested"
              name="Ingested"
              stroke="#a855f7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorIngested)"
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Auto-Healed"
              stroke="#05df72"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorResolved)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
