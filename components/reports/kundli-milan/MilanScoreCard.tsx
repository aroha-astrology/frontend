"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import type { CompatibilityBand, ScorePair } from "@/lib/kundli-milan-report-view";

/** Ring color per band — the same emerald/amber/grey family OutlookCard and the status
 * pills use, plus a red for `poor`, which the marriage screen's 3-band scale had no
 * equivalent of. */
const BAND_COLOR: Record<CompatibilityBand, string> = {
  excellent: "#34d399",
  good: "#fbbf24",
  average: "#a1a1aa",
  poor: "#f87171",
};

/**
 * Guna Milan dial. The arc is driven by `pct` but the FACE reads "27 / 36" — Ashtakoota is
 * quoted out of 36 by every astrologer and every competing app, so showing a percentage
 * here would be a foreign unit the user has to convert back.
 */
function GunaRing({ guna, band }: { guna: ScorePair; band: CompatibilityBand | null }) {
  const color = band ? BAND_COLOR[band] : "#a1a1aa";
  return (
    <div
      className="h-[68px] w-[68px] shrink-0 rounded-full grid place-items-center"
      style={{ background: `conic-gradient(${color} ${guna.pct * 3.6}deg, rgba(120,120,120,0.18) 0deg)` }}
    >
      <div className="h-[56px] w-[56px] rounded-full bg-card grid place-items-center leading-none">
        <span className="text-lg font-bold text-foreground">{guna.score}</span>
        <span className="text-[9px] text-muted mt-0.5">/{guna.max}</span>
      </div>
    </div>
  );
}

export interface MilanScoreCardProps {
  guna: ScorePair | null;
  band: CompatibilityBand | null;
  /** The report's own one-line summary (scores.verdict.headline), already translated. */
  headline: string | null;
}

/**
 * The screen's headline card: the Guna Milan total, its band, and the report's own
 * one-line verdict. Renders without the dial when the score is missing (a report
 * predating the field) rather than showing a zeroed ring, which would read as an
 * appalling match instead of an absent number.
 */
export default function MilanScoreCard({ guna, band, headline }: MilanScoreCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 flex items-center gap-3.5">
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-sm text-foreground">{t("kundliMilanReport.score.title")}</h2>
        {band && <p className="text-xs text-gold mt-0.5">{t(`kundliMilanReport.score.band.${band}`)}</p>}
        {headline && <p className="text-[11px] leading-snug text-muted mt-1.5">{headline}</p>}
      </div>
      {guna && <GunaRing guna={guna} band={band} />}
    </Card>
  );
}
