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

/** health_monthly has 3 sections. */
const SECTION_ICON: Record<string, string> = {
  this_months_outlook: "Sparkles",
  health_balance_this_month: "Activity",
  practical_guidance: "Scale",
};

/**
 * The bespoke Health (monthly) screen.
 *
 * Almost entirely the shared monthly set built with the Career screen — this report computes
 * the same core and adds only `connectedHouses` (which of its key houses the active Antardasha
 * lord actually touches). That field is NOT rendered: it is a list of house numbers whose
 * meaning lives in the narrative, and a bare "6, 8, 12" chip row would read as jargon rather
 * than information.
 *
 * No remedies (extends ReportSharedFacts, not the WithRemedies variant), and no timing
 * windows or age bands — those are lifetime constructs; the sub-period strip is the monthly
 * equivalent.
 */
export default function HealthReportView({ data }: { data: ReportReady }) {
  const scores = data.scores;
  const view = buildMonthlyView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <MonthOutlookCard
        score={view.score}
        tone={view.tone}
        mahadashaLord={view.mahadashaLord}
        antardashaLord={view.antardashaLord}
        periodLabel={view.periodMonth ? formatPeriodMonth(view.periodMonth) : null}
        titleKey="healthReport.outlook.title"
        toneKeyPrefix="monthlyReport.tone"
        headline={verdict?.headline ?? null}
      />

      <SubPeriodStrip subPeriods={view.subPeriods} titleKey="healthReport.subPeriods.title" />

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="healthReport.analysis.title"
      />

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="healthReport.strengths"
          cautionsKey="healthReport.cautions"
        />
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
