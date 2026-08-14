"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import StatusPill, { strengthPillTone } from "@/components/ui/StatusPill";
import type { Significator, WealthBand, WealthPattern } from "@/lib/wealth-report-view";

/** Ring color per band — same emerald/amber/grey family as the other report screens, plus a red
 * for `weak`, which the 3-band scales had no equivalent of. */
const BAND_COLOR: Record<WealthBand, string> = {
  excellent: "#34d399",
  good: "#fbbf24",
  average: "#a1a1aa",
  weak: "#f87171",
};

export interface WealthScoreCardProps {
  score: number | null;
  band: WealthBand | null;
  pattern: WealthPattern | null;
  /** The three significators this report scores: 2nd lord, 11th lord, Jupiter. */
  significators: Significator[];
  /** The report's own one-line summary (scores.verdict.headline), already translated. */
  headline: string | null;
}

/**
 * The screen's headline card: overall wealth score, the 3-way pattern the backend reads from
 * 2nd vs 11th lord, and the three significators behind that score.
 *
 * The significator rows carry no planet icon, unlike marriage's PlanetImpactStrip: this report
 * exposes each lord's STRENGTH but not which planet rules the house, so a row can be labelled
 * by role ("2nd Lord") but not illustrated. Showing a wrong or guessed planet would be worse
 * than showing none.
 */
export default function WealthScoreCard({
  score,
  band,
  pattern,
  significators,
  headline,
}: WealthScoreCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3.5">
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-sm text-foreground">{t("wealthReport.score.title")}</h2>
          {pattern && (
            <p className="text-xs text-gold mt-0.5">{t(`wealthReport.pattern.${pattern}`)}</p>
          )}
          {headline && <p className="text-[11px] leading-snug text-muted mt-1.5">{headline}</p>}
        </div>

        {score !== null && band && (
          <div
            className="h-[68px] w-[68px] shrink-0 rounded-full grid place-items-center"
            style={{
              background: `conic-gradient(${BAND_COLOR[band]} ${score * 3.6}deg, rgba(120,120,120,0.18) 0deg)`,
            }}
          >
            <div className="h-[56px] w-[56px] rounded-full bg-card grid place-items-center leading-none">
              <span className="text-lg font-bold text-foreground">{score}</span>
              <span className="text-[9px] text-muted mt-0.5">/100</span>
            </div>
          </div>
        )}
      </div>

      {significators.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-gold/10 flex flex-col divide-y divide-gold/10">
          {significators.map((s) => (
            <div key={s.role} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
              <span className="text-xs text-foreground/90 flex-1">
                {t(`wealthReport.significator.${s.role}`)}
                {s.house !== null && (
                  <span className="text-muted">
                    {" "}
                    {t("wealthReport.significator.inHouse", { house: s.house })}
                  </span>
                )}
              </span>
              <StatusPill tone={strengthPillTone(s.strength)}>
                {t(`wealthReport.strength.${s.strength}`)}
              </StatusPill>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
