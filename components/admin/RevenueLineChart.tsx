"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AdminOverviewTimeSeriesPoint } from "@/lib/admin-api";
import { formatRupees } from "@/lib/format";

// This app's gold token (tailwind.config.ts colors.gold.DEFAULT) — a single
// hue for a single series, per this repo's charting convention: one hue,
// thin 2px line, no dual-axis, a lightweight tooltip, no legend (a single
// series doesn't need one — the section title above already names it).
const GOLD = "#D4AF37";

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** Revenue-over-time — a single-series line chart of `timeSeries` (bucketStart x totalPaise). */
export default function RevenueLineChart({ data }: { data: AdminOverviewTimeSeriesPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted text-center py-10">No revenue data for this range.</p>;
  }

  return (
    <div className="w-full h-64 text-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          {/* Recessive gridlines: currentColor inherits this container's themed text
              color, so it adapts to dark/light without a raw CSS var in an SVG attribute. */}
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="bucketStart"
            tickFormatter={formatDateShort}
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.6 }}
            axisLine={{ stroke: "currentColor", strokeOpacity: 0.15 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatRupees(v)}
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.6 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            formatter={(v) => [formatRupees(Number(v)), "Revenue"]}
            labelFormatter={(label) => formatDateShort(String(label))}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
            itemStyle={{ color: GOLD }}
          />
          <Line type="monotone" dataKey="totalPaise" stroke={GOLD} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: GOLD }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
