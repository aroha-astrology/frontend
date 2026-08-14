"use client";

import { useTranslation } from "react-i18next";
import {
  isChallengeNumbers,
  isLoShuGrid,
  isMonthlyForecastArray,
  isNamePlanes,
  isNumberArray,
  isReportHeader,
  isReportVerdict,
  isYearlyForecastArray,
} from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import AnalysisAccordion from "../AnalysisAccordion";
import LoShuGridCard from "../LoShuGridCard";
import ChallengeNumbersCard from "../ChallengeNumbersCard";
import NamePlanesCard from "../NamePlanesCard";
import NumberChips from "../NumberChips";
import ForecastTable from "../ForecastTable";
import CoreNumbersCard, { type CoreNumber } from "./CoreNumbersCard";
import type { ReportReady } from "@/hooks/useReport";

/** numerology has 8 sections. */
const SECTION_ICON: Record<string, string> = {
  core_numbers: "Sparkles",
  expression_soul_urge_personality: "UserRound",
  name_supports_numbers: "Scale",
  loshu_grid_name_planes: "Layers",
  challenge_numbers_kua_element: "Flame",
  this_year_this_month: "CalendarHeart",
  twelve_month_forecast: "TrendingUp",
  luckiest_days_colors_years: "Home",
};

/** The six core numbers, in the order the report's own first section introduces them. */
const CORE_KEYS = ["mulank", "bhagyank", "lifePath", "expression", "soulUrge", "personality"] as const;

/**
 * The bespoke Numerology screen — the richest report by field count, and almost entirely
 * composition despite it.
 *
 * Every distinctive block this report needs already existed, built for the generic
 * ReportScoreFacts renderer: LoShuGridCard, ChallengeNumbersCard, NamePlanesCard, NumberChips
 * and ForecastTable. Only the core-numbers grid is new, and only because the generic renderer
 * showed those six as ordinary labelled rows rather than as the headline they are.
 *
 * The forecast tables reuse the same column sets ReportScoreFacts declares, so the two surfaces
 * cannot drift into labelling the same data differently.
 *
 * No score ring anywhere: numerology produces no rating, and every number here is an identity,
 * not a measurement. No gemstones either — this report does no chart analysis at all.
 */
export default function NumerologyReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  const coreNumbers: CoreNumber[] = CORE_KEYS.flatMap((key) => {
    const value = scores[key];
    return typeof value === "number" && Number.isFinite(value) ? [{ key, value }] : [];
  });

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      {verdict?.headline && (
        <p className="text-[13px] leading-relaxed text-muted px-0.5">{verdict.headline}</p>
      )}

      <CoreNumbersCard numbers={coreNumbers} />

      {isNumberArray(scores.luckyNumbers) && scores.luckyNumbers.length > 0 && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("numerologyReport.lucky.title")}
          </h2>
          <NumberChips values={scores.luckyNumbers} />
        </section>
      )}

      {isLoShuGrid(scores.loShuGrid) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("numerologyReport.loShu.title")}
          </h2>
          <LoShuGridCard value={scores.loShuGrid} />
        </section>
      )}

      {isNamePlanes(scores.namePlanes) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("numerologyReport.namePlanes.title")}
          </h2>
          <NamePlanesCard value={scores.namePlanes} />
        </section>
      )}

      {isChallengeNumbers(scores.challengeNumbers) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("numerologyReport.challenges.title")}
          </h2>
          <ChallengeNumbersCard value={scores.challengeNumbers} />
        </section>
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="numerologyReport.analysis.title"
      />

      {isMonthlyForecastArray(scores.monthlyForecast) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("numerologyReport.monthly.title")}
          </h2>
          <ForecastTable
            rows={scores.monthlyForecast}
            columns={[
              { key: "month", labelKey: "reports.facts.numerology.colMonth" },
              { key: "year", labelKey: "reports.facts.numerology.colYear" },
              { key: "personalMonth", labelKey: "reports.facts.numerology.colPersonalMonth" },
              { key: "personalYear", labelKey: "reports.facts.numerology.colPersonalYear" },
            ]}
          />
        </section>
      )}

      {isYearlyForecastArray(scores.yearlyForecast) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("numerologyReport.yearly.title")}
          </h2>
          <ForecastTable
            rows={scores.yearlyForecast}
            columns={[
              { key: "year", labelKey: "reports.facts.numerology.colYear" },
              { key: "personalYear", labelKey: "reports.facts.numerology.colPersonalYear" },
            ]}
          />
        </section>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
