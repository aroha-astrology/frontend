"use client";

import FactCard from "./blocks/FactCard";
import type {
  RemedyPlacementValue,
  KarmicDebtValue,
  PakkaGharValue,
  BlindPlanetValue,
} from "@/lib/report-score-facts";

/**
 * Dedicated rendering for the 4 Lal Kitab array shapes on the remedies report
 * (planet placements, karmic debts, Pakka Ghar strengths, blind/obstructed
 * planets). Without these, ReportScoreFacts's generic fallback ran every
 * remedy sentence through a naive per-word titleCase and right-aligned the
 * whole joined "Planet: X · House: Y · Remedies: ... · Totke: ..." string —
 * unreadable, and each remedy/totka sentence is prose, not a short enum
 * `humanizeValue` was ever meant to touch. These render the original
 * sentence case with an actual bullet list per remedy, matching the same
 * visual language as app/remedies/page.tsx's free-page cards.
 */

function BulletList({ items, marker }: { items: string[]; marker: string }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {items.map((line) => (
        <li key={line} className="flex gap-2 text-[13px] leading-relaxed">
          <span aria-hidden="true" className="shrink-0 text-gold/50">
            {marker}
          </span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function RemedyPlacementsCards({ placements }: { placements: RemedyPlacementValue[] }) {
  return (
    <div className="flex flex-col gap-2">
      {placements.map((p) => (
        <FactCard key={p.planet} eyebrow={`${p.planet} · House ${p.house}`} title={p.remedies[0] ?? ""}>
          <BulletList items={p.remedies.slice(1)} marker="✓" />
          {p.totke.length > 0 && (
            <>
              <span className="mt-2 block text-[10px] uppercase tracking-wider text-gold/70">
                Also try
              </span>
              <BulletList items={p.totke} marker="✦" />
            </>
          )}
        </FactCard>
      ))}
    </div>
  );
}

export function KarmicDebtsCards({ debts }: { debts: KarmicDebtValue[] }) {
  return (
    <div className="flex flex-col gap-2">
      {debts.map((d) => (
        <FactCard key={d.type} eyebrow="⚖️ Rin" title={d.type}>
          <BulletList items={d.indicators} marker="◆" />
          {d.remedies.length > 0 && (
            <>
              <span className="mt-2 block text-[10px] uppercase tracking-wider text-gold/70">
                How to settle it
              </span>
              <BulletList items={d.remedies} marker="✓" />
            </>
          )}
        </FactCard>
      ))}
    </div>
  );
}

export function PakkaGharCards({ placements }: { placements: PakkaGharValue[] }) {
  return (
    <div className="flex flex-col gap-2">
      {placements.map((p) => (
        <FactCard key={p.planet} eyebrow={`⭐ ${p.planet}`} title={`Pakka Ghar · House ${p.pakkaGhar}`}>
          <p className="text-[13px] leading-relaxed">{p.effect}</p>
        </FactCard>
      ))}
    </div>
  );
}

export function BlindPlanetsCards({ planets }: { planets: BlindPlanetValue[] }) {
  return (
    <div className="flex flex-col gap-2">
      {planets.map((p) => (
        <FactCard
          key={p.planet}
          eyebrow={`⚠️ ${p.planet} · House ${p.house}`}
          title={p.isBlind ? "Blind" : "Half-blind"}
        >
          <p className="text-[13px] leading-relaxed">{p.reason}</p>
        </FactCard>
      ))}
    </div>
  );
}
