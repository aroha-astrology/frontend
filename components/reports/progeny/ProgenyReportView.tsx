"use client";

import { buildProgenyView, SECTION_ICON } from "@/lib/progeny-report-view";
import {
  isDoshaYogaSummary,
  isRankedWindowArray,
  isReportHeader,
  isReportVerdict,
} from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import AnalysisAccordion from "../AnalysisAccordion";
import StrengthsCautions from "../StrengthsCautions";
import TopWindowCard from "../TopWindowCard";
import ProgenyOutlookCard from "./ProgenyOutlookCard";
import CapacityCard from "./CapacityCard";
import ChildSequenceCard from "./ChildSequenceCard";
import ChildrenCard from "./ChildrenCard";
import ProgenyMantraCard from "./ProgenyMantraCard";
import type { ReportReady } from "@/hooks/useReport";

/**
 * The bespoke Progeny screen -- built entirely on shared components plus five report-specific
 * ones (ProgenyOutlookCard, CapacityCard, ChildSequenceCard, ChildrenCard, ProgenyMantraCard),
 * the same "mostly reuse" shape as WealthReportView.
 *
 * Presentation only: every value comes from the `scores`/`sections` the API already returns,
 * mapped by lib/progeny-report-view.ts. No extra fetches, no backend fields added here.
 *
 * `ChildrenCard` (the 35+ retrospective card) is the one block whose absence IS the feature --
 * `view.childrenCard` is `null` for every reader under 35 (see the backend's
 * `computeChildrenCard` doc comment), so this screen needs no age check of its own.
 */
export default function ProgenyReportView({ data }: { data: ReportReady }) {
  const scores = data.scores;
  const view = buildProgenyView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <ProgenyOutlookCard band={view.coupleConvergence} />

      <ChildrenCard card={view.childrenCard} />

      <CapacityCard mother={view.motherPromise} father={view.fatherPromise} />

      <ChildSequenceCard slots={view.childSequence} />

      {isRankedWindowArray(scores.windows) && (
        <TopWindowCard
          windows={scores.windows}
          titleKey="progenyReport.timing.title"
          labelKey="progenyReport.timing.strongPeriod"
        />
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="progenyReport.analysis.title"
      />

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="progenyReport.strengths"
          cautionsKey="progenyReport.cautions"
        />
      )}

      <ProgenyMantraCard planetStrength={scores.planetStrength} />

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
