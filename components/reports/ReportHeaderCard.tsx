"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import type { ReportHeaderValue } from "@/lib/report-score-facts";

/**
 * Identity summary shown at the top of every report — name, Lagna, Moon sign/nakshatra, and
 * the current Mahadasha/Antardasha. Renders directly from `scores.header` (see
 * app/reports/[id]/page.tsx) rather than through the generic facts grid, since it belongs at
 * the very top of the page, before the table of contents.
 */
export default function ReportHeaderCard({ header }: { header: ReportHeaderValue }) {
  const { t } = useTranslation();

  const facts: { label: string; value: string }[] = [];
  if (header.lagnaSign) facts.push({ label: t("kundliPage.ascendantLagna"), value: header.lagnaSign });
  if (header.moonSign) {
    facts.push({
      label: t("horoscope.detail.moonTransit"),
      value: header.moonNakshatra ? `${header.moonSign} · ${header.moonNakshatra}` : header.moonSign,
    });
  }
  // Dasha lords are planet names the backend emits in English; translate them via the shared
  // planetNames table, falling back to the raw name for anything not in it. Sign/nakshatra
  // names above remain English - a known app-wide gap, not one this card can close alone.
  const planetName = (p: string) => t(`planetNames.${p.toLowerCase()}`, { defaultValue: p });
  if (header.currentMahadasha)
    facts.push({ label: t("kundliPage.mahadasha"), value: planetName(header.currentMahadasha) });
  if (header.currentAntardasha)
    facts.push({ label: t("kundliPage.antardasha"), value: planetName(header.currentAntardasha) });

  if (facts.length === 0 && !header.name) return null;

  return (
    <Card className="p-3.5">
      {header.name && <h2 className="font-display text-base text-foreground">{header.name}</h2>}
      {facts.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {facts.map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted">{label}</span>
              <span className="text-[11px] font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
