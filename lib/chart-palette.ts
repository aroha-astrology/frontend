/**
 * Shared color logic for the 4 inline-SVG charts added to the report
 * rich-fact cards (TraitTiltBars, DecadeArcChart, TimingWindowsGantt,
 * AgeBandHeatStrip) — see the dataviz skill's color-formula.md: color is
 * assigned by the JOB it does (status / single-hue magnitude / sequential
 * ramp), never hand-picked per chart. Kept dependency-free (no React), same
 * as lib/report-score-facts.ts, so it's unit-testable with plain vitest.
 *
 * No new npm dependency, no new hex invented for status meanings that
 * already have a color in this codebase — see each export's doc comment for
 * where its value comes from.
 */

import type { RankedWindow, AgeBand } from "./report-score-facts";

/**
 * Single accent hue for a lone-series magnitude mark (TraitTiltBars' bars,
 * DecadeArcChart's line/area) — the app's own `--gold` CSS custom property,
 * already theme-aware (dark `#dfb564`, light `#B8892D` — see
 * app/globals.css), so no separate light/dark hex pair is needed: existing
 * SVG components in this app already reference custom properties directly in
 * `fill` (see components/vastu/RoomBlock.tsx's `fill="var(--card)"` and
 * components/ui/NorthIndianChart.tsx's `fill="var(--surface, #111)"`).
 *
 * Contrast checked as a mark (dataviz skill's check 5, >= 3:1) against each
 * mode's actual card surface (components/ui/Card.tsx's `bg-card` token):
 *   dark  #dfb564 vs #111316 -> 9.69:1
 *   light #B8892D vs #FFFFFF -> 3.16:1
 * Both clear the floor, so no secondary encoding is required for this mark.
 */
export const ACCENT_COLOR = "var(--gold)";

/**
 * HIGH/MEDIUM/LOW mark color for TimingWindowsGantt's bars — reused verbatim
 * from this app's existing convention rather than invented for the chart:
 * HIGH/MEDIUM match the exact hex ReportScoreFacts.tsx's `ScoreRing` and
 * TimingWindowsCard.tsx's `LEVEL_STYLES` already use (emerald-400 / amber-400
 * hex, theme-invariant like the rest of that badge). LOW stays achromatic —
 * the existing badge never gives LOW a hue either (`border-border bg-muted/10
 * text-muted`) — so it takes the theme-aware `--text-muted` token instead of
 * a third invented hue.
 *
 * Mark contrast vs the card surface: HIGH/MEDIUM clear 3:1 in dark mode
 * (9.68:1 / 11.15:1) but sit below it in light mode (1.92:1 / 1.67:1) — the
 * dataviz skill's documented "relief" case (a contrast WARN, not a FAIL,
 * legal only when paired with a visible text label). TimingWindowsGantt
 * satisfies that by always rendering the level as a direct text pill next to
 * the bar, never color alone.
 */
export const TIMING_LEVEL_COLOR: Record<RankedWindow["level"], string> = {
  HIGH: "#34d399",
  MEDIUM: "#fbbf24",
  LOW: "var(--text-muted)",
};

/**
 * Age-band confidence heat strip (AgeBandHeatStrip) — a genuine ordinal ramp
 * (NONE -> HIGH: "one hue, monotone lightness steps" per the dataviz skill's
 * color-formula.md), distinct from AgeBandTable's existing HIGH/MEDIUM/LOW/
 * NONE row badges (those are a fixed 4-way status palette, not a ramp — kept
 * as-is). One hue (~82 degrees OKLCH, this app's gold hue, derived from the
 * `--gold` token `#dfb564`), validated with the dataviz skill's
 * `scripts/validate_palette.js --ordinal`:
 *
 *   light (surface #FFFFFF, this app's light-mode card token):
 *     NONE #d4aa5a -> LOW #ba9140 -> MEDIUM #9a731b -> HIGH #765000
 *     ALL CHECKS PASS — monotone L, gaps >= 0.06, light-end (NONE) contrast
 *     2.17:1 (>= 2.0 floor), hue spread 5 degrees.
 *
 *   dark (surface #111316, this app's dark-mode card token):
 *     NONE #704b00 -> LOW #946d11 -> MEDIUM #ba9140 -> HIGH #e1b767
 *     ALL CHECKS PASS — monotone L, gaps >= 0.06, near-surface (NONE)
 *     contrast 2.39:1 (>= 2.0 floor), hue spread 6 degrees.
 *
 * The anchor flips between modes exactly as the skill prescribes for a
 * sequential ramp: the "near zero" value (NONE) sits pale-near-white in light
 * mode but dark-near-black in dark mode, so it always reads as the least
 * visually weighty step relative to its own surface.
 */
export const AGE_CONFIDENCE_RAMP: Record<"light" | "dark", Record<AgeBand["confidence"], string>> = {
  light: {
    NONE: "#d4aa5a",
    LOW: "#ba9140",
    MEDIUM: "#9a731b",
    HIGH: "#765000",
  },
  dark: {
    NONE: "#704b00",
    LOW: "#946d11",
    MEDIUM: "#ba9140",
    HIGH: "#e1b767",
  },
};

/** Looks up the validated ordinal-ramp color for one confidence step in one theme mode. */
export function ageConfidenceColor(confidence: AgeBand["confidence"], mode: "light" | "dark"): string {
  return AGE_CONFIDENCE_RAMP[mode][confidence];
}
