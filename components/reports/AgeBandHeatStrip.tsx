"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { computeAgeBandSegments, formatAgeRange } from "@/lib/report-chart-geometry";
import { ageConfidenceColor } from "@/lib/chart-palette";
import type { AgeBand } from "@/lib/report-score-facts";

const VIEW_W = 100;
const VIEW_H = 16;
const GAP = 0.6; // thin surface-color gap between touching segments, in viewBox units

/**
 * Sequential confidence heat strip for AgeBand[] — one hand-drawn-free,
 * touching segment per band, each sized proportionally to its age span
 * (computeAgeBandSegments) and colored by lib/chart-palette.ts's validated
 * NONE->HIGH ordinal ramp (one hue, monotone lightness — NOT the discrete
 * HIGH/MEDIUM/LOW/NONE badge colors AgeBandTable already renders per row
 * below this strip, which stay untouched).
 *
 * Segments are direct-labelled with their own age-range text (e.g. "0-18"),
 * new information this card didn't show anywhere before (the existing row
 * list only ever showed each band's name + confidence, never the numeric
 * age range).
 *
 * Same "true circular corners on a responsive width" trick as the other 3
 * charts: a `<clipPath>` rounds only the strip's OUTER silhouette, while
 * individual segment edges inside stay straight — the mark-spec's "2px
 * surface gap" separator between touching segments, not per-segment corner
 * rounding.
 */
export default function AgeBandHeatStrip({ bands }: { bands: AgeBand[] }) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const clipId = useId();
  // next-themes only resolves on the client; gate to avoid a hydration
  // mismatch (matches components/ui/BrandLogo.tsx's established pattern).
  useEffect(() => setMounted(true), []);
  const mode: "light" | "dark" = mounted && resolvedTheme === "light" ? "light" : "dark";

  const segments = computeAgeBandSegments(bands);
  if (segments.length === 0) return null;

  let cursor = 0;
  const rects = segments.map((seg, i) => {
    const x = cursor;
    const isLast = i === segments.length - 1;
    const width = Math.max(seg.widthPct - (isLast ? 0 : GAP), 0);
    cursor += seg.widthPct;
    return { ...seg, x, width };
  });

  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }} className="w-full" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={VIEW_W} height={VIEW_H} rx={4} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {rects.map((r, i) => (
            <rect key={`${r.startAge}-${i}`} x={r.x} y={0} width={r.width} height={VIEW_H} fill={ageConfidenceColor(r.confidence, mode)}>
              <title>{`${formatAgeRange(r)} — ${t(`reports.facts.level.${r.confidence.toLowerCase()}`)}`}</title>
            </rect>
          ))}
        </g>
      </svg>

      <div className="flex">
        {rects.map((r, i) => (
          <div key={`${r.startAge}-label-${i}`} style={{ flex: `0 0 ${r.widthPct}%` }} className="min-w-0 px-0.5 text-center">
            <span className="block truncate text-[9px] tabular-nums text-muted">{formatAgeRange(r)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
