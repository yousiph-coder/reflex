"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface ResolutionPieChartProps {
  resolved: number;
  failed: number;
  pending: number;
  remediating: number;
}

export function ResolutionPieChart({
  resolved = 139,
  failed = 6,
  pending = 2,
  remediating = 1,
}: ResolutionPieChartProps) {
  const data = [
    { name: "Auto-Healed (PR Opened)", value: resolved, color: "#10b981" },
    { name: "Failed / Retried Out", value: failed, color: "#ef4444" },
    { name: "Remediating in Sandbox", value: remediating, color: "#a855f7" },
    { name: "Pending Analysis", value: pending, color: "#f59e0b" },
  ];

  const total = resolved + failed + pending + remediating;
  const successRate = total > 0 ? ((resolved / (resolved + failed || 1)) * 100).toFixed(1) : "0";

  return (
    <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] flex flex-col justify-between">
      <div>
        <h3 className="text-base font-semibold text-white">Resolution Breakdown</h3>
        <p className="text-xs text-zinc-400 mt-0.5">Closed-loop autonomous remediation outcomes</p>
      </div>

      <div className="relative h-[220px] w-full flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                borderColor: "#3f3f46",
                borderRadius: "0.5rem",
                color: "#f4f4f5",
                fontSize: "12px",
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={88}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#121215" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Success Rate Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono text-white">{successRate}%</span>
          <span className="text-[10px] uppercase font-medium text-emerald-400">Success Rate</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-zinc-800/80">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-zinc-400 truncate text-[11px]">{item.name}</span>
            <span className="ml-auto font-mono text-white text-[11px] font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
