"use client";

import { useTranslation } from "react-i18next";
import { buildPastLifeView, SECTION_ICON } from "@/lib/past-life-report-view";
import {
  isDecadeBandArray,
  isDoshaYogaSummary,
  isReportHeader,
  isReportVerdict,
} from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import AnalysisAccordion from "../AnalysisAccordion";
import DecadeArcCard from "../DecadeArcCard";
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
 * No gemstones — extends ReportSharedFacts, not the WithGemstones variant.
 */
export default function PastLifeReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
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

      {/* The already-lived chapters of THIS life (scores.lifeSoFar). Reuses DecadeArcCard —
          the backend emits the same DecadeBand shape the forward-looking arcs use, so the
          chart + per-period tone rows come for free. Sits above the narrative because the
          "Your Life So Far" section reads as commentary on exactly this table. Absent on
          reports generated before this shipped, and on charts with no derivable dasha. */}
      {isDecadeBandArray(scores.lifeSoFar) && (
        <section>
          <h2 className="mb-2 font-display text-base text-gold">
            {t("pastLifeReport.lifeSoFar.title")}
          </h2>
          <DecadeArcCard bands={scores.lifeSoFar} />
        </section>
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="pastLifeReport.analysis.title"
      />

      {/* Strengths & Cautions (this report's Kaal Sarp check on the node axis) — moved here,
          after the narrative, so every designed screen shows it in the SAME position (see
          designed-screens.tsx's canonical order); it used to sit directly under the axis card. */}
      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="pastLifeReport.strengths"
          cautionsKey="pastLifeReport.cautions"
        />
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
