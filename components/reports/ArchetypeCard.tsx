"use client";

import Card from "@/components/ui/Card";
import type { Archetype } from "@/lib/report-score-facts";

/**
 * Archetype heading + description, then one 0-10 trait-tilt bar per trait —
 * a simple filled-track bar (gold fill on a border-tinted track), matching
 * this app's flat/minimal stat-bar visual language rather than inventing a
 * new one. Traits/description are LLM-authored copy, not UI chrome, so (like
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

      {archetype.traits.length > 0 && (
        <div className="flex flex-col gap-2">
          {archetype.traits.map((trait, i) => {
            const pct = Math.max(0, Math.min(100, (trait.score / 10) * 100));
            return (
              <div key={`${trait.label}-${i}`} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-foreground/80">{trait.label}</span>
                  <span className="text-[10px] tabular-nums text-muted">{trait.score}/10</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
