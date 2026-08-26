"use client";

import { useTranslation } from "react-i18next";
import { buildMarriageView, isDecadeExplanationArray } from "@/lib/marriage-report-view";
import {
  isDecadeBandArray,
  isDoshaYogaSummary,
  isRemedyPlacementArray,
  isRankedWindowArray,
  isReportHeader,
  isReportVerdict,
} from "@/lib/report-score-facts";
import { SECTION_ICON } from "@/lib/marriage-report-view";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import { RemedyPlacementsCards } from "../LalKitabFactsCards";
import ArchetypeCard from "../ArchetypeCard";
import DecadeArcCard from "../DecadeArcCard";
import AnalysisAccordion from "../AnalysisAccordion";
import TopWindowCard from "../TopWindowCard";
import StrengthsCautions from "../StrengthsCautions";
import OutlookCard from "./OutlookCard";
import HighlightTiles from "./HighlightTiles";
import PlanetImpactStrip from "./PlanetImpactStrip";
import SeventhHouseCard from "./SeventhHouseCard";
import LoveOrArrangeCard, { isLoveOrArrange } from "./LoveOrArrangeCard";
import SpouseBirthCard from "./SpouseBirthCard";
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
 *
 * For UNMARRIED users: shows LoveOrArrangeCard (love vs arranged marriage prediction)
 * and the TopWindowCard (when will I marry timing).
 *
 * For MARRIED users: shows SpouseBirthCard so they can enter their spouse's birth
 * details, submitted as `answers` to regenerate a combined reading.
 *
 * The Remedies section shows real Lal Kitab remedies (report-remedy-slots.ts on the
 * backend) — never a gemstone recommendation; those are sold exclusively through the
 * dedicated paid Gemstone feature.
 *
 * Every other report type still renders through the generic path in
 * app/reports/[id]/page.tsx; this component is reached only for reportKey "marriage".
 */
export default function MarriageReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const view = buildMarriageView(scores);
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  const uiData = data.sections.reduce(
    (acc, sec) => ({ ...acc, ...(sec.uiData || {}) }),
    {} as Record<string, unknown>
  );

  const isMarried = scores.relationshipStatus === "married";

  // Love or arranged marriage — read defensively from scores (backend field: loveOrArrange,
  // computed in astro-engine/reports/marriage.ts). Absent on any report generated before that
  // field shipped, in which case the card simply doesn't render.
  const loveOrArrange = isLoveOrArrange(scores.loveOrArrange) ? scores.loveOrArrange : null;

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <OutlookCard score={view.score} band={view.band} headline={verdict?.headline ?? null} />

      <HighlightTiles
        tiles={view.highlights}
        positiveCount={view.positiveCount}
        cautionCount={view.cautionCount}
      />

      <PlanetImpactStrip
        planets={view.planets.map(p => ({
          ...p,
          aiExplanation: typeof uiData[`planetImpact_${p.role === 'seventhLord' ? 'seventhLord' : p.planet}`] === 'string'
            ? uiData[`planetImpact_${p.role === 'seventhLord' ? 'seventhLord' : p.planet}`] as string
            : undefined
        }))}
      />

      {/* Bespoke key-fact block, same group as HighlightTiles/PlanetImpactStrip above — moved
          up from after the accordion (its old spot) so every designed screen's fact blocks sit
          together before the timing/narrative sections, matching the canonical cross-report
          order (see designed-screens.tsx). */}
      <SeventhHouseCard
        facts={{
          ...view.seventhHouse,
          aiExplanation: typeof uiData.seventhHouseImpact === 'string' ? uiData.seventhHouseImpact : undefined
        }}
      />

      {/* ── Love or Arranged Marriage (unmarried users only) ── */}
      {!isMarried && loveOrArrange && (
        <LoveOrArrangeCard value={loveOrArrange} />
      )}

      {/* ── Marriage timing window (unmarried users only) ── */}
      {isRankedWindowArray(scores.windows) && !isMarried && (
        <TopWindowCard
          windows={scores.windows}
          titleKey="marriageReport.timing.title"
          labelKey="marriageReport.timing.strongPeriod"
        />
      )}

      {/* ── Spouse birth details (married users only) ── */}
      {isMarried && <SpouseBirthCard />}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="marriageReport.analysis.title"
      />

      {view.archetype && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">{t("marriageReport.spouse.title")}</h2>
          <ArchetypeCard archetype={view.archetype} />
        </section>
      )}

      {isDecadeBandArray(scores.marriageQualityArc) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">{t("marriageReport.decade.title")}</h2>
          <DecadeArcCard
            bands={scores.marriageQualityArc.map((b, i) => {
              const explanations = isDecadeExplanationArray(uiData.decadeExplanations)
                ? uiData.decadeExplanations
                : [];
              // Label first, position as the fallback: the model is asked for one entry per band
              // in order, but it reformats the label often enough ("1-10" for "Years 1-10") that
              // matching on the string alone silently drops every explanation.
              const match =
                explanations.find((e) => e.label === b.label) ?? explanations[i];
              return { ...b, aiExplanation: match?.explanation };
            })}
          />
        </section>
      )}

      {/* Strengths & Cautions — moved down from just after the accordion (its old spot) so
          every designed screen shows it in the SAME position: after archetype/decade arc, just
          before remedies (see designed-screens.tsx's canonical order). */}
      {isDoshaYogaSummary(scores.doshaYoga) && (
        <StrengthsCautions
          summary={scores.doshaYoga}
          strengthsKey="marriageReport.strengths"
          cautionsKey="marriageReport.cautions"
        />
      )}

      {isRemedyPlacementArray(scores.planetRemedies) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">{t("marriageReport.remedies.title")}</h2>
          <RemedyPlacementsCards
            placements={scores.planetRemedies.map((p) => {
              const key = p.planet.toLowerCase();
              return {
                ...p,
                aiEffect: typeof uiData[`remedyEffect_${key}`] === 'string' ? uiData[`remedyEffect_${key}`] as string : undefined,
                aiDuration: typeof uiData[`remedyDuration_${key}`] === 'string' ? uiData[`remedyDuration_${key}`] as string : undefined,
              };
            })}
          />
        </section>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
