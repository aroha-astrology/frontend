"use client";

import { useTranslation } from "react-i18next";
import type { Cell } from "./types";
import { TIER_COLOR, TIER_GLYPH, useChartMode } from "./tiers";
import { monthShort } from "./format";

const X0 = 16;
const STEP = 328 / 11;
const yOf = (score: number) => 112 - (Math.max(0, Math.min(100, score)) / 100) * 98;

/** Twelve-month score line for one area, with best (ring) and rest (diamond) months marked. */
export default function AreaMonthLine({
  cells,
  bestMonths = [],
  holdMonths = [],
  areaLabel,
}: {
  cells: Cell[];
  bestMonths?: number[];
  holdMonths?: number[];
  areaLabel: string;
}) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  if (cells.length !== 12) return null;

  const pts = cells.map((c, i) => ({ x: X0 + i * STEP, y: yOf(c.score) }));
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="flex flex-col gap-3 leading-[1.45]">
      <svg
        viewBox="0 0 360 150"
        className="h-auto w-full"
        role="img"
        aria-label={t("varshik.areaMonth.label", {
          defaultValue: "Twelve month score line for {{area}}",
          area: areaLabel,
        })}
      >
        {[45, 60, 75].map((edge) => (
          <line
            key={edge}
            x1={X0}
            x2={344}
            y1={yOf(edge)}
            y2={yOf(edge)}
            stroke="var(--border-faint)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}
        <polyline points={line} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill={TIER_COLOR[mode][cells[i].tier]} stroke="var(--card)" strokeWidth={2} />
        ))}
        {bestMonths.map((m) =>
          pts[m] ? <circle key={`b${m}`} cx={pts[m].x} cy={pts[m].y} r={9} fill="none" stroke="var(--gold)" strokeWidth={2} /> : null,
        )}
        {holdMonths.map((m) =>
          pts[m] ? (
            <path
              key={`h${m}`}
              aria-hidden="true"
              d={`M${pts[m].x},123 l5,5 l-5,5 l-5,-5 Z`}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
            />
          ) : null,
        )}
      </svg>

      <div className="grid grid-cols-6 gap-y-2 min-[420px]:grid-cols-12">
        {cells.map((c, i) => (
          <div key={i} className="min-w-0 text-center">
            <div className="break-words text-[11px]" style={{ color: "var(--text-muted)" }}>
              {monthShort(i, i18n.language)}
            </div>
            <div className="text-xs tabular-nums" style={{ color: "var(--foreground)" }}>
              <span aria-hidden="true" style={{ color: TIER_COLOR[mode][c.tier] }}>
                {TIER_GLYPH[c.tier]}{" "}
              </span>
              {Math.round(c.score)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>
          <span aria-hidden="true" style={{ color: "var(--gold)" }}>◯ </span>
          {t("varshik.areaMonth.best", { defaultValue: "Best month" })}
        </span>
        <span>
          <span aria-hidden="true">◇ </span>
          {t("varshik.areaMonth.rest", { defaultValue: "Rest month" })}
        </span>
      </div>
    </div>
  );
}
