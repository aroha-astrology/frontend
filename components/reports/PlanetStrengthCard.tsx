"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import PlanetIcon from "./PlanetIcon";
import type { PlanetStrengthValue } from "@/lib/report-score-facts";

interface PlanetStrengthWithUi extends PlanetStrengthValue {
  /** 1-2 line model explanation of what this planet's strength means, tied to its classical
   * significations (e.g. Saturn → discipline, Moon → emotional stability) — currently only
   * populated for the marriage report's 5th LLM call (`uiData.planetStrength_<planet>`), keyed
   * on by the caller. Optional and additive: every other report simply omits it. */
  aiExplanation?: string;
}

/**
 * The reader-facing view of `scores.planetStrength` — the same Shadbala /
 * retrogression / combustion data the backend also emits as `planetCondition`
 * grounding prose, which is suppressed before render (see
 * SEPARATELY_RENDERED_KEYS in lib/report-score-facts.ts for why: those lines are
 * addressed to the model, not the reader, and one of them literally instructs
 * the model not to show these percentages).
 *
 * No percentage or bar is shown (product decision: reports show no numeric scores) —
 * each planet reads as Strong / Below par against its own classical pass mark, plus
 * its retrograde/combust flags.
 */

/**
 * Two tones, not the app's usual three. `below par` means a promise arrives
 * partially or late, which is amber; there is no red case here worth alarming a
 * reader over, and the same data is already narrated with that nuance in the prose.
 */
function toneFor(isStrong: boolean) {
  return isStrong
    ? { badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" }
    : { badge: "border-amber-500/25 bg-amber-500/10 text-amber-400" };
}

export default function PlanetStrengthCard({ planets }: { planets: PlanetStrengthWithUi[] }) {
  const { t } = useTranslation();

  if (planets.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-3">
        {planets.map((p) => {
          const key = p.planet.toLowerCase();
          const tone = toneFor(p.isStrong);

          return (
            <div key={p.planet} className="flex items-center gap-2.5">
              <PlanetIcon planet={key} size={28} />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-xs font-semibold text-foreground">
                  {t(`planetNames.${key}`, { defaultValue: p.planet })}
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${tone.badge}`}
                  >
                    {p.isStrong
                      ? t("reports.facts.planetStrength.strong")
                      : t("reports.facts.planetStrength.belowPar")}
                  </span>
                  {p.isRetrograde && (
                    <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/5 px-2 py-0.5 text-[9px] font-medium text-gold">
                      ↺ {t("reports.facts.planetStrength.retrograde")}
                    </span>
                  )}
                  {p.isCombust && (
                    <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/5 px-2 py-0.5 text-[9px] font-medium text-gold">
                      ☀ {t("reports.facts.planetStrength.combust")}
                    </span>
                  )}
                </div>

                {p.aiExplanation && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                    {p.aiExplanation}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] leading-relaxed text-muted">
        {t("reports.facts.planetStrength.footnote")}
      </p>
    </Card>
  );
}
