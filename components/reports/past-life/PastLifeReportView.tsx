"use client";

import { buildPastLifeView, SECTION_ICON } from "@/lib/past-life-report-view";
import { isDoshaYogaSummary, isReportHeader, isReportVerdict } from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import AnalysisAccordion from "../AnalysisAccordion";
import StrengthsCautions from "../StrengthsCautions";
import KarmicAxisCard from "./KarmicAxisCard";
import type { ReportReady } from "@/hooks/useReport";

/**
 * The bespoke Past Life screen.
 *
 * The whole report hangs off one structure — the Rahu/Ketu axis — so unlike the other screens
 * this one leads with a single card rather than a score. There is no score to show: this report
 * computes no numeric rating at all, and inventing one (say, from the 12th lord's strength)
 * would present a number the backend never stood behind.
 *
 * Its `doshaYoga` is a Kaal Sarp check on the node axis specifically, which is why it sits
 * directly under the axis card rather than at the bottom as on the other screens.
 *
 * No gemstones — extends ReportSharedFacts, not the WithGemstones variant.
 */
export default function PastLifeReportView({ data }: { data: ReportReady }) {
  const scores = data.scores;
  const view = buildPastLifeView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <KarmicAxisCard
        rahu={view.rahu}
        ketu={view.ketu}
        archetype={view.archetype}
        twelfthLordStrength={view.twelfthLordStrength}
        conjunctPlanets={view.conjunctPlanets}
      />

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="pastLifeReport.strengths"
          cautionsKey="pastLifeReport.cautions"
        />
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="pastLifeReport.analysis.title"
      />

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
