"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import StatusPill, { strengthPillTone } from "@/components/ui/StatusPill";
import PlanetIcon from "../PlanetIcon";
import type { PlanetImpact } from "@/lib/marriage-report-view";

/**
 * The three planets this report actually scores — Venus (love), Jupiter (the marriage
 * karaka), and whichever planet rules the 7th house — each with its strength and the
 * engine's own one-line reason ("Debilitated in Pisces", "Combust").
 *
 * Venus can legitimately appear twice, once as karaka and once as 7th lord; that is a
 * real placement, not a duplicate row, so it is shown as-is with each role labelled.
 */
export default function PlanetImpactStrip({ planets }: { planets: PlanetImpact[] }) {
  const { t } = useTranslation();
  if (planets.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">{t("marriageReport.planets.title")}</h2>
      <Card className="p-2 flex flex-col divide-y divide-gold/10">
        {planets.map((p, i) => (
          <div key={`${p.role}-${i}`} className="flex items-center gap-3 p-2">
            <PlanetIcon planet={p.planet} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {t(`marriageReport.planets.role.${p.role}`)}
              </p>
              {p.reason && <p className="text-[11px] leading-snug text-muted mt-0.5">{p.reason}</p>}
            </div>
            {p.strength && (
              <StatusPill tone={strengthPillTone(p.strength)}>
                {t(`marriageReport.strength.${p.strength}`)}
              </StatusPill>
            )}
          </div>
        ))}
      </Card>
    </section>
  );
}
