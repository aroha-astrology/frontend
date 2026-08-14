"use client";

import { useTranslation } from "react-i18next";
import { PiggyBank, TrendingUp } from "lucide-react";
import { buildWealthView, SECTION_ICON } from "@/lib/wealth-report-view";
import {
  isAgeBandArray,
  isArchetype,
  isDecadeBandArray,
  isDoshaYogaSummary,
  isGemstoneArray,
  isRankedWindowArray,
  isReportHeader,
  isReportVerdict,
} from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import ReportGemstonesCard from "../ReportGemstonesCard";
import ArchetypeCard from "../ArchetypeCard";
import DecadeArcCard from "../DecadeArcCard";
import AgeBandHeatStrip from "../AgeBandHeatStrip";
import AnalysisAccordion from "../AnalysisAccordion";
import StrengthsCautions from "../StrengthsCautions";
import TopWindowCard from "../TopWindowCard";
import TiltGauge from "../TiltGauge";
import WealthScoreCard from "./WealthScoreCard";
import IncomePathsCard from "./IncomePathsCard";
import type { ReportReady } from "@/hooks/useReport";

/**
 * The bespoke Wealth screen — the fourth report to get this treatment, and the first built
 * entirely on components that already existed.
 *
 * Presentation only: every value comes from the `scores` / `sections` the API already returns,
 * mapped by lib/wealth-report-view.ts. No extra fetches, no backend fields added. Every block
 * self-hides when its data is absent.
 *
 * Only two pieces are specific to this report — WealthScoreCard (the score plus the three
 * significators behind it) and IncomePathsCard (the salaried/business/property read, which no
 * other report computes). Everything else is the shared set. `spendingVsSavingTilt` reuses
 * TiltGauge outright: the backend documents it as the same formula shape as true_love's
 * `loveVsArrangedTilt`, so it is the same component with a different axis and palette.
 *
 * One design element the sheet offers that is NOT rendered: a per-planet wealth strip like
 * marriage's. This report exposes each significator's STRENGTH but never the planet ruling the
 * 2nd or 11th house, so the rows are labelled by role and carry no planet art — see
 * WealthScoreCard's doc comment.
 */
export default function WealthReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const view = buildWealthView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <WealthScoreCard
        score={view.score}
        band={view.band}
        pattern={view.pattern}
        significators={view.significators}
        headline={verdict?.headline ?? null}
      />

      <IncomePathsCard paths={view.incomePaths} />

      {view.tilt && (
        <TiltGauge
          tilt={view.tilt}
          titleKey="wealthReport.tilt.title"
          leanKeyPrefix="wealthReport.tilt.lean"
          lowKey="wealthReport.tilt.saving"
          highKey="wealthReport.tilt.spending"
          LowIcon={PiggyBank}
          HighIcon={TrendingUp}
          trackClass="from-emerald-500/30 via-border to-amber-500/30"
        />
      )}

      {isRankedWindowArray(scores.windows) && (
        <TopWindowCard
          windows={scores.windows}
          titleKey="wealthReport.timing.title"
          labelKey="wealthReport.timing.strongPeriod"
        />
      )}

      {isAgeBandArray(scores.ageBands) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("wealthReport.ageBands.title")}
          </h2>
          <AgeBandHeatStrip bands={scores.ageBands} />
        </section>
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="wealthReport.analysis.title"
      />

      {isArchetype(scores.moneyArchetype) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("wealthReport.archetype.title")}
          </h2>
          <ArchetypeCard archetype={scores.moneyArchetype} />
        </section>
      )}

      {isDecadeBandArray(scores.wealthArc) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("wealthReport.decade.title")}
          </h2>
          <DecadeArcCard bands={scores.wealthArc} />
        </section>
      )}

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="wealthReport.strengths"
          cautionsKey="wealthReport.cautions"
        />
      )}

      {isGemstoneArray(scores.gemstones) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("wealthReport.remedies.title")}
          </h2>
          <ReportGemstonesCard gemstones={scores.gemstones} />
        </section>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
