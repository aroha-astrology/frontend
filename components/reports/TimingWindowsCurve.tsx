"use client";

import { useTranslation } from "react-i18next";
import { computeTimelineDomain, buildWindowCurve, buildLinePath, buildAreaPath } from "@/lib/report-chart-geometry";
import { ACCENT_COLOR, TIMING_LEVEL_COLOR } from "@/lib/chart-palette";
import { LEVEL_STYLES, formatWindowDate } from "./TimingWindowsCard";
import type { RankedWindow } from "@/lib/report-score-facts";

const VIEW_W = 300;
const VIEW_H = 64;
/** Stroke headroom so the 2px line at the very top of a HIGH peak isn't clipped. */
const PAD_Y = 3;

/**
 * A single favourability curve across every ranked window on one shared date
 * axis — replaces the per-window Gantt bars this card used to show, which
 * collapsed into invisible slivers whenever the windows sat decades apart
 * (a 2027 window and a 2055 one on the same axis).
 *
 * Line/area take the single accent hue (magnitude, one series). Only the peak
 * markers carry HIGH/MEDIUM/LOW color, and never alone: each window's legend
 * row underneath repeats the level as text and adds its exact dates, which the
 * old bars only ever exposed through a hover `<title>` — unreachable on the
 * touch devices this screen mostly runs on.
 */
export default function TimingWindowsCurve({ windows }: { windows: RankedWindow[] }) {
  const { t } = useTranslation();
  const domain = computeTimelineDomain(windows);
  if (!domain || windows.length === 0) return null;

  const { points, peaks } = buildWindowCurve(windows, domain, VIEW_W, VIEW_H);
  const linePath = buildLinePath(points);
  const areaPath = buildAreaPath(points, VIEW_H);

  return (
    <div className="flex flex-col gap-1.5">
      <svg
        viewBox={`0 ${-PAD_Y} ${VIEW_W} ${VIEW_H + PAD_Y}`}
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H + PAD_Y}` }}
        className="w-full"
        aria-hidden="true"
      >
        <path d={areaPath} fill={ACCENT_COLOR} opacity={0.14} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={ACCENT_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* baseline — recessive hairline, not a data mark */}
        <line x1={0} y1={VIEW_H} x2={VIEW_W} y2={VIEW_H} stroke="var(--border)" strokeWidth={1} />

        {peaks.map((p, i) => (
          <g key={`${p.window.startDate}-${p.window.endDate}-${i}`}>
            <title>{`${formatWindowDate(p.window.startDate)} - ${formatWindowDate(p.window.endDate)}`}</title>
            <line x1={p.x} y1={p.y} x2={p.x} y2={VIEW_H} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 3" />
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill={TIMING_LEVEL_COLOR[p.window.level]}
              stroke="var(--card)"
              strokeWidth={1.5}
            />
          </g>
        ))}
      </svg>

      <div className="flex justify-between px-0.5 text-[9px] tabular-nums text-muted">
        <span>{formatWindowDate(new Date(domain.startMs).toISOString())}</span>
        <span>{formatWindowDate(new Date(domain.endMs).toISOString())}</span>
      </div>

      <div className="flex flex-col gap-1 pt-0.5">
        {windows.map((w, i) => (
          <div key={`${w.startDate}-${w.endDate}-${i}`} className="flex items-center gap-2">
            <span
              className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-medium whitespace-nowrap ${LEVEL_STYLES[w.level]}`}
            >
              {t(`reports.facts.level.${w.level.toLowerCase()}`)}
            </span>
            <span className="text-[10px] tabular-nums text-muted">
              {formatWindowDate(w.startDate)} – {formatWindowDate(w.endDate)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
