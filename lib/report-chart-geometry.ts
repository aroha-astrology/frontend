/**
 * Pure layout math for the 4 inline-SVG charts added to the report rich-fact
 * cards — date-to-x math, score-to-width/height math, and path-string
 * builders. Extracted from the chart components so each has a plain-vitest
 * unit test (matches lib/report-score-facts.ts's precedent: kept
 * dependency-free, no React, so the charts' geometry can be verified without
 * rendering anything).
 *
 * Every "layout" function below returns numbers/paths in the SAME units as
 * its `width`/`height` inputs — callers pass an SVG viewBox's own coordinate
 * space (e.g. `width={100}`) and the component scales that viewBox to 100%
 * of its container, so the math never needs to know a real pixel size.
 */

import type { RankedWindow, AgeBand, DecadeBand } from "./report-score-facts";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ─── Trait-tilt bars (Archetype.traits) ─────────────────────────────────────

export interface TraitBar {
  label: string;
  score: number;
  /** 0-100, `score` scaled against `max` and clamped. */
  pct: number;
}

/** Sorts traits by score descending and computes each one's 0-100 bar-width percentage. */
export function computeTraitBars(traits: { label: string; score: number }[], max = 10): TraitBar[] {
  return traits
    .map((t) => ({ label: t.label, score: t.score, pct: clamp(max > 0 ? (t.score / max) * 100 : 0, 0, 100) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * A rect path rounded ONLY on its far/data end (right side), square at the
 * baseline (left side) — the dataviz skill's mark spec for a bar that grows
 * from a single baseline ("4px rounded data-end, square at the baseline").
 * Plain SVG `rx`/`ry` round all 4 corners uniformly, so this builds the path
 * by hand. Returns "" for a non-positive width (nothing to draw).
 */
export function rightRoundedBarPath(x: number, y: number, width: number, height: number, radius: number): string {
  if (width <= 0 || height <= 0) return "";
  const r = Math.max(0, Math.min(radius, height / 2, width / 2));
  if (r === 0) {
    return `M${x},${y} h${width} v${height} h${-width} Z`;
  }
  return (
    `M${x},${y} ` +
    `h${width - r} ` +
    `a${r},${r} 0 0 1 ${r},${r} ` +
    `v${height - 2 * r} ` +
    `a${r},${r} 0 0 1 ${-r},${r} ` +
    `h${-(width - r)} Z`
  );
}

// ─── Decade arc (DecadeBand[]) ───────────────────────────────────────────────

export interface ChartPoint {
  x: number;
  y: number;
}

/** Maps a 0-max score to a y-coordinate in an SVG's downward-growing space (higher score -> smaller y). */
export function scoreToY(score: number, chartHeight: number, max = 100): number {
  const pct = clamp(max > 0 ? score / max : 0, 0, 1);
  return chartHeight - pct * chartHeight;
}

/** Lays decade bands out along an evenly-spaced x-axis; a single band centers itself. */
export function layoutDecadePoints(bands: DecadeBand[], width: number, height: number, max = 100): ChartPoint[] {
  const n = bands.length;
  if (n === 0) return [];
  return bands.map((b, i) => ({
    x: n === 1 ? width / 2 : (i / (n - 1)) * width,
    y: scoreToY(b.score, height, max),
  }));
}

/** Builds an SVG line `d` path through the given points, "" for an empty list. */
export function buildLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/** Builds a closed-area `d` path under the line, down to `baselineY` (the chart's bottom edge), "" for an empty list. */
export function buildAreaPath(points: ChartPoint[], baselineY: number): string {
  if (points.length === 0) return "";
  const line = buildLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${last.x.toFixed(2)},${baselineY.toFixed(2)} L${first.x.toFixed(2)},${baselineY.toFixed(2)} Z`;
}

// ─── Timing windows Gantt (RankedWindow[]) ──────────────────────────────────

export interface TimelineDomain {
  startMs: number;
  endMs: number;
}

/** Parses an ISO date string to epoch ms; NaN (not thrown) for an unparseable string. */
export function parseDateMs(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * The shared date axis every window's bar is positioned against — min start to
 * max end across all windows. Returns `null` for an empty/all-unparseable
 * list rather than a NaN-poisoned domain. A single instant (start === end
 * across every window) is padded by a day either side so `dateToXPct` never
 * divides by zero.
 */
export function computeTimelineDomain(windows: { startDate: string; endDate: string }[]): TimelineDomain | null {
  const times = windows.flatMap((w) => [parseDateMs(w.startDate), parseDateMs(w.endDate)]).filter(Number.isFinite);
  if (times.length === 0) return null;
  let startMs = Math.min(...times);
  let endMs = Math.max(...times);
  if (startMs === endMs) {
    const oneDayMs = 24 * 60 * 60 * 1000;
    startMs -= oneDayMs;
    endMs += oneDayMs;
  }
  return { startMs, endMs };
}

/** Maps an ISO date to a 0-100 x-position within a timeline domain; 0 for an unparseable date or a zero-width domain. */
export function dateToXPct(iso: string, domain: TimelineDomain): number {
  const t = parseDateMs(iso);
  if (!Number.isFinite(t) || domain.endMs === domain.startMs) return 0;
  return clamp(((t - domain.startMs) / (domain.endMs - domain.startMs)) * 100, 0, 100);
}

export interface WindowBar {
  xPct: number;
  widthPct: number;
}

/**
 * Computes one window's horizontal bar position/width (both 0-100, percentage
 * of the shared timeline) — enforces `minWidthPct` so a single-day window
 * still renders as a visible sliver rather than a 0-width invisible bar.
 */
export function windowBarRect(
  window: { startDate: string; endDate: string },
  domain: TimelineDomain,
  minWidthPct = 1.5
): WindowBar {
  const x0 = dateToXPct(window.startDate, domain);
  const x1 = dateToXPct(window.endDate, domain);
  const rawX = Math.min(x0, x1);
  const widthPct = clamp(Math.max(Math.abs(x1 - x0), minWidthPct), 0, 100);
  // Clamp so a minWidthPct bump never pushes the bar past the right edge.
  const xPct = clamp(rawX, 0, 100 - widthPct);
  return { xPct, widthPct };
}

// ─── Age-band confidence heat strip (AgeBand[]) ─────────────────────────────

export interface AgeSegment {
  startAge: number;
  endAge: number | null;
  confidence: AgeBand["confidence"];
  /** 0-100, this band's share of the strip's total width. */
  widthPct: number;
}

/**
 * Sizes each age band's strip segment proportionally to its age span.
 * `assumedMaxAge` stands in for an open-ended band's missing `endAge` (e.g.
 * "60+") so it still gets a sensible, non-infinite share of the strip rather
 * than swallowing it. Every span is floored at 1 year so a same-age band
 * never collapses to a 0-width segment.
 */
export function computeAgeBandSegments(bands: AgeBand[], assumedMaxAge = 100): AgeSegment[] {
  if (bands.length === 0) return [];
  const spans = bands.map((b) => Math.max((b.endAge ?? assumedMaxAge) - b.startAge, 1));
  const total = spans.reduce((sum, s) => sum + s, 0) || 1;
  return bands.map((b, i) => ({
    startAge: b.startAge,
    endAge: b.endAge,
    confidence: b.confidence,
    widthPct: (spans[i] / total) * 100,
  }));
}

/** "0-18", "60+" (null endAge), or "40" (startAge === endAge) — the label rendered directly on a heat-strip segment. */
export function formatAgeRange(band: { startAge: number; endAge: number | null }): string {
  if (band.endAge === null) return `${band.startAge}+`;
  if (band.endAge === band.startAge) return `${band.startAge}`;
  return `${band.startAge}-${band.endAge}`;
}
