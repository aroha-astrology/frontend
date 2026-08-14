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

/** finance_monthly has 3 sections. */
const SECTION_ICON: Record<string, string> = {
  this_months_outlook: "Sparkles",
  dosha_yoga_check: "Flame",
  practical_guidance: "Scale",
};

/**
 * The bespoke Finance (monthly) screen.
 *
 * Entirely the shared monthly set built with the Career screen — this report adds nothing
 * beyond the common core, which is exactly why it was worth building that set shared first.
 *
 * Its `doshaYoga` block carries POSITIVES ONLY by backend design: every traditional dosha is a
 * fixed natal (or multi-year transiting) condition, so surfacing one on a single-month report
 * would repeat the same caution every month it is bought. StrengthsCautions already drops an
 * empty column and widens the other, so that renders correctly without special-casing here.
 *
 * No gemstones (extends ReportSharedFacts, not the WithGemstones variant), and no timing
 * windows or age bands — those are lifetime constructs; the sub-period strip is the monthly
 * equivalent.
 */
export default function FinanceReportView({ data }: { data: ReportReady }) {
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
        titleKey="financeReport.outlook.title"
        toneKeyPrefix="monthlyReport.tone"
        headline={verdict?.headline ?? null}
      />

      <SubPeriodStrip subPeriods={view.subPeriods} titleKey="financeReport.subPeriods.title" />

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="financeReport.analysis.title"
      />

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="financeReport.strengths"
          cautionsKey="financeReport.cautions"
        />
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
