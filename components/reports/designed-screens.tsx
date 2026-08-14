"use client";

import MarriageReportView from "./marriage/MarriageReportView";
import KundliMilanReportView from "./kundli-milan/KundliMilanReportView";
import TrueLoveReportView from "./true-love/TrueLoveReportView";
import WealthReportView from "./wealth/WealthReportView";
import CareerReportView from "./career/CareerReportView";
import HealthReportView from "./health/HealthReportView";
import FinanceReportView from "./finance/FinanceReportView";
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
};
