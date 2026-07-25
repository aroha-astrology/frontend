"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AdminSpendByFeatureRow } from "@/lib/admin-api";
import { formatRupees } from "@/lib/format";
import { sortByTotalPaiseDescending } from "@/lib/admin-format";

// Same single hue as RevenueLineChart — these bars all encode "spend"
// magnitude, not distinct categories that need separate identity colors, so
// one hue is correct here too (see dataviz guidance: sequential/magnitude = one hue).
const GOLD = "#D4AF37";

/** Horizontal bar chart of spend by feature (`reasonPrefix` x `totalPaise`), sorted descending. */
export default function SpendByFeatureBarChart({ data }: { data: AdminSpendByFeatureRow[] }) {
  const sorted = sortByTotalPaiseDescending(data);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted text-center py-10">No spend recorded for this range.</p>;
  }

  const height = Math.max(160, sorted.length * 36);

  return (
    <div className="w-full text-foreground" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatRupees(v)}
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.6 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="reasonPrefix"
            width={140}
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.8 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [formatRupees(Number(v)), "Spend"]}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
            itemStyle={{ color: GOLD }}
          />
          <Bar dataKey="totalPaise" fill={GOLD} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
