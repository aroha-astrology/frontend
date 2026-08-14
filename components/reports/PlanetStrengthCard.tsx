"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import PlanetIcon from "./PlanetIcon";
import type { PlanetStrengthValue } from "@/lib/report-score-facts";

/**
 * The reader-facing view of `scores.planetStrength` — the same Shadbala /
 * retrogression / combustion data the backend also emits as `planetCondition`
 * grounding prose, which is suppressed before render (see
 * SEPARATELY_RENDERED_KEYS in lib/report-score-facts.ts for why: those lines are
 * addressed to the model, not the reader, and one of them literally instructs
 * the model not to show these percentages).
 *
 * Showing the percentage anyway is a deliberate product call, so the scale has to
 * be drawn honestly. `pct` is a ratio against each planet's OWN required virupas:
 * 100 is the classical pass mark, not the top of the scale, and values above 100
 * are normal. A plain 0-100 bar would therefore lie twice — it would peg every
 * strong planet at "full", and it would render "69% of the minimum Mercury needs"
 * as the much bleaker-looking "Mercury: 69 out of 100".
 *
 * So the track runs to 150% with a labelled tick at the 100% pass mark, and every
 * bar is read against that tick rather than against the end of the track.
 */

/** Track ceiling. Real Shadbala ratios rarely clear this; anything past it pins to full. */
const SCALE_MAX = 150;
/** The classical pass mark, as a percentage of the track — where the tick is drawn. */
const MINIMUM_MARK_PCT = (100 / SCALE_MAX) * 100;

/**
 * Two tones, not the app's usual three. `below par` means a promise arrives
 * partially or late, which is amber; there is no red case here worth alarming a
 * reader over, and the same data is already narrated with that nuance in the prose.
 */
function toneFor(isStrong: boolean) {
  return isStrong
    ? { bar: "bg-emerald-400", badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" }
    : { bar: "bg-amber-400", badge: "border-amber-500/25 bg-amber-500/10 text-amber-400" };
}

export default function PlanetStrengthCard({ planets }: { planets: PlanetStrengthValue[] }) {
  const { t } = useTranslation();

  if (planets.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-3">
      <p className="text-[11px] leading-relaxed text-muted">
        {t("reports.facts.planetStrength.caption")}
      </p>

      <div className="flex flex-col gap-3">
        {planets.map((p) => {
          const key = p.planet.toLowerCase();
          const tone = toneFor(p.isStrong);
          const fillPct = Math.min(Math.max(p.pct, 0), SCALE_MAX) / SCALE_MAX * 100;

          return (
            <div key={p.planet} className="flex items-center gap-2.5">
              <PlanetIcon planet={key} size={28} />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {t(`planetNames.${key}`, { defaultValue: p.planet })}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-foreground/80 tabular-nums">
                    {p.pct}%
                  </span>
                </div>

                {/* Track to 150% with the pass mark drawn in, per this file's doc comment. */}
                <div
                  className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
                  role="img"
                  aria-label={`${t(`planetNames.${key}`, { defaultValue: p.planet })}: ${p.pct}% ${
                    p.isStrong
                      ? t("reports.facts.planetStrength.strong")
                      : t("reports.facts.planetStrength.belowPar")
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${fillPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 w-px bg-foreground/40"
                    style={{ left: `${MINIMUM_MARK_PCT}%` }}
                  />
                </div>

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
