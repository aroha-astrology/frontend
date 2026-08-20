"use client";

import { useTranslation } from "react-i18next";
import FactCard from "./blocks/FactCard";
import type {
  RemedyPlacementValue,
  KarmicDebtValue,
  PakkaGharValue,
  BlindPlanetValue,
} from "@/lib/report-score-facts";

/**
 * Dedicated rendering for the 4 Lal Kitab array shapes — used both by the
 * standalone remedies report and, since the marriage/wealth/true_love/
 * kundli_milan reports' Remedies slot switched from gemstones to Lal Kitab
 * remedies, by those bespoke report views too (planet placements only, via
 * `RemedyPlacementsCards`). Without these, ReportScoreFacts's generic
 * fallback ran every remedy sentence through a naive per-word titleCase and
 * right-aligned the whole joined "Planet: X · House: Y · Remedies: ... ·
 * Totke: ..." string — unreadable, and each remedy/totka sentence is prose,
 * not a short enum `humanizeValue` was ever meant to touch. These render the
 * original sentence case with an actual bullet list per remedy, reusing the
 * SAME translated `remediesPage.*` i18n keys as app/remedies/page.tsx's
 * free-page cards (not just its visual language) rather than a second,
 * hardcoded-English copy of the same handful of labels.
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      {placements.map((p) => (
        <FactCard
          key={p.planet}
          eyebrow={`${p.planet} · ${t("remediesPage.houseLabel", { house: p.house })}`}
          title={p.remedies[0] ?? ""}
        >
          <BulletList items={p.remedies.slice(1)} marker="✓" />
          {p.totke.length > 0 && (
            <>
              <span className="mt-2 block text-[10px] uppercase tracking-wider text-gold/70">
                {t("remediesPage.alsoTry")}
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      {debts.map((d) => (
        <FactCard key={d.type} eyebrow={`⚖️ ${t("remediesPage.debtEyebrow")}`} title={d.type}>
          <BulletList items={d.indicators} marker="◆" />
          {d.remedies.length > 0 && (
            <>
              <span className="mt-2 block text-[10px] uppercase tracking-wider text-gold/70">
                {t("remediesPage.debtRemedies")}
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      {placements.map((p) => (
        <FactCard
          key={p.planet}
          eyebrow={`⭐ ${p.planet}`}
          title={`${t("remediesPage.pakkaGharLabel")} · ${t("remediesPage.houseLabel", { house: p.pakkaGhar })}`}
        >
          <p className="text-[13px] leading-relaxed">{p.effect}</p>
        </FactCard>
      ))}
    </div>
  );
}

export function BlindPlanetsCards({ planets }: { planets: BlindPlanetValue[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      {planets.map((p) => (
        <FactCard
          key={p.planet}
          eyebrow={`⚠️ ${p.planet} · ${t("remediesPage.houseLabel", { house: p.house })}`}
          title={p.isBlind ? t("remediesPage.blind") : t("remediesPage.halfBlind")}
        >
          <p className="text-[13px] leading-relaxed">{p.reason}</p>
        </FactCard>
      ))}
    </div>
  );
}
