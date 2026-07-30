"use client";

import Card from "@/components/ui/Card";

/** A single stat tile — the basic unit of the Overview page's KPI grid. */
export default function KpiTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
      {caption && <p className="text-[11px] text-muted mt-1">{caption}</p>}
    </Card>
  );
}
