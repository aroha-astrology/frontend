"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { BedDouble, PiggyBank } from "lucide-react";
import Card from "@/components/ui/Card";
import PlanetIcon from "../PlanetIcon";
import { KP_AREAS, monthRangeLabel, shortMonth, type KpMonthView } from "@/lib/kp-annual-report-view";
import { AreaBadge, SectionTitle } from "./kp-visuals";
import { cn } from "@/lib/utils";

/**
 * Month-by-month: a horizontally swipeable card per report month — the running bhukti and
 * antara lords, the month's focus area, which areas peak, a gentle "rest" or "spending" cue
 * when the lords lean that way, and the narrative's own nudge for that month.
 */
export default function KpMonthsCard({
  months,
  selected,
  onSelect,
}: {
  months: KpMonthView[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const scroller = useRef<HTMLDivElement>(null);
  const locale = i18n.language === "en" ? "en-IN" : i18n.language;

  useEffect(() => {
    const el = scroller.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  if (months.length === 0) return null;
  const planet = (p: string) => t(`planetNames.${p.toLowerCase()}`, { defaultValue: p });

  return (
    <section>
      <SectionTitle>{t("kpAnnualReport.months.title")}</SectionTitle>
      <div
        ref={scroller}
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]"
      >
        {months.map((m) => {
          const peaks = KP_AREAS.filter((a) => m.tones[a] === "peak");
          return (
            <Card
              key={m.index}
              onClick={() => onSelect(m.index)}
              className={cn(
                "flex w-[82%] shrink-0 snap-center flex-col gap-3 rounded-2xl p-3.5",
                selected === m.index ? "border-gold/50" : "border-gold/15",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-lg text-foreground">
                  {shortMonth(m.mid, locale)} {m.mid.slice(0, 4)}
                </p>
                <p className="text-[10px] text-muted">{monthRangeLabel(m.start, m.end, locale)}</p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-gold/10 bg-background/40 px-2.5 py-2">
                <PlanetIcon planet={m.ad.toLowerCase()} size={26} />
                <PlanetIcon planet={m.pd.toLowerCase()} size={22} />
                <p className="min-w-0 text-[11px] leading-snug text-muted">
                  {t("kpAnnualReport.months.lords", { md: planet(m.md), ad: planet(m.ad), pd: planet(m.pd) })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <AreaBadge area={m.focus} size={30} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted">{t("kpAnnualReport.months.focus")}</p>
                  <p className="text-xs font-semibold text-gold">{t(`kpAnnualReport.area.${m.focus}`)}</p>
                </div>
              </div>

              {peaks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {peaks.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold"
                    >
                      {t(`kpAnnualReport.area.${a}`)}
                    </span>
                  ))}
                </div>
              )}

              {m.care && (
                <p className="flex items-start gap-1.5 rounded-lg bg-sky-400/[0.07] px-2 py-1.5 text-[11px] leading-snug text-sky-200/90">
                  {m.care === "rest" ? (
                    <BedDouble size={13} className="mt-px shrink-0" />
                  ) : (
                    <PiggyBank size={13} className="mt-px shrink-0" />
                  )}
                  {t(`kpAnnualReport.months.care.${m.care}`)}
                </p>
              )}

              {m.note && <p className="text-[13px] leading-relaxed text-foreground/85">{m.note}</p>}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
