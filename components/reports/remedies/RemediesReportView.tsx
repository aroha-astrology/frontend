"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  isBlindPlanetArray,
  isKarmicDebtArray,
  isPakkaGharArray,
  isRemedyPlacementArray,
  isReportHeader,
  isReportVerdict,
} from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import Callout from "../blocks/Callout";
import AnalysisAccordion from "../AnalysisAccordion";
import {
  BlindPlanetsCards,
  KarmicDebtsCards,
  PakkaGharCards,
  RemedyPlacementsCards,
} from "../LalKitabFactsCards";
import type { ReportReady } from "@/hooks/useReport";

/** remedies has 4 sections. */
const SECTION_ICON: Record<string, string> = {
  karmic_debts: "Scale",
  planet_remedies: "Leaf",
  strengths_cautions: "ShieldAlert",
  how_to_use_remedies: "Compass",
};

function Group({ title, dek, children }: { title: string; dek?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-base text-gold">{title}</h2>
      {dek && <p className="mt-0.5 text-xs text-muted">{dek}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * The bespoke Lal Kitab Remedies screen.
 *
 * Until this existed the report went through the plain layout in
 * app/reports/[id]/page.tsx, which lists a "what's covered" box and then prints
 * whatever it finds on `scores` — including, once the server started attaching
 * it, a numbered "VAKRI FACTS" list written for the model.
 *
 * Presentation only, from what the API already returns (backend
 * astro-engine/reports/remedies.ts, RemediesScores): the four Lal Kitab fact
 * lists, each with the card built for it in LalKitabFactsCards.tsx, in the
 * order the free /remedies page shows them — debts, then planet by planet,
 * then what is strong, then what needs attention. Headings and their one-line
 * explanations are that page's own strings, so the paid report and the free
 * page name the same thing the same way.
 *
 * In this report the remedies are the facts, so they sit above the written
 * analysis rather than after it as the Remedies slot does on other screens.
 * Every block hides itself when its list is empty or missing.
 */
export default function RemediesReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      {verdict?.headline && <Callout eyebrow={t("reports.atAGlance.eyebrow")}>{verdict.headline}</Callout>}

      {isKarmicDebtArray(scores.presentDebts) && (
        <Group title={t("remediesPage.debtsHeading")} dek={t("remediesPage.debtsDek")}>
          <KarmicDebtsCards debts={scores.presentDebts} />
        </Group>
      )}

      {isRemedyPlacementArray(scores.planetRemedies) && (
        <Group
          title={t("remediesPage.planetsHeading")}
          // The line says "all nine planets"; a chart with no house on file for a
          // planet has fewer cards, and the line would then be wrong.
          dek={scores.planetRemedies.length === 9 ? t("remediesPage.planetsDek") : undefined}
        >
          <RemedyPlacementsCards placements={scores.planetRemedies} />
        </Group>
      )}

      {isPakkaGharArray(scores.pakkaGharPlacements) && (
        <Group title={t("remediesPage.strengthsHeading")} dek={t("remediesPage.strengthsDek")}>
          <PakkaGharCards placements={scores.pakkaGharPlacements} />
        </Group>
      )}

      {isBlindPlanetArray(scores.blindPlanets) && (
        <Group title={t("remediesPage.attentionHeading")} dek={t("remediesPage.attentionDek")}>
          <BlindPlanetsCards planets={scores.blindPlanets} />
        </Group>
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="remediesReport.analysis.title"
      />

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
