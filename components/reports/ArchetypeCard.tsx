"use client";

import Card from "@/components/ui/Card";
import TraitTiltBars from "./TraitTiltBars";
import type { Archetype } from "@/lib/report-score-facts";

/**
 * Archetype heading + description, then a trait-tilt bar chart (horizontal
 * bars, sorted by score descending, direct-labelled — see
 * TraitTiltBars.tsx) — the bars ARE the trait list, just visualized as a
 * real chart instead of a plain progress-bar list, so there's no separate
 * plain-text trait list duplicating the same 5 labels alongside it.
 * Traits/description are LLM-authored copy, not UI chrome, so (like
 * lib/report-score-facts.ts's nested-fact values) they render as-is,
 * untranslated — matching this app's existing precedent for dynamic
 * LLM-adjacent content (see components/vastu/AnalysisPanel.tsx).
 */
export default function ArchetypeCard({ archetype }: { archetype: Archetype }) {
  return (
    <Card className="flex flex-col gap-3 p-3.5">
      <div>
        <h4 className="font-display text-sm text-gold">{archetype.label}</h4>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{archetype.description}</p>
      </div>

      <TraitTiltBars traits={archetype.traits} />
    </Card>
  );
}
