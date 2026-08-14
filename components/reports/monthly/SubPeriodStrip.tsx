"use client";

import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Card from "@/components/ui/Card";
import PlanetIcon from "../PlanetIcon";
import { formatWindowDate } from "../TimingWindowsCard";
import type { SubPeriod } from "@/lib/monthly-report-view";

/** Only the slices that actually differ from the month get a color; an ordinary stretch stays
 * neutral. Colouring every row would make a flat month look eventful. */
const STANDOUT_STYLE: Record<"better" | "worse", string> = {
  better: "border-emerald-500/25 bg-emerald-500/[0.07]",
  worse: "border-amber-500/25 bg-amber-500/[0.07]",
};

/**
 * The within-month Pratyantardasha slices, each with its own ruling planet, dates and score —
 * this is what answers "are there specific stretches this month that run better or worse than
 * the month overall".
 *
 * The better/worse flags come from the view-model, which only marks a slice when it clears a
 * margin wider than the scoring formula's own step size; see `STANDOUT_MARGIN` there.
 *
 * Shared by all four monthly report types.
 */
export default function SubPeriodStrip({
  subPeriods,
  titleKey,
}: {
  subPeriods: SubPeriod[];
  titleKey: string;
}) {
  const { t } = useTranslation();
  if (subPeriods.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">{t(titleKey)}</h2>
      <Card className="p-3 flex flex-col gap-2">
        {subPeriods.map((s) => (
          <div
            key={`${s.startDate}-${s.lord}`}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
              s.standout ? STANDOUT_STYLE[s.standout] : "border-border bg-background/40"
            }`}
          >
            <PlanetIcon planet={s.lord} size={26} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">
                {formatWindowDate(s.startDate)} – {formatWindowDate(s.endDate)}
              </p>
              <p className="text-[10px] text-muted mt-0.5 capitalize">
                {t(`planetNames.${s.lord}`, { defaultValue: s.lord })}
              </p>
            </div>
            {s.standout && (
              <span
                className={`flex items-center gap-0.5 text-[10px] font-semibold shrink-0 ${
                  s.standout === "better" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {s.standout === "better" ? (
                  <ArrowUpRight size={12} aria-hidden />
                ) : (
                  <ArrowDownRight size={12} aria-hidden />
                )}
                {t(`monthlyReport.subPeriod.${s.standout}`)}
              </span>
            )}
            <span className="text-xs font-semibold text-foreground/80 tabular-nums shrink-0">
              {s.score}
            </span>
          </div>
        ))}
      </Card>
    </section>
  );
}
