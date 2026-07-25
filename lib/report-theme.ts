/**
 * Icon + color theme per report catalogue key — the "no images" visual
 * treatment agreed for the Home Reports slider (see components/reports/
 * ReportThemeCard.tsx): a themed icon badge over a soft translucent gradient
 * wash, rather than photography/illustration we don't have.
 *
 * IMPORTANT: this file intentionally stores a semantic `hue` key, NOT a
 * literal Tailwind class string. Tailwind's JIT compiler only generates CSS
 * for utility class names it finds as literal text inside the `content`
 * globs in tailwind.config.ts (app/, components/, providers/, data/) — lib/
 * is NOT one of them. A literal `"from-rose-500/25 to-rose-950/10"` string
 * authored only here would silently produce a class with no matching CSS
 * rule at build time. This is the exact same reasoning already documented on
 * lib/nav-items.ts (see its top-of-file comment) and is why
 * components/BottomNavigation.tsx keeps its own `GRID_COLS` class lookup
 * locally instead of in lib/ — the literal-value -> Tailwind-class table for
 * these hues lives in components/reports/ReportThemeCard.tsx's
 * `HUE_GRADIENT`, which IS under a scanned glob.
 *
 * Kept dependency-free beyond `lucide-react` (no React component code) so
 * `getReportTheme`'s fallback behavior is trivially unit-testable with plain
 * vitest, matching the convention in lib/reports-logic.ts.
 */
import type { LucideIcon } from "lucide-react";
import {
  HeartHandshake,
  Infinity,
  Users,
  Heart,
  Coins,
  Baby,
  Activity,
  Briefcase,
  Wallet,
  HeartPulse,
  FileText,
} from "lucide-react";

/**
 * Color-family keys used to look up the actual gradient class string in
 * components/reports/ReportThemeCard.tsx's `HUE_GRADIENT`. `"gold"` is
 * reserved for the fallback theme and is deliberately not assigned to any
 * real report, so an unthemed future report key never gets confused for a
 * themed one.
 */
export type ReportHue =
  | "rose"
  | "violet"
  | "cyan"
  | "red"
  | "amber"
  | "sky"
  | "emerald"
  | "blue"
  | "teal"
  | "fuchsia"
  | "gold";

export interface ReportTheme {
  icon: LucideIcon;
  hue: ReportHue;
}

/**
 * One theme per report catalogue key. Hues are deliberately spread around
 * the color wheel (not just picked per-report in isolation) so that no two
 * adjacent cards in the horizontal-scroll row read as near-duplicates —
 * `kundli_milan` in particular sits on cyan rather than a rose/pink tone,
 * since it falls directly between `marriage` (rose) and `true_love` (red)
 * in catalogue order and all three would otherwise wash out to the same
 * warm-pink smear at low opacity.
 */
export const REPORT_THEME: Record<string, ReportTheme> = {
  marriage: { icon: HeartHandshake, hue: "rose" },
  past_life: { icon: Infinity, hue: "violet" },
  kundli_milan: { icon: Users, hue: "cyan" },
  true_love: { icon: Heart, hue: "red" },
  wealth: { icon: Coins, hue: "amber" },
  baby_name: { icon: Baby, hue: "sky" },
  health_monthly: { icon: Activity, hue: "emerald" },
  career_monthly: { icon: Briefcase, hue: "blue" },
  finance_monthly: { icon: Wallet, hue: "teal" },
  relationship_monthly: { icon: HeartPulse, hue: "fuchsia" },
};

/** Neutral gold-toned fallback for any catalogue key this client build doesn't have a theme for yet. */
const DEFAULT_THEME: ReportTheme = { icon: FileText, hue: "gold" };

/**
 * Looks up a report's icon+hue theme by catalogue key, falling back to a
 * neutral default for an unrecognized key (e.g. a new report type added
 * server-side before the frontend ships a matching theme) — mirrors
 * hooks/useFeature.ts's fail-open philosophy: an unknown key degrades
 * gracefully to a generic look rather than crashing the slider.
 */
export function getReportTheme(key: string): ReportTheme {
  return REPORT_THEME[key] ?? DEFAULT_THEME;
}
