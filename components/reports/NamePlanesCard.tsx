"use client";

import { useTranslation } from "react-i18next";
import type { NamePlanesValue } from "@/lib/report-score-facts";

/** 4 tiles (Knowledge/Strength/Emotional/Spiritual) each showing its plane's numeric score plus
 * the actual name letters counted toward it — replaces the generic nested-fact renderer, which
 * would otherwise flatten the `letters` sub-object into one mashed "Knowledge: B, H... ·
 * Strength: D, M..." line. */
export default function NamePlanesCard({ value }: { value: NamePlanesValue }) {
  const { t } = useTranslation();

  const planes: { labelKey: string; score: number; letters: string[] }[] = [
    { labelKey: "reports.facts.numerology.knowledge", score: value.knowledge, letters: value.letters.knowledge },
    { labelKey: "reports.facts.numerology.strength", score: value.strength, letters: value.letters.strength },
    { labelKey: "reports.facts.numerology.emotional", score: value.emotional, letters: value.letters.emotional },
    { labelKey: "reports.facts.numerology.spiritual", score: value.spiritual, letters: value.letters.spiritual },
  ];

  // No plane number is shown (reports show no numeric scores) — the strongest plane is
  // highlighted instead, and the letters counted toward each plane stay visible.
  const top = Math.max(...planes.map((p) => p.score));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-relaxed text-muted">
        {t("reports.facts.numerology.namePlanesCaption")}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {planes.map((plane) => (
          <div
            key={plane.labelKey}
            className={`flex flex-col gap-1 rounded-2xl border bg-card p-3 ${
              top > 0 && plane.score === top ? "border-gold/50 bg-gold/5" : "border-gold/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted">{t(plane.labelKey)}</span>
              {top > 0 && plane.score === top && <span className="text-gold text-xs" aria-hidden>★</span>}
            </div>
            {plane.letters.length > 0 && (
              <span className="text-xs text-foreground/80 break-words">{plane.letters.join(", ")}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
