"use client";

import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatPeriodMonth } from "@/lib/reports-logic";
import type { KpAreaView } from "@/lib/kp-annual-report-view";
import { AreaBadge, PromisePill, SectionTitle } from "./kp-visuals";

/** Short "Nov 2026 – Jan 2027" label for a best window. Report months run from the purchase
 * day (e.g. 25 Feb – 24 Mar), so each end is named by the month holding most of its days —
 * the same month-midpoint naming the heatmap and the narrative use. */
export function windowLabel(w: { start: string; end: string }): string {
  const day = 86_400_000;
  const at = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).getTime();
  const start = new Date(at(w.start) + 15 * day).toISOString().slice(0, 7);
  const end = new Date(at(w.end) - 15 * day).toISOString().slice(0, 7);
  const f = (ym: string) => formatPeriodMonth(ym).replace(/^(\w{3})\w*/, "$1");
  return start === end ? f(start) : `${f(start)} – ${f(end)}`;
}

/**
 * The eight life areas, each with KP's verdict on the PROMISE (from the principal cusp's sub
 * lord) and the year's best window. The promise is a word, never a number.
 */
export default function KpLifeAreasCard({ areas }: { areas: KpAreaView[] }) {
  const { t } = useTranslation();
  if (areas.length === 0) return null;
  return (
    <section>
      <SectionTitle>{t("kpAnnualReport.areas.title")}</SectionTitle>
      <p className="-mt-1 mb-2.5 text-[11px] leading-relaxed text-muted">{t("kpAnnualReport.areas.intro")}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {areas.map((a) => (
          <Card key={a.key} className="flex flex-col gap-2 rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <AreaBadge area={a.key} size={34} />
              <p className="min-w-0 flex-1 text-xs font-semibold leading-tight text-foreground">
                {t(`kpAnnualReport.area.${a.key}`)}
              </p>
            </div>
            <PromisePill promise={a.promise} label={t(`kpAnnualReport.promise.${a.promise}`)} />
            <p className="text-[11px] leading-snug text-muted">
              {a.bestWindow ? (
                <>
                  <span className="text-foreground/60">{t("kpAnnualReport.areas.bestWindow")} </span>
                  <span className="font-medium text-gold">{windowLabel(a.bestWindow)}</span>
                </>
              ) : (
                t("kpAnnualReport.areas.noWindow")
              )}
            </p>
            <p className="text-[10px] text-muted/80">
              {t("kpAnnualReport.areas.decidedBy", {
                cusp: a.principalCusp,
                planet: t(`planetNames.${a.cuspSubLord.toLowerCase()}`, { defaultValue: a.cuspSubLord }),
              })}
            </p>
            {a.sensitive && (
              <p className="flex items-start gap-1 text-[10px] leading-snug text-amber-300/90">
                <AlertCircle size={11} className="mt-px shrink-0" />
                {t("kpAnnualReport.areas.sensitive")}
              </p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
