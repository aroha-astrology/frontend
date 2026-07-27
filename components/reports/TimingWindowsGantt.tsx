"use client";

import { useTranslation } from "react-i18next";
import { computeTimelineDomain, windowBarRect } from "@/lib/report-chart-geometry";
import { TIMING_LEVEL_COLOR } from "@/lib/chart-palette";
import { LEVEL_STYLES, formatWindowDate } from "./TimingWindowsCard";
import type { RankedWindow } from "@/lib/report-score-facts";

const VIEW_W = 100;
const VIEW_H = 6.5;

/**
 * Horizontal Gantt strip for RankedWindow[] — each window gets its own
 * start-to-end bar positioned on ONE shared date axis (computeTimelineDomain
 * spans every window's earliest start to latest end), so overlapping or
 * back-to-back windows are visually comparable at a glance — something the
 * retained per-window card list below (unchanged, still exact dates +
 * reasoning) can't show on its own.
 *
 * `level` is a labelled status pill directly on each row (not color alone):
 * reuses TimingWindowsCard.tsx's own LEVEL_STYLES classes for the pill text
 * and lib/chart-palette.ts's TIMING_LEVEL_COLOR for the bar fill — both
 * trace back to the exact same HIGH=emerald/MEDIUM=amber/LOW=muted
 * convention this app already uses, per the dataviz skill's "status colors
 * are reserved, never invented per-chart" rule.
 *
 * Each row's bar is its own tiny SVG (viewBox 0 0 100 6.5, matching a ~15:1
 * aspect ratio locked via CSS `aspectRatio`) so the pill-rounded ends render
 * as true circular arcs at any responsive row width. Bars are floating
 * date-ranges (no zero baseline to anchor "square" against, unlike a
 * magnitude bar), so both ends are rounded — a conventional Gantt/range-bar
 * treatment, not a mark-spec deviation.
 */
export default function TimingWindowsGantt({ windows }: { windows: RankedWindow[] }) {
  const { t } = useTranslation();
  const domain = computeTimelineDomain(windows);
  if (!domain || windows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between px-0.5 text-[9px] tabular-nums text-muted">
        <span>{formatWindowDate(new Date(domain.startMs).toISOString())}</span>
        <span>{formatWindowDate(new Date(domain.endMs).toISOString())}</span>
      </div>

      {windows.map((w, i) => {
        const { xPct, widthPct } = windowBarRect(w, domain);
        return (
          <div key={`${w.startDate}-${w.endDate}-${i}`} className="flex items-center gap-2">
            <span
              className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-medium whitespace-nowrap ${LEVEL_STYLES[w.level]}`}
            >
              {t(`reports.facts.level.${w.level.toLowerCase()}`)}
            </span>
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
              className="flex-1 min-w-0"
              aria-hidden="true"
            >
              {/* Track also carries the tooltip so the hoverable area covers
                  the full row width, not just the (sometimes narrow) bar
                  itself — a thin bar would otherwise be a pinpoint target. */}
              <rect x={0} y={0} width={VIEW_W} height={VIEW_H} rx={VIEW_H / 2} fill="var(--border)" opacity={0.25}>
                <title>{`${formatWindowDate(w.startDate)} - ${formatWindowDate(w.endDate)}`}</title>
              </rect>
              <rect
                x={xPct}
                y={0}
                width={widthPct}
                height={VIEW_H}
                rx={VIEW_H / 2}
                fill={TIMING_LEVEL_COLOR[w.level]}
              >
                <title>{`${formatWindowDate(w.startDate)} - ${formatWindowDate(w.endDate)}`}</title>
              </rect>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
