"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { dayOfYear, monthShort } from "./format";
import { monotoneAreaPath, monotonePath, type Pt } from "./curve";

interface MuddaPeriod {
  lord: string;
  from: string;
  to: string;
}
interface SahamPin {
  saham: string;
  exact: string[];
  /** When given, the strongest windows get the pins. */
  strength?: number;
}

const X0 = 8;
const X1 = 352;
const Y_TOP = 40;
const Y_BASE = 130;
const DAYS = 364;
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MUDDA_OPACITY = [0.35, 0.65];

const xOf = (day: number) => X0 + (day / DAYS) * (X1 - X0);
const yOf = (score: number) => Y_BASE - (Math.max(0, Math.min(100, score)) / 100) * (Y_BASE - Y_TOP);

/** The year's rhythm: daily score wave, Mudda dasha bar under it, Saham pins above it. */
export default function MomentumWave({
  daily,
  mudda,
  sahams = [],
}: {
  daily: number[];
  mudda: MuddaPeriod[];
  sahams?: SahamPin[];
}) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  if (daily.length === 0) return null;

  const dateFmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short", timeZone: "UTC" }).format(
        new Date(`${iso}T00:00:00Z`),
      );
    } catch {
      return iso;
    }
  };

  const points: Pt[] = [];
  daily.forEach((score, i) => {
    if (i % 3 === 0 || i === daily.length - 1) points.push({ x: xOf(i), y: yOf(score) });
  });

  const bars = mudda
    .map((m, i) => ({ ...m, a: dayOfYear(m.from), b: dayOfYear(m.to), i }))
    .filter((m) => m.b > m.a);

  // The strongest windows first, kept only when 14+ units clear of every pin already kept, then
  // numbered left to right so the list under the chart reads in date order.
  const kept: { saham: string; date: string; x: number }[] = [];
  const byStrength = [...sahams].sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
  for (const s of byStrength) {
    const date = s.exact[0];
    if (!date || kept.length >= 8) continue;
    const x = xOf(dayOfYear(date));
    if (kept.some((k) => Math.abs(k.x - x) < 14)) continue;
    kept.push({ saham: s.saham, date, x });
  }
  const pins = kept.sort((a, b) => a.x - b.x).map((k, i) => ({ ...k, n: i + 1 }));

  const months = Array.from({ length: 12 }, (_, i) => monthShort(i, i18n.language));

  return (
    <div className="flex flex-col gap-3 leading-[1.45]">
      <svg
        viewBox="0 0 360 190"
        className="h-auto w-full"
        role="img"
        aria-label={t("varshik.wave.label", { defaultValue: "Daily rhythm of the year 2027" })}
      >
        {[45, 60, 75].map((edge) => (
          <line
            key={edge}
            x1={X0}
            x2={X1}
            y1={yOf(edge)}
            y2={yOf(edge)}
            stroke="var(--border-faint)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--vk-gold-lo)" />
            <stop offset="40%" stopColor="var(--vk-gold-hi)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
          <filter id={`${gid}-glow`} x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={monotoneAreaPath(points, Y_BASE)} fill={`url(#${gid}-fill)`} />
        <motion.path
          d={monotonePath(points)}
          fill="none"
          stroke={`url(#${gid}-stroke)`}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${gid}-glow)`}
          initial={{ pathLength: reduce ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 1.6, ease: "easeInOut" }}
        />
        {MONTH_START.map((d) => (
          <line key={d} x1={xOf(d)} x2={xOf(d)} y1={132} y2={137} stroke="var(--text-muted)" strokeWidth={1} />
        ))}
        {bars.map((m) => (
          <rect
            key={m.i}
            x={xOf(m.a) + 0.75}
            y={148}
            width={Math.max(1, xOf(m.b) - xOf(m.a) - 1.5)}
            height={16}
            rx={3}
            fill="var(--gold)"
            opacity={MUDDA_OPACITY[m.i % 2]}
          />
        ))}
        {pins.map((p) => (
          <g key={p.n} aria-hidden="true">
            <text x={p.x} y={11} fontSize={9} textAnchor="middle" fill="var(--foreground)">
              {p.n}
            </text>
            <path d={`M${p.x - 4},14 L${p.x + 4},14 L${p.x},26 Z`} fill="var(--gold)" />
            <line x1={p.x} x2={p.x} y1={26} y2={Y_TOP} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="2 3" />
          </g>
        ))}
      </svg>

      <div className="grid grid-cols-6 gap-y-1 min-[420px]:grid-cols-12">
        {months.map((m, i) => (
          <span key={i} className="min-w-0 break-words text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
            {m}
          </span>
        ))}
      </div>

      {bars.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {bars.map((m) => (
            <li key={m.i} className="flex min-w-0 items-center gap-2 break-words text-xs" style={{ color: "var(--foreground)" }}>
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: "var(--gold)", opacity: MUDDA_OPACITY[m.i % 2] }}
              />
              <span className="min-w-0">
                {m.lord} · {dateFmt(m.from)} {t("varshik.wave.to", { defaultValue: "to" })} {dateFmt(m.to)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {pins.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {pins.map((p) => (
            <li key={p.n} className="min-w-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
              <span className="mr-2 font-semibold" style={{ color: "var(--gold)" }}>
                {p.n}
              </span>
              {p.saham}, {dateFmt(p.date)}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
