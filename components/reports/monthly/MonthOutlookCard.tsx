"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import PlanetIcon from "../PlanetIcon";
import type { MonthlyTone } from "@/lib/monthly-report-view";

export interface MonthOutlookCardProps {
  tone: MonthlyTone | null;
  mahadashaLord: string | null;
  antardashaLord: string | null;
  /** Already formatted for the active locale by the caller — this component does no date work. */
  periodLabel: string | null;
  /** i18n key for the card heading, so each monthly report names its own outlook. */
  titleKey: string;
  /** i18n key prefix for the tone label, resolved as `${toneKeyPrefix}.${tone}`. */
  toneKeyPrefix: string;
  /** The report's own one-line summary (scores.verdict.headline), already translated. */
  headline: string | null;
}

/**
 * The headline card for any monthly report: the month's tone, which dasha lords are running,
 * and the report's one-line verdict. No score/ring — reports show no numeric scores.
 *
 * Shared by all four monthly report types — they compute this identically and differ only in
 * which houses they read, so a per-report copy would be four copies of one card.
 */
export default function MonthOutlookCard({
  tone,
  mahadashaLord,
  antardashaLord,
  periodLabel,
  titleKey,
  toneKeyPrefix,
  headline,
}: MonthOutlookCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="min-w-0">
        <h2 className="font-display text-sm text-foreground">{t(titleKey)}</h2>
        {periodLabel && <p className="text-[11px] text-muted mt-0.5">{periodLabel}</p>}
        {tone && <p className="text-xs text-gold mt-0.5">{t(`${toneKeyPrefix}.${tone}`)}</p>}
        {headline && <p className="text-[11px] leading-snug text-muted mt-1.5">{headline}</p>}
      </div>

      {(mahadashaLord || antardashaLord) && (
        <div className="mt-3.5 pt-3 border-t border-gold/10 flex items-center gap-4">
          {mahadashaLord && (
            <div className="flex items-center gap-2 min-w-0">
              <PlanetIcon planet={mahadashaLord} size={28} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted">{t("monthlyReport.mahadasha")}</p>
                <p className="text-xs text-foreground capitalize">
                  {t(`planetNames.${mahadashaLord}`, { defaultValue: mahadashaLord })}
                </p>
              </div>
            </div>
          )}
          {antardashaLord && (
            <div className="flex items-center gap-2 min-w-0">
              <PlanetIcon planet={antardashaLord} size={28} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted">{t("monthlyReport.antardasha")}</p>
                <p className="text-xs text-foreground capitalize">
                  {t(`planetNames.${antardashaLord}`, { defaultValue: antardashaLord })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
