"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import type { CompatibilityBand, ScorePair } from "@/lib/kundli-milan-report-view";

export interface MilanScoreCardProps {
  /** Kept for call-site compatibility; the Guna total is no longer displayed. */
  guna?: ScorePair | null;
  band: CompatibilityBand | null;
  /** The report's own one-line summary (scores.verdict.headline), already translated. */
  headline: string | null;
}

/**
 * The screen's headline card: the compatibility band and the report's own one-line verdict.
 * No Guna total or ring — reports show no numeric scores (same as the Marriage OutlookCard).
 */
export default function MilanScoreCard({ band, headline }: MilanScoreCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <h2 className="font-display text-sm text-foreground">{t("kundliMilanReport.score.title")}</h2>
      {band && <p className="text-xs text-gold mt-0.5">{t(`kundliMilanReport.score.band.${band}`)}</p>}
      {headline && <p className="text-[11px] leading-snug text-muted mt-1.5">{headline}</p>}
    </Card>
  );
}
