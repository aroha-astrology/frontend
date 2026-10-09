"use client";

import KundliMilanReportView from "../kundli-milan/KundliMilanReportView";
import type { ReportReady } from "@/hooks/useReport";

/**
 * match_report's 11 sections: the eight life areas (the same keys, in the same
 * order, as the Life Areas grid — backend match-risks.ts's MATCH_RISK_AREA_ORDER)
 * followed by the three closing ones.
 */
const SECTION_ICON: Record<string, string> = {
  wealth: "Wallet",
  health: "Activity",
  children: "Baby",
  harmony: "Heart",
  career: "TrendingUp",
  timing: "CalendarHeart",
  intimacy: "Flame",
  inlaws: "Home",
  dos: "Sparkles",
  donts: "ShieldAlert",
  remedies: "Leaf",
};

/**
 * The bespoke Compatibility Match Report screen.
 *
 * match_report's `scores` are Kundli Milan's own scores plus the eight
 * risk-area verdicts (backend: `MatchReportScores extends KundliMilanScores`),
 * and the Kundli Milan screen already draws every one of them — the Life Areas
 * grid there reads `riskFactors`. So this is that screen with this report's
 * sections, not a second copy of it.
 *
 * Two differences, both in the written analysis:
 *   - its section ids are the bare life-area names ("wealth", "health"), which
 *     would collide with other reports' headings, so they are translated under
 *     their own `reports.sectionHeading.match_report.*` namespace (same rule as
 *     the plain layout's `sectionHeadingKey`);
 *   - it has no Lal Kitab remedy slot. The backend sends an empty
 *     `planetRemedies` for it on purpose, so that card hides itself; the
 *     report's remedies are its own written section.
 */
export default function MatchReportView({ data }: { data: ReportReady }) {
  return (
    <KundliMilanReportView
      data={data}
      sectionIcon={SECTION_ICON}
      headingKeyPrefix="reports.sectionHeading.match_report"
    />
  );
}
