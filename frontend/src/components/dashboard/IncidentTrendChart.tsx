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
  return (
    <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Incident Ingestion & Auto-Heal Trend</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Daily volume of incoming crashes vs verified automated pull requests</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            Auto-Healed
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
            Total Ingested
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorIngested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                borderColor: "#3f3f46",
                borderRadius: "0.5rem",
                color: "#f4f4f5",
                fontSize: "12px",
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
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorResolved)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
