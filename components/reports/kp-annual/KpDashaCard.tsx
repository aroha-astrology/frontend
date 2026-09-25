"use client";

import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import Card from "@/components/ui/Card";
import PlanetIcon from "../PlanetIcon";
import { formatDateKey } from "@/lib/reports-logic";
import type { KpAnnualView } from "@/lib/kp-annual-report-view";
import { SectionTitle } from "./kp-visuals";

/**
 * The planetary period the reader is in — dasha, bhukti and antara lords — and every bhukti
 * change that falls inside the year, which KP treats as the year's turning points.
 */
export default function KpDashaCard({ view }: { view: KpAnnualView }) {
  const { t } = useTranslation();
  if (!view.dashaNow) return null;
  const planet = (p: string) => t(`planetNames.${p.toLowerCase()}`, { defaultValue: p });
  const levels = [
    { key: "md", planet: view.dashaNow.md },
    { key: "ad", planet: view.dashaNow.ad },
    { key: "pd", planet: view.dashaNow.pd },
  ] as const;
  return (
    <section>
      <SectionTitle>{t("kpAnnualReport.dasha.title")}</SectionTitle>
      <Card className="rounded-2xl p-3.5">
        <div className="grid grid-cols-3 gap-2">
          {levels.map((l) => (
            <div key={l.key} className="flex flex-col items-center gap-1.5 rounded-xl bg-background/40 py-3">
              <PlanetIcon planet={l.planet.toLowerCase()} size={l.key === "md" ? 40 : 34} />
              <p className="text-xs font-semibold text-foreground">{planet(l.planet)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">{t(`kpAnnualReport.dasha.${l.key}`)}</p>
            </div>
          ))}
        </div>
        {view.dashaNow.adEnds && (
          <p className="mt-3 text-center text-[11px] text-muted">
            {t("kpAnnualReport.dasha.adUntil", {
              planet: planet(view.dashaNow.ad),
              date: formatDateKey(view.dashaNow.adEnds),
            })}
          </p>
        )}
        <div className="mt-3 border-t border-gold/10 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t("kpAnnualReport.dasha.shifts")}
          </p>
          {view.dashaShifts.length === 0 ? (
            <p className="text-xs text-foreground/80">{t("kpAnnualReport.dasha.noShift")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.dashaShifts.map((s) => (
                <li key={s.date} className="flex items-center gap-2 text-xs text-foreground/85">
                  <span className="w-24 shrink-0 text-gold">{formatDateKey(s.date)}</span>
                  <ArrowRight size={12} className="text-muted" />
                  <PlanetIcon planet={s.ad.toLowerCase()} size={20} />
                  <span>{t("kpAnnualReport.dasha.shiftTo", { md: planet(s.md), ad: planet(s.ad) })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </section>
  );
}
