"use client";

import { useTranslation } from "react-i18next";
import { layoutDecadePoints, buildLinePath, buildAreaPath } from "@/lib/report-chart-geometry";
import { ACCENT_COLOR } from "@/lib/chart-palette";
import type { DecadeBand } from "@/lib/report-score-facts";

const VIEW_W = 400;
const VIEW_H = 100;

function decadeYear(iso: string): string {
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? String(y) : "";
}

/**
 * Decade-by-decade score arc — a single-series line/area over time (the
 * dataviz skill's form heuristic: "trend over time -> line; area for a
 * single series"). One hue (ACCENT_COLOR = var(--gold)) for the line/area —
 * `tone` (favorable/mixed/challenging) is NOT color-coded onto the line
 * itself (that would double-encode the same score information the line
 * already shows, confusingly); instead each decade's existing tone badge in
 * the retained per-decade card list right below this chart (see
 * DecadeArcCard.tsx — unchanged) IS the "row below the chart" of labelled
 * status chips the skill calls for.
 *
 * The chart only draws the trend; the retained list underneath still carries
 * exact dates and the tone badge, so nothing here duplicates that text.
 */
export default function DecadeArcChart({ bands }: { bands: DecadeBand[] }) {
  const { t } = useTranslation();
  if (bands.length === 0) return null;

  const points = layoutDecadePoints(bands, VIEW_W, VIEW_H, 100);
  const hasLine = points.length >= 2;
  const linePath = hasLine ? buildLinePath(points) : "";
  const areaPath = hasLine ? buildAreaPath(points, VIEW_H) : "";

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

        {hasLine && (
          <>
            <path d={areaPath} fill={ACCENT_COLOR} opacity={0.12} stroke="none" />
            <path d={linePath} fill="none" stroke={ACCENT_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {points.map((p, i) => {
          const b = bands[i];
          return (
            <g key={`${b.label}-${i}`}>
              <title>{`${b.label}: ${Math.round(b.score)}/100 — ${t(`reports.facts.tone.${b.tone}`)}`}</title>
              {/* Invisible, larger hit target (dataviz skill: hover targets
                  should clear a ~24px minimum, well past the visible dot's
                  own r=5) — the viewBox is scaled well below 1 unit-per-px on
                  a typical card width, so the drawn marker alone would be a
                  pinpoint target. */}
              <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={5} fill={ACCENT_COLOR} stroke="var(--card)" strokeWidth={2} />
            </g>
          );
        })}
      </svg>

      {bands.length > 1 && (
        <div className="flex justify-between px-0.5">
          {bands.map((b, i) => (
            <span key={`${b.label}-${i}`} className="text-[9px] tabular-nums text-muted">
              {decadeYear(b.startDate)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
