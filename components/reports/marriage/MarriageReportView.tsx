"use client";

import { useTranslation } from "react-i18next";
import { buildMarriageView } from "@/lib/marriage-report-view";
import {
  isDecadeBandArray,
  isDoshaYogaSummary,
  isGemstoneArray,
  isRankedWindowArray,
  isReportHeader,
  isReportVerdict,
} from "@/lib/report-score-facts";
import { SECTION_ICON } from "@/lib/marriage-report-view";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import ReportGemstonesCard from "../ReportGemstonesCard";
import ArchetypeCard from "../ArchetypeCard";
import DecadeArcCard from "../DecadeArcCard";
import AnalysisAccordion from "../AnalysisAccordion";
import TopWindowCard from "../TopWindowCard";
import StrengthsCautions from "../StrengthsCautions";
import OutlookCard from "./OutlookCard";
import HighlightTiles from "./HighlightTiles";
import PlanetImpactStrip from "./PlanetImpactStrip";
import SeventhHouseCard from "./SeventhHouseCard";
import type { ReportReady } from "@/hooks/useReport";

/**
 * The bespoke Marriage Report screen, built to the supplied visual mock.
 *
 * Presentation only: every value comes from the `scores` / `sections` / `verdict`
 * the API already returns, mapped by lib/marriage-report-view.ts. No extra fetches,
 * no backend fields added for this screen. Every block self-hides when its data is
 * absent, so an older report simply renders fewer sections rather than breaking.
 *
 * Two things in the mock have no data behind them on this report and are
 * deliberately not rendered:
 *   - the You/Partner compatibility rings — `marriage` is a single-person report;
 *     partner scoring only exists on kundli_milan / match_report.
 *   - fasting/donation/mantra remedies — the marriage generator is explicitly
 *     prompted not to recommend those, so the Remedies slot shows the gemstones
 *     it does produce.
 *
 * Every other report type still renders through the generic path in
 * app/reports/[id]/page.tsx; this component is reached only for reportKey "marriage".
 */
export default function MarriageReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const view = buildMarriageView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <OutlookCard score={view.score} band={view.band} headline={verdict?.headline ?? null} />

      <HighlightTiles
        tiles={view.highlights}
        positiveCount={view.positiveCount}
        cautionCount={view.cautionCount}
      />

      {isRankedWindowArray(scores.windows) && (
        <TopWindowCard
          windows={scores.windows}
          titleKey="marriageReport.timing.title"
          labelKey="marriageReport.timing.strongPeriod"
        />
      )}

      <PlanetImpactStrip planets={view.planets} />

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="marriageReport.analysis.title"
      />

      <SeventhHouseCard facts={view.seventhHouse} />

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="marriageReport.strengths"
          cautionsKey="marriageReport.cautions"
        />
      )}

      {view.archetype && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">{t("marriageReport.spouse.title")}</h2>
          <ArchetypeCard archetype={view.archetype} />
        </section>
      )}

      {isDecadeBandArray(scores.marriageQualityArc) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">{t("marriageReport.decade.title")}</h2>
          <DecadeArcCard bands={scores.marriageQualityArc} />
        </section>
      )}

      {isGemstoneArray(scores.gemstones) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">{t("marriageReport.remedies.title")}</h2>
          <ReportGemstonesCard gemstones={scores.gemstones} />
        </section>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
