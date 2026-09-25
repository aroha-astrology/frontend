"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { KP_AREAS, shortMonth, type KpMonthView } from "@/lib/kp-annual-report-view";
import { AREA_ICON, SectionTitle, TONE_DOT } from "./kp-visuals";
import { cn } from "@/lib/utils";

/**
 * The whole year on one screen: eight life areas down, twelve months across, one dot per
 * cell — bright gold at a peak, soft gold when active, faint when quiet. Tapping a month
 * column opens that month's card below (see KpMonthsCard).
 */
export default function KpYearHeatmap({
  months,
  selected,
  onSelect,
}: {
  months: KpMonthView[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const { t, i18n } = useTranslation();
  if (months.length === 0) return null;
  const locale = i18n.language === "en" ? "en-IN" : i18n.language;
  return (
    <section>
      <SectionTitle>{t("kpAnnualReport.heatmap.title")}</SectionTitle>
      <Card className="overflow-hidden rounded-2xl p-3">
        <div className="grid grid-cols-[22px_repeat(12,minmax(0,1fr))] items-center gap-y-2">
          <span />
          {months.map((m) => (
            <button
              key={m.index}
              type="button"
              onClick={() => onSelect(m.index)}
              aria-label={t("kpAnnualReport.heatmap.openMonth", { month: shortMonth(m.mid, locale) })}
              className={cn(
                "mx-auto rounded-md px-0.5 py-0.5 text-[9px] font-semibold uppercase leading-none",
                selected === m.index ? "bg-gold text-[#1a0e00]" : "text-muted",
              )}
            >
              {shortMonth(m.mid, locale).slice(0, 3)}
            </button>
          ))}
          {KP_AREAS.map((area) => {
            const Icon = AREA_ICON[area];
            return (
              <div key={area} className="contents">
                <Icon size={13} className="text-gold/80" aria-label={t(`kpAnnualReport.area.${area}`)} />
                {months.map((m) => (
                  <button
                    key={m.index}
                    type="button"
                    onClick={() => onSelect(m.index)}
                    className={cn(
                      "flex h-5 items-center justify-center",
                      selected === m.index && "rounded-sm bg-gold/[0.07]",
                    )}
                    aria-label={`${t(`kpAnnualReport.area.${area}`)} · ${shortMonth(m.mid, locale)} · ${t(`kpAnnualReport.tone.${m.tones[area]}`)}`}
                  >
                    <span className={cn("block h-2.5 w-2.5 rounded-full", TONE_DOT[m.tones[area]])} />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-gold/10 pt-2.5">
          {(["peak", "active", "quiet"] as const).map((tone) => (
            <span key={tone} className="flex items-center gap-1.5 text-[10px] text-muted">
              <span className={cn("block h-2 w-2 rounded-full", TONE_DOT[tone])} />
              {t(`kpAnnualReport.tone.${tone}`)}
            </span>
          ))}
        </div>
      </Card>
    </section>
  );
}
