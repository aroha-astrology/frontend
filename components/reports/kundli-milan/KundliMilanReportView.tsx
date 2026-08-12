"use client";

import { useTranslation } from "react-i18next";
import { buildKundliMilanView, SECTION_ICON } from "@/lib/kundli-milan-report-view";
import {
  isDoshaYogaSummary,
  isGemstoneArray,
  isReportHeader,
  isReportVerdict,
} from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import ReportGemstonesCard from "../ReportGemstonesCard";
import GunaKootaBreakdown from "../GunaKootaBreakdown";
import AnalysisAccordion from "../AnalysisAccordion";
import StrengthsCautions from "../StrengthsCautions";
import MilanScoreCard from "./MilanScoreCard";
import ManglikCard from "./ManglikCard";
import LifeAreaGrid from "./LifeAreaGrid";
import type { ReportReady } from "@/hooks/useReport";

/**
 * The bespoke Kundli Milan screen — the second report to get this treatment, following
 * components/reports/marriage/.
 *
 * Presentation only: every value comes from the `scores` / `sections` the API already
 * returns, mapped by lib/kundli-milan-report-view.ts. No extra fetches, no backend fields
 * added for this screen. Every block self-hides when its data is absent, so an older
 * report renders fewer sections rather than breaking.
 *
 * Mostly composition, deliberately. GunaKootaBreakdown was already extracted (by the
 * match_report work) to serve this exact report, and handles the 36-point Ashtakoota and
 * the 10-point Dashakoota identically; AnalysisAccordion and StrengthsCautions were lifted
 * out of marriage/ here rather than copied. The genuinely new pieces are the three in this
 * folder.
 *
 * Two things the design sheet offers that are NOT rendered, each for a checked reason:
 *   - a symmetric You/Partner panel beyond Mangal Dosha. `primaryDoshaYoga`, `header`,
 *     `lifeContext` and `gemstones` are all scoped to the PURCHASING user's chart by
 *     explicit backend design (the partner chart is never run through the dosha/yoga
 *     analysis, and kundli-milan.ts's own doc comment says fabricating it would be worse
 *     than omitting it). Mangal Dosha is the one two-sided fact, and it gets its own card.
 *   - the Navamsa (D9) charts, which the backend does compute for BOTH people. `vargas` /
 *     `partnerVargas` are sign-placement maps ({planet: sign}), not the renderable shape
 *     ui/VargaChartTabs takes, and drawing them would mean shipping untranslated planet
 *     and sign names — the app's known open i18n gap. Left out rather than half-done.
 *
 * Every other report type still renders through the generic path in
 * app/reports/[id]/page.tsx; this component is reached only for reportKey "kundli_milan".
 */
export default function KundliMilanReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const view = buildKundliMilanView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <MilanScoreCard guna={view.guna} band={view.band} headline={verdict?.headline ?? null} />

      {view.manglik && <ManglikCard manglik={view.manglik} />}

      <LifeAreaGrid
        areas={view.areas}
        benefitCount={view.benefitCount}
        cautionCount={view.cautionCount}
      />

      {view.gunaBreakdown.length > 0 && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("kundliMilanReport.guna.title")}
          </h2>
          {/* Summary suppressed: MilanScoreCard above already shows this exact total, banded
              by the backend's classical 36-point rule. See GunaKootaBreakdown's showSummary
              doc for why the two verdicts would otherwise disagree at 27/36. */}
          <GunaKootaBreakdown entries={view.gunaBreakdown} showSummary={false} />
        </section>
      )}

      {view.dashakootaBreakdown.length > 0 && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("kundliMilanReport.dashakoota.title")}
          </h2>
          <GunaKootaBreakdown entries={view.dashakootaBreakdown} />
        </section>
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="kundliMilanReport.analysis.title"
      />

      {isDoshaYogaSummary(scores.primaryDoshaYoga) && (
        <section>
          {/* Explicitly labelled as the purchasing user's own chart — an unlabelled
              Strengths/Cautions panel on a two-person report would read as being about
              the couple, which this data is not. */}
          <h2 className="font-display text-base text-gold mb-2">
            {t("kundliMilanReport.yourChart.title")}
          </h2>
          <StrengthsCautions
            summary={scores.primaryDoshaYoga}
            strengthsKey="kundliMilanReport.strengths"
            cautionsKey="kundliMilanReport.cautions"
          />
        </section>
      )}

      {isGemstoneArray(scores.gemstones) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("kundliMilanReport.remedies.title")}
          </h2>
          <ReportGemstonesCard gemstones={scores.gemstones} />
        </section>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
