"use client";

import { useTranslation } from "react-i18next";
import { buildMonthlyView } from "@/lib/monthly-report-view";
import { formatPeriodMonth } from "@/lib/reports-logic";
import {
  isArchetype,
  isDoshaYogaSummary,
  isReportHeader,
  isReportVerdict,
} from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import ArchetypeCard from "../ArchetypeCard";
import AnalysisAccordion from "../AnalysisAccordion";
import StrengthsCautions from "../StrengthsCautions";
import MonthOutlookCard from "../monthly/MonthOutlookCard";
import SubPeriodStrip from "../monthly/SubPeriodStrip";
import IndustryFitCard from "./IndustryFitCard";
import type { ReportReady } from "@/hooks/useReport";

/** Canonical section id -> lucide icon name. career_monthly has only 4 sections. */
const SECTION_ICON: Record<string, string> = {
  this_months_outlook: "Sparkles",
  your_work_style: "UserRound",
  support_obstacles_this_month: "Scale",
  industries_that_fit: "Briefcase",
};

/**
 * The bespoke Career (monthly) screen — the fifth report to get this treatment, and the first
 * MONTHLY one.
 *
 * Most of it is not career-specific at all. career_monthly, health_monthly, finance_monthly and
 * relationship_monthly compute an identical core (period, dasha lords, month score, tone,
 * doshaYoga, sub-periods), so that part lives in components/reports/monthly/ and
 * lib/monthly-report-view.ts, built shared from this first screen rather than after the third.
 * Only IndustryFitCard and the work archetype are actually about careers.
 *
 * Two things the other report screens have that this one does NOT, both checked rather than
 * assumed:
 *   - no gemstones. `CareerMonthlyScores` extends `ReportSharedFacts`, not the
 *     `...WithGemstones` variant, so this report never computes them.
 *   - no timing windows or age bands. Those are lifetime constructs; a monthly report's
 *     equivalent is the within-month sub-period strip.
 */
export default function CareerReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const view = buildMonthlyView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;
  const industries = Array.isArray((scores.industryFit as { likelyIndustries?: unknown })?.likelyIndustries)
    ? ((scores.industryFit as { likelyIndustries: unknown[] }).likelyIndustries.filter(
        (i): i is string => typeof i === "string"
      ))
    : [];

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <MonthOutlookCard
        score={view.score}
        tone={view.tone}
        mahadashaLord={view.mahadashaLord}
        antardashaLord={view.antardashaLord}
        periodLabel={view.periodMonth ? formatPeriodMonth(view.periodMonth) : null}
        titleKey="careerReport.outlook.title"
        toneKeyPrefix="monthlyReport.tone"
        headline={verdict?.headline ?? null}
      />

      <SubPeriodStrip subPeriods={view.subPeriods} titleKey="careerReport.subPeriods.title" />

      <IndustryFitCard industries={industries} />

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="careerReport.analysis.title"
      />

      {isArchetype(scores.workArchetype) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("careerReport.archetype.title")}
          </h2>
          <ArchetypeCard archetype={scores.workArchetype} />
        </section>
      )}

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="careerReport.strengths"
          cautionsKey="careerReport.cautions"
        />
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
