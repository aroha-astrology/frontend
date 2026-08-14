"use client";

import { useTranslation } from "react-i18next";
import { Heart, Users } from "lucide-react";
import { buildTrueLoveView, SECTION_ICON } from "@/lib/true-love-report-view";
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
import LoveDialsCard from "./LoveDialsCard";

import type { ReportReady } from "@/hooks/useReport";

/**
 * The bespoke True Love screen — the third report to get this treatment.
 *
 * Presentation only: every value comes from the `scores` / `sections` the API already
 * returns, mapped by lib/true-love-report-view.ts. No extra fetches, no backend fields
 * added for this screen. Every block self-hides when its data is absent.
 *
 * Almost entirely composition. This report's scoring shape is close to marriage's
 * (score + windows + ageBands + archetype + decade arc + doshaYoga), so the cards those
 * two share are the ones marriage already uses — TopWindowCard, ArchetypeCard,
 * DecadeArcCard, AgeBandHeatStrip, StrengthsCautions, AnalysisAccordion. Only two pieces
 * are specific to this report, and both exist because this report computes something
 * marriage does not:
 *   - LoveDialsCard, because romance and partnership are scored SEPARATELY here.
 *   - TiltGauge, for `loveVsArrangedTilt`, which has no equivalent anywhere else.
 *
 * `partnerArchetype` gets its own card rather than being merged into the first: it is
 * themed on the 7th house (who you are drawn to) while `archetype` is themed on the 5th
 * (how you love), and collapsing them would misattribute one to the other.
 */
export default function TrueLoveReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const view = buildTrueLoveView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <LoveDialsCard
        romance={view.romance}
        partnership={view.partnership}
        headline={verdict?.headline ?? null}
      />

      {view.tilt && (
        <TiltGauge
          tilt={view.tilt}
          titleKey="trueLoveReport.tilt.title"
          leanKeyPrefix="trueLoveReport.tilt.lean"
          lowKey="trueLoveReport.tilt.arranged"
          highKey="trueLoveReport.tilt.love"
          LowIcon={Users}
          HighIcon={Heart}
          trackClass="from-sky-500/30 via-border to-rose-500/30"
        />
      )}

      {isRankedWindowArray(scores.windows) && (
        <TopWindowCard
          windows={scores.windows}
          titleKey="trueLoveReport.timing.title"
          labelKey="trueLoveReport.timing.strongPeriod"
        />
      )}

      {isAgeBandArray(scores.ageBands) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("trueLoveReport.ageBands.title")}
          </h2>
          <AgeBandHeatStrip bands={scores.ageBands} />
        </section>
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="trueLoveReport.analysis.title"
      />

      {isArchetype(scores.archetype) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("trueLoveReport.archetype.title")}
          </h2>
          <ArchetypeCard archetype={scores.archetype} />
        </section>
      )}

      {isArchetype(scores.partnerArchetype) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("trueLoveReport.partnerArchetype.title")}
          </h2>
          <ArchetypeCard archetype={scores.partnerArchetype} />
        </section>
      )}

      {isDecadeBandArray(scores.romanceArc) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("trueLoveReport.decade.title")}
          </h2>
          <DecadeArcCard bands={scores.romanceArc} />
        </section>
      )}

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="trueLoveReport.strengths"
          cautionsKey="trueLoveReport.cautions"
        />
      )}

      {isGemstoneArray(scores.gemstones) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("trueLoveReport.remedies.title")}
          </h2>
          <ReportGemstonesCard gemstones={scores.gemstones} />
        </section>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
