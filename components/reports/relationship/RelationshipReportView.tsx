"use client";

import { buildMonthlyView } from "@/lib/monthly-report-view";
import { formatPeriodMonth } from "@/lib/reports-logic";
import { isDoshaYogaSummary, isReportHeader, isReportVerdict } from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import AnalysisAccordion from "../AnalysisAccordion";
import StrengthsCautions from "../StrengthsCautions";
import MonthOutlookCard from "../monthly/MonthOutlookCard";
import SubPeriodStrip from "../monthly/SubPeriodStrip";
import type { ReportReady } from "@/hooks/useReport";

/** relationship_monthly has 4 sections. */
const SECTION_ICON: Record<string, string> = {
  this_months_outlook: "Sparkles",
  practical_guidance: "Scale",
  blessings_cautions: "ShieldAlert",
  friction_reconciliation_dating_timing: "CalendarHeart",
};

/**
 * The bespoke Relationship (monthly) screen — the fourth monthly report, and the
 * last one that was still on the plain layout.
 *
 * It is the shared monthly set built with the Career screen, unchanged: this
 * report computes the same core (backend astro-engine/reports/
 * relationship-monthly.ts) plus `relationshipStatus`, which is NOT rendered —
 * it is the reader's own account setting, there so the narrative can speak to
 * someone single differently from someone married, not a fact to show back.
 *
 * The sub-period strip matters most here: it is what answers "which days this
 * month are best for an important conversation".
 */
export default function RelationshipReportView({ data }: { data: ReportReady }) {
  const scores = data.scores;
  const view = buildMonthlyView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <MonthOutlookCard
        tone={view.tone}
        mahadashaLord={view.mahadashaLord}
        antardashaLord={view.antardashaLord}
        periodLabel={view.periodMonth ? formatPeriodMonth(view.periodMonth) : null}
        titleKey="relationshipReport.outlook.title"
        toneKeyPrefix="monthlyReport.tone"
        headline={verdict?.headline ?? null}
      />

      <SubPeriodStrip subPeriods={view.subPeriods} titleKey="relationshipReport.subPeriods.title" />

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="relationshipReport.analysis.title"
      />

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="relationshipReport.strengths"
          cautionsKey="relationshipReport.cautions"
        />
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
