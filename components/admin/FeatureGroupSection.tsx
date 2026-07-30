"use client";

import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import { FEATURE_GROUP_LABELS, type AdminFeatureGroupKey } from "@/lib/admin-format";

/** One labeled section of a feature board (nav/home/paid/reports) — shared by the main Features board and a group's Feature Overrides. */
export default function FeatureGroupSection({ group, children }: { group: string; children: ReactNode }) {
  const label = FEATURE_GROUP_LABELS[group as AdminFeatureGroupKey] ?? group;
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gold mb-2">{label}</h2>
      <Card className="p-2 sm:p-4">{children}</Card>
    </section>
  );
}
