"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import PlanetIcon from "../PlanetIcon";
import { SectionTitle } from "./kp-visuals";

/**
 * KP's five Ruling Planets at the start of the year. Repeats are kept (a planet holding two
 * roles is shown twice) — in KP the repetition itself is the signal.
 */
export default function KpRulingPlanetsCard({ planets }: { planets: Array<{ planet: string; role: string }> }) {
  const { t } = useTranslation();
  if (planets.length === 0) return null;
  return (
    <section>
      <SectionTitle>{t("kpAnnualReport.ruling.title")}</SectionTitle>
      <Card className="rounded-2xl p-3">
        <p className="mb-3 text-[11px] leading-relaxed text-muted">{t("kpAnnualReport.ruling.intro")}</p>
        <div className="grid grid-cols-5 gap-1.5">
          {planets.map((r, i) => (
            <div key={i} className="flex flex-col items-center gap-1 text-center">
              <PlanetIcon planet={r.planet.toLowerCase()} size={32} />
              <p className="text-[11px] font-semibold text-foreground">
                {t(`planetNames.${r.planet.toLowerCase()}`, { defaultValue: r.planet })}
              </p>
              <p className="text-[9px] leading-tight text-muted">{t(`kpAnnualReport.ruling.role.${r.role}`)}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
