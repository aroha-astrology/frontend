"use client";

import { useTranslation } from "react-i18next";
import {
  isChallengeNumbers,
  isLoShuGrid,
  isMobileNumberAnalysis,
  isMonthlyForecastArray,
  isNamePlanes,
  isNumberArray,
  isReportHeader,
  isReportVerdict,
  isYearlyForecastArray,
} from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import Callout from "../blocks/Callout";
import AnalysisAccordion from "../AnalysisAccordion";
import StrengthsCautions from "../StrengthsCautions";
import NameSuggestionCard from "../NameSuggestionCard";
import LoShuGridCard from "../LoShuGridCard";
import ChallengeNumbersCard from "../ChallengeNumbersCard";
import NamePlanesCard from "../NamePlanesCard";
import NumberChips from "../NumberChips";
import ForecastTable from "../ForecastTable";
import CoreNumbersCard, { type CoreNumber } from "./CoreNumbersCard";
import PhoneVibrationCard from "./PhoneVibrationCard";
import type { ReportReady } from "@/hooks/useReport";

/** numerology has 8 sections, plus a 9th (phone_number_alignment) ONLY for a reader with a
 * phone number to read — see NumerologyScores.phoneNumber's doc comment on the backend. That
 * 9th section is pulled OUT of `data.sections` below (see `phoneSection`) and rendered as its
 * own dedicated block instead of through this accordion, since AnalysisAccordion only renders
 * `paragraphs`/`bullets` — it has no concept of `items` (the phone suggestion cards need
 * NameSuggestionCard, same as name_change's own suggested-names section). */
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

  const phoneSection = data.sections.find((s) => s.id === "phone_number_alignment");
  const accordionSections = phoneSection
    ? data.sections.filter((s) => s !== phoneSection)
    : data.sections;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      {/* Same Callout treatment the generic report path uses for verdict.headline (see
          app/reports/[id]/page.tsx) — was a bare, unstyled <p>, the one designed screen not
          matching every other report's "at a glance" headline treatment. */}
      {verdict?.headline && <Callout eyebrow={t("reports.atAGlance.eyebrow")}>{verdict.headline}</Callout>}

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

      {isMobileNumberAnalysis(scores.phoneNumber) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("numerologyReport.phone.title")}
          </h2>
          <PhoneVibrationCard analysis={scores.phoneNumber} />
        </section>
      )}

      <AnalysisAccordion
        sections={accordionSections}
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

      {isMobileNumberAnalysis(scores.phoneNumber) && (
        <StrengthsCautions
          summary={scores.phoneNumber}
          strengthsKey="numerologyReport.phone.strengths"
          cautionsKey="numerologyReport.phone.cautions"
        />
      )}

      {/* The phone section's own lead-in paragraphs + its suggested-replacement cards — pulled
          out of `data.sections` above (see `phoneSection`) since AnalysisAccordion can't render
          `items`. Reuses NameSuggestionCard exactly as name_change's "Suggested Names" section
          does: same {title, badge, score, highlight, bullets} shape, same ranked/highlighted
          presentation, so a reader who has seen that report recognizes this one immediately. */}
      {phoneSection && phoneSection.items && phoneSection.items.length > 0 && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("numerologyReport.phone.suggestionsTitle")}
          </h2>
          {phoneSection.paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-foreground/85 leading-relaxed mb-2.5">
              {p}
            </p>
          ))}
          <div className="flex flex-col gap-3">
            {phoneSection.items.map((item, i) => (
              <NameSuggestionCard key={i} item={item} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
