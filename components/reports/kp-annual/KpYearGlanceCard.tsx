"use client";

import { useTranslation } from "react-i18next";
import { CalendarRange, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatDateKey } from "@/lib/reports-logic";
import { strongestAreas, type KpAnnualView } from "@/lib/kp-annual-report-view";
import { AreaBadge, PromisePill } from "./kp-visuals";

/**
 * The opening card: the year's window, the one-line headline (the shared verdict's headline,
 * when it exists) and the three life areas the year leans toward — strongest promise first.
 */
export default function KpYearGlanceCard({ view, headline }: { view: KpAnnualView; headline: string | null }) {
  const { t } = useTranslation();
  const top = strongestAreas(view.areas);
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold/10 blur-3xl"
      />
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
        <Sparkles size={12} />
        {t("kpAnnualReport.glance.eyebrow")}
      </div>
      {view.window && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <CalendarRange size={13} className="text-gold/80" />
          {t("kpAnnualReport.glance.window", {
            start: formatDateKey(view.window.start),
            end: formatDateKey(view.window.end),
          })}
        </p>
      )}
      {headline && <p className="mt-3 font-display text-[17px] leading-snug text-foreground">{headline}</p>}

      {top.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t("kpAnnualReport.glance.leans")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {top.map((a) => (
              <div
                key={a.key}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-gold/15 bg-background/40 px-2 py-3 text-center"
              >
                <AreaBadge area={a.key} size={42} />
                <p className="text-[11px] font-medium leading-tight text-foreground">
                  {t(`kpAnnualReport.area.${a.key}`)}
                </p>
                <PromisePill promise={a.promise} label={t(`kpAnnualReport.promise.${a.promise}`)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-muted">
        {t(view.houseSystem === "equal" ? "kpAnnualReport.glance.methodEqual" : "kpAnnualReport.glance.method")}
      </p>
    </Card>
  );
}
