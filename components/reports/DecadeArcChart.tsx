"use client";

import { useTranslation } from "react-i18next";
import { buildLinePath, buildAreaPath, type ChartPoint } from "@/lib/report-chart-geometry";
import { ACCENT_COLOR } from "@/lib/chart-palette";
import type { DecadeBand, DecadeSubPeriod } from "@/lib/report-score-facts";

const VIEW_W = 400;
const VIEW_H = 100;
/** Keeps the line off the card edges so a very high or very low slice is still visible. */
const PAD_Y = 10;
/** Year ticks closer than this (% of width) to the previous one are skipped to avoid overlap. */
const MIN_TICK_GAP_PCT = 9;

type Slice = DecadeBand | DecadeSubPeriod;

function time(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function decadeYear(iso: string): string {
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? String(y) : "";
}

/**
 * Score-over-time arc — a single-series line/area (dataviz form heuristic: "trend over time ->
 * line; area for a single series"), one hue (ACCENT_COLOR).
 *
 * When bands carry `subPeriods` (Life So Far), one point is plotted per sub-period so the line
 * follows the real ups and downs inside a long chapter instead of one flat value per chapter.
 * Points sit at the middle of each slice on a real time axis, so a 20-year chapter takes 20
 * years of width. Year ticks mark chapter starts only.
 *
 * The score only shapes the line; it is never printed (no axis values, no numeric tooltip).
 * Each chapter's tone badge in DecadeArcCard carries the reading.
 */
export default function DecadeArcChart({ bands }: { bands: DecadeBand[] }) {
  const { t } = useTranslation();
  if (bands.length === 0) return null;

  const slices: Slice[] = bands.flatMap<Slice>((b) =>
    b.subPeriods && b.subPeriods.length > 0 ? b.subPeriods : [b],
  );
  const start = time(bands[0].startDate);
  const end = time(bands[bands.length - 1].endDate);
  const span = end - start;

  const xOf = (ms: number) => (span > 0 ? ((ms - start) / span) * VIEW_W : VIEW_W / 2);
  const yOf = (score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    return VIEW_H - PAD_Y - (clamped / 100) * (VIEW_H - 2 * PAD_Y);
  };

  const points: ChartPoint[] = slices.map((s) => ({
    x: slices.length === 1 ? VIEW_W / 2 : xOf((time(s.startDate) + time(s.endDate)) / 2),
    y: yOf(s.score),
  }));
  const hasLine = points.length >= 2;
  const linePath = hasLine ? buildLinePath(points) : "";
  const areaPath = hasLine ? buildAreaPath(points, VIEW_H) : "";
  const dense = slices.length > bands.length;

  const ticks: { label: string; pct: number }[] = [];
  for (const b of bands) {
    const pct = span > 0 ? ((time(b.startDate) - start) / span) * 100 : 0;
    const prev = ticks[ticks.length - 1];
    if (!prev || pct - prev.pct >= MIN_TICK_GAP_PCT) ticks.push({ label: decadeYear(b.startDate), pct });
  }
  const endYear = decadeYear(bands[bands.length - 1].endDate);
  const lastTick = ticks[ticks.length - 1];
  const showEndTick = span > 0 && (!lastTick || 100 - lastTick.pct >= MIN_TICK_GAP_PCT);

  return (
    <div className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        className="w-full"
        aria-hidden="true"
      >
        {/* baseline — recessive hairline, not a data mark */}
        <line x1={0} y1={VIEW_H - 1} x2={VIEW_W} y2={VIEW_H - 1} stroke="var(--border)" strokeWidth={1} />

        {/* chapter boundaries, only when sub-periods are plotted */}
        {dense &&
          bands.slice(1).map((b, i) => {
            const x = xOf(time(b.startDate));
            return (
              <line key={`sep-${i}`} x1={x} y1={0} x2={x} y2={VIEW_H} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 3" />
            );
          })}

        {hasLine && (
          <>
            <path d={areaPath} fill={ACCENT_COLOR} opacity={0.12} stroke="none" />
            <path d={linePath} fill="none" stroke={ACCENT_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {points.map((p, i) => {
          const s = slices[i];
          return (
            <g key={`${s.label}-${i}`}>
              <title>{`${s.label} — ${t(`reports.facts.tone.${s.tone}`)}`}</title>
              <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={dense ? 3 : 5} fill={ACCENT_COLOR} stroke="var(--card)" strokeWidth={dense ? 1.5 : 2} />
            </g>
          );
        })}
      </svg>

      {span > 0 && (
        <div className="relative h-3">
          {ticks.map((tick, i) => (
            <span
              key={`${tick.label}-${i}`}
              className="absolute text-[9px] tabular-nums text-muted"
              style={{ left: `${tick.pct}%`, transform: tick.pct < 5 ? "none" : "translateX(-50%)" }}
            >
              {tick.label}
            </span>
          ))}
          {showEndTick && (
            <span className="absolute right-0 text-[9px] tabular-nums text-muted">{endYear}</span>
          )}
        </div>
      )}
    </div>
  );
}
