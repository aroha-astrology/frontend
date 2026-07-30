"use client";

import { useTranslation } from "react-i18next";
import MatchCard from "./MatchCard";
import { MATCH_RISK_AREA_ORDER, type MatchRiskAreaKey, type MatchRiskFactor, type ReportSection } from "@/lib/reports-api";

interface MatchCardEntry {
  key: MatchRiskAreaKey;
  section: ReportSection;
  factor: MatchRiskFactor;
}

interface MatchReportCardsProps {
  /** sections[0..7] — one per life area, in MATCH_RISK_AREA_ORDER (see match-report.ts's LLM module). */
  sections: ReportSection[];
  riskFactors: MatchRiskFactor[];
}

/**
 * Groups the 8 life-area cards by their DETERMINISTIC severity (never the AI's framing) into
 * Benefits / General / Cautions — this is the "good gunas doesn't mean no risks" surface the
 * report exists for: a caution here shows regardless of how high the overall Guna score is.
 */
export default function MatchReportCards({ sections, riskFactors }: MatchReportCardsProps) {
  const { t } = useTranslation();
  const byKey = new Map(riskFactors.map((f) => [f.key, f]));

  const cards = MATCH_RISK_AREA_ORDER.map((key, i) => {
    const section = sections[i];
    const factor = byKey.get(key);
    if (!section || !factor) return null;
    return { key, section, factor };
  }).filter((c): c is MatchCardEntry => c !== null);

  const benefits = cards.filter((c) => c.factor.severity === "benefit");
  const general = cards.filter((c) => c.factor.severity === "neutral");
  const cautions = cards.filter((c) => c.factor.severity === "caution" || c.factor.severity === "serious");

  const renderGroup = (title: string, group: typeof cards) => {
    if (group.length === 0) return null;
    return (
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-gold uppercase tracking-wider">{title}</p>
        <div className="space-y-2.5">
          {group.map((c) => (
            <MatchCard
              key={c.key}
              hook={c.section.heading}
              body={c.section.paragraphs.join(" ")}
              severity={c.factor.severity}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {renderGroup(t("compatibilityPage.report.benefits"), benefits)}
      {renderGroup(t("compatibilityPage.report.general"), general)}
      {renderGroup(t("compatibilityPage.report.cautions"), cautions)}
    </div>
  );
}
