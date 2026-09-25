"use client";

import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import Card from "@/components/ui/Card";
import PlanetIcon from "../PlanetIcon";
import { shortMonth, type KpAnnualView } from "@/lib/kp-annual-report-view";
import { SectionTitle } from "./kp-visuals";

/**
 * The four slow movers that KP uses to confirm timing — where each starts the year (sign,
 * star, and which area of THIS chart it is passing through), and each sign change later on.
 */
export default function KpTransitsCard({ view }: { view: KpAnnualView }) {
  const { t, i18n } = useTranslation();
  if (view.transitsAtStart.length === 0) return null;
  const locale = i18n.language === "en" ? "en-IN" : i18n.language;
  const planet = (p: string) => t(`planetNames.${p.toLowerCase()}`, { defaultValue: p });
  const order = ["Jupiter", "Saturn", "Rahu", "Ketu"];
  const start = [...view.transitsAtStart].sort((a, b) => order.indexOf(a.planet) - order.indexOf(b.planet));
  return (
    <section>
      <SectionTitle>{t("kpAnnualReport.transits.title")}</SectionTitle>
      <Card className="flex flex-col gap-2 rounded-2xl p-3">
        {start.map((tr) => {
          const changes = view.transitChanges.filter((c) => c.planet === tr.planet);
          return (
            <div key={tr.planet} className="flex items-start gap-3 rounded-xl bg-background/40 p-2.5">
              <PlanetIcon planet={tr.planet.toLowerCase()} size={34} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  {planet(tr.planet)}
                  <span className="font-normal text-muted">
                    · {tr.sign} · {tr.nakshatra}
                  </span>
                  {tr.retrograde && <RotateCcw size={11} className="text-amber-300" aria-label="retrograde" />}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted">
                  {t("kpAnnualReport.transits.house", {
                    house: tr.natalHouse,
                    meaning: t(`kpAnnualReport.houseMeaning.${tr.natalHouse}`),
                  })}
                </p>
                {changes.map((c) => (
                  <p key={`${c.planet}-${c.monthIndex}`} className="mt-1 text-[11px] text-gold/90">
                    {t("kpAnnualReport.transits.change", {
                      month: `${shortMonth(view.months[c.monthIndex]?.mid ?? "", locale)} ${view.months[c.monthIndex]?.mid.slice(0, 4) ?? ""}`,
                      sign: c.toSign,
                    })}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
