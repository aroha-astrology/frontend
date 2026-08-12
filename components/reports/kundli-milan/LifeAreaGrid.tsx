"use client";

import { useTranslation } from "react-i18next";
import {
  Activity,
  Baby,
  Briefcase,
  CalendarClock,
  Heart,
  HeartHandshake,
  Home,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Card from "@/components/ui/Card";
import type { LifeArea } from "@/lib/kundli-milan-report-view";
import type { MatchRiskAreaKey, RiskSeverity } from "@/lib/reports-api";

const AREA_ICON: Record<MatchRiskAreaKey, LucideIcon> = {
  wealth: Wallet,
  health: Activity,
  children: Baby,
  harmony: HeartHandshake,
  career: Briefcase,
  timing: CalendarClock,
  intimacy: Heart,
  inlaws: Home,
};

/**
 * Severity -> tile color. Follows StatusPill's border/25 bg/10 text/400 convention so this
 * reads as the same visual language, but is spelled out here rather than routed through
 * PillTone: the two vocabularies collide (a `caution` SEVERITY is amber, while a `caution`
 * PILL is red), and aliasing one to the other would be a trap for the next reader.
 *
 * `neutral` is deliberately grey, not amber — it means "nothing remarkable either way",
 * and 5 amber tiles would make an ordinary match look alarming.
 */
const SEVERITY_STYLE: Record<RiskSeverity, string> = {
  benefit: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  neutral: "border-border bg-muted/10 text-muted",
  caution: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  serious: "border-red-500/25 bg-red-500/10 text-red-400",
};

export interface LifeAreaGridProps {
  areas: LifeArea[];
  benefitCount: number;
  cautionCount: number;
}

/**
 * The 8 life areas at a glance, colored by the DETERMINISTIC severity the backend computed
 * (astro-engine/matching/match-risks.ts) — never by the AI's framing. This is the "a high
 * Guna score doesn't mean no risks" surface: a red tile shows here even on a 32/36 match.
 *
 * Each factor also carries `evidence[]` (e.g. "8th lord Jupiter exalted in Cancer for both
 * charts"), which is NOT rendered: the backend generates it in English only, as grounding
 * for the narrative prompt, and its own doc comment marks it as not-for-display. The
 * translated prose that explains these areas is in the report's own sections.
 */
export default function LifeAreaGrid({ areas, benefitCount, cautionCount }: LifeAreaGridProps) {
  const { t } = useTranslation();
  if (areas.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h2 className="font-display text-base text-gold">{t("kundliMilanReport.areas.title")}</h2>
        <p className="text-[11px] text-muted shrink-0">
          {t("kundliMilanReport.areas.counts", { benefit: benefitCount, caution: cautionCount })}
        </p>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {areas.map((area) => {
            const Icon = AREA_ICON[area.key];
            return (
              <div
                key={area.key}
                // px-1 not px-2: the longest Tamil labels ("ஆரோக்கியம்") span the full tile
                // at 4 columns on a 390px viewport and would otherwise touch the border.
                className={`rounded-xl border px-1 py-2.5 flex flex-col items-center gap-1.5 text-center ${SEVERITY_STYLE[area.severity]}`}
              >
                <Icon size={16} aria-hidden />
                <span className="text-[10px] leading-tight font-medium">
                  {t(`kundliMilanReport.areas.label.${area.key}`)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
