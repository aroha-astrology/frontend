"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Cell } from "./types";
import { TIER_COLOR, TIER_GLYPH, useChartMode } from "./tiers";
import { monthShort } from "./format";
import { monotoneAreaPath, monotonePath } from "./curve";

const X0 = 16;
const STEP = 328 / 11;
// The axis runs 25 to 100: scores below 25 do not occur, and the bottom of the plot would sit empty.
const yOf = (score: number) => 112 - ((Math.max(25, Math.min(100, score)) - 25) / 75) * 98;

/** Twelve-month score line for one area: a smooth foil-gold curve over a soft gradient, best months ringed, rest months marked. */
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
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  if (cells.length !== 12) return null;

  const pts = cells.map((c, i) => ({ x: X0 + i * STEP, y: yOf(c.score) }));

  return (
    <div className="flex flex-col gap-4 leading-[1.45]">
      <svg
        viewBox="0 0 360 150"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={t("varshik.areaMonth.label", {
          defaultValue: "Twelve month score line for {{area}}",
          area: areaLabel,
        })}
      >
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--vk-gold-lo)" />
            <stop offset="45%" stopColor="var(--vk-gold-hi)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
          <filter id={`${gid}-glow`} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[45, 60, 75].map((edge) => (
          <line key={edge} x1={X0} x2={344} y1={yOf(edge)} y2={yOf(edge)} stroke="var(--gold)" strokeOpacity={0.2} strokeWidth={0.8} strokeDasharray="2 5" />
        ))}
        <path d={monotoneAreaPath(pts, 112)} fill={`url(#${gid}-fill)`} />
        <motion.path
          d={monotonePath(pts)}
          fill="none"
          stroke={`url(#${gid}-stroke)`}
          strokeWidth={2.4}
          strokeLinecap="round"
          filter={`url(#${gid}-glow)`}
          initial={{ pathLength: reduce ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 1.2, ease: "easeInOut" }}
        />
        {pts.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4.5}
            fill={TIER_COLOR[mode][cells[i].tier]}
            stroke="var(--card)"
            strokeWidth={2}
            initial={{ opacity: reduce ? 1 : 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: reduce ? 0 : 0.5 + i * 0.07, duration: 0.3 }}
          />
        ))}
        {bestMonths.map((m) =>
          pts[m] ? (
            <circle key={`b${m}`} cx={pts[m].x} cy={pts[m].y} r={9} fill="none" stroke="var(--gold)" strokeWidth={1.4} opacity={0.9} />
          ) : null,
        )}
        {holdMonths.map((m) =>
          pts[m] ? (
            <path
              key={`h${m}`}
              aria-hidden="true"
              d={`M${pts[m].x},123 l5,5 l-5,5 l-5,-5 Z`}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={1.2}
            />
          ) : null,
        )}
      </svg>

      <div className="grid grid-cols-6 gap-y-2.5 min-[420px]:grid-cols-12">
        {cells.map((c, i) => (
          <div key={i} className="min-w-0 text-center">
            <div className="break-words text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
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
