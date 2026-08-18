"use client";

import MarriageReportView from "./marriage/MarriageReportView";
import KundliMilanReportView from "./kundli-milan/KundliMilanReportView";
import TrueLoveReportView from "./true-love/TrueLoveReportView";
import WealthReportView from "./wealth/WealthReportView";
import CareerReportView from "./career/CareerReportView";
import HealthReportView from "./health/HealthReportView";
import FinanceReportView from "./finance/FinanceReportView";
import PastLifeReportView from "./past-life/PastLifeReportView";
import NumerologyReportView from "./numerology/NumerologyReportView";
import BabyNameReportView from "./baby-name/BabyNameReportView";
import type { ReportReady } from "@/hooks/useReport";

export interface DesignedScreen {
  View: (props: { data: ReportReady }) => React.ReactNode;
  /** Hero artwork, sliced from a design sheet (scripts/assets/asset-manifest.json). */
  artSrc: string;
  /** i18n key for the one-line subtitle in the hero. */
  subtitleKey: string;
}

/**
 * Report types that have a bespoke, fully designed screen. Everything not listed here
 * renders through the generic path in app/reports/[id]/page.tsx, unchanged.
 *
 * This table replaced a pair of `isMarriage`/`isKundliMilan` booleans once the third
 * screen landed — deliberately later than a registry-first instinct would have built it.
 * With one screen a table is indirection for its own sake; with three, the alternative is
 * a growing chain of flags threaded through both the hero and the body.
 *
 * Adding a screen is one entry here plus its folder; no edit to the page itself.
 *
 * ─── Canonical block order ──────────────────────────────────────────────────
 * Each screen composes its own blocks (this table gives them no shared layout), but they
 * should all use the SAME relative order so a reader flipping between two report types
 * finds the same kind of thing in the same place — see the bug this fixed: Strengths &
 * Cautions sat right under the hero on Past Life but near the bottom on Marriage. Follow
 * this order in every new/edited screen:
 *
 *   1. ReportHeaderCard
 *   2. Hero / score card            (bespoke per report — OutlookCard, MilanScoreCard, ...)
 *   3. Bespoke key-fact blocks      (tiles, dials, grids, 7th-house, karmic axis, ...)
 *   4. Timing                       (TopWindowCard / TimingWindowsCard, age bands)
 *   5. AnalysisAccordion            (the narrative)
 *   6. Archetype
 *   7. Decade arc
 *   8. StrengthsCautions            (doshaYoga)
 *   9. Gemstones
 *  10. PlanetStrengthCard           (appended once by app/reports/[id]/page.tsx, not here)
 *  11. ReportVerdictCard
 *
 * A block a given screen doesn't have simply isn't there — this is a relative ordering,
 * not a checklist every screen must fill in.
 */
export const DESIGNED_SCREENS: Record<string, DesignedScreen> = {
  marriage: {
    View: MarriageReportView,
    artSrc: "/marriage/couple.png",
    subtitleKey: "marriageReport.subtitle",
  },
  kundli_milan: {
    View: KundliMilanReportView,
    artSrc: "/kundli-milan/charts.png",
    subtitleKey: "kundliMilanReport.subtitle",
  },
  true_love: {
    View: TrueLoveReportView,
    artSrc: "/true-love/couple.png",
    subtitleKey: "trueLoveReport.subtitle",
  },
  wealth: {
    View: WealthReportView,
    artSrc: "/wealth/kalash.png",
    subtitleKey: "wealthReport.subtitle",
  },
  career_monthly: {
    View: CareerReportView,
    artSrc: "/career/climb.png",
    subtitleKey: "careerReport.subtitle",
  },
  health_monthly: {
    View: HealthReportView,
    artSrc: "/health/body.png",
    subtitleKey: "healthReport.subtitle",
  },
  finance_monthly: {
    View: FinanceReportView,
    artSrc: "/finance/rupee.png",
    subtitleKey: "financeReport.subtitle",
  },
  past_life: {
    View: PastLifeReportView,
    artSrc: "/past-life/doorway.png",
    subtitleKey: "pastLifeReport.subtitle",
  },
  numerology: {
    View: NumerologyReportView,
    artSrc: "/numerology/wheel.png",
    subtitleKey: "numerologyReport.subtitle",
  },
  baby_name: {
    View: BabyNameReportView,
    artSrc: "/baby-name/moon.png",
    subtitleKey: "babyNameReport.subtitle",
  },
};
