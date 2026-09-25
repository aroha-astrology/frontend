"use client";

import { useState } from "react";
import { buildKpAnnualView, SECTION_ICON } from "@/lib/kp-annual-report-view";
import { isReportHeader, isReportVerdict } from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import AnalysisAccordion from "../AnalysisAccordion";
import KpYearGlanceCard from "./KpYearGlanceCard";
import KpLifeAreasCard from "./KpLifeAreasCard";
import KpYearHeatmap from "./KpYearHeatmap";
import KpMonthsCard from "./KpMonthsCard";
import KpDashaCard from "./KpDashaCard";
import KpTransitsCard from "./KpTransitsCard";
import KpQuestionsCard from "./KpQuestionsCard";
import KpRulingPlanetsCard from "./KpRulingPlanetsCard";
import KpCuspTable from "./KpCuspTable";
import type { ReportReady } from "@/hooks/useReport";

/**
 * The bespoke KP Year Ahead screen. Follows the canonical block order in
 * designed-screens.tsx: header, hero card, bespoke key facts, timing, the narrative, verdict.
 *
 * The reader's own questions sit right after the opening card — they paid for those answers
 * and should not have to scroll to find them. The year heatmap and the month carousel share
 * one selected month so a tap on either keeps the two in step.
 *
 * Presentation only: every value comes from `scores`/`sections`, mapped by
 * lib/kp-annual-report-view.ts. No score is rendered anywhere — the report judges in words.
 */
export default function KpAnnualReportView({ data }: { data: ReportReady }) {
  const scores = data.scores;
  const view = buildKpAnnualView(scores, data.sections);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;
  const [month, setMonth] = useState(0);

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <KpYearGlanceCard view={view} headline={verdict?.headline ?? null} />

      <KpQuestionsCard questions={view.questions} />

      <KpLifeAreasCard areas={view.areas} />

      <KpYearHeatmap months={view.months} selected={month} onSelect={setMonth} />

      <KpMonthsCard months={view.months} selected={month} onSelect={setMonth} />

      <KpDashaCard view={view} />

      <KpTransitsCard view={view} />

      <AnalysisAccordion
        sections={view.narrative}
        sectionIcon={SECTION_ICON}
        titleKey="kpAnnualReport.analysis.title"
      />

      <KpRulingPlanetsCard planets={view.rulingPlanets} />

      <KpCuspTable cusps={view.cusps} />

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
