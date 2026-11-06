"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Tier } from "./types";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, tierOf, useChartMode } from "./tiers";
import { useCountUp } from "./motion";

interface ScoreRingProps {
  score: number;
  /** Defaults to the tier the score falls in. */
  tier?: Tier;
  /** Words under the ring, e.g. "Your 2027". Rendered as HTML so Indic text wraps. */
  caption?: string;
  /** CSS width of the ring, default 11rem. */
  size?: string;
}

const R = 52;
const C = 2 * Math.PI * R;

/** Overall score ring (0-100): a glowing gradient arc, 60 fine ticks, a foil numeral that counts up, and the tier word. */
export default function ScoreRing({ score, tier, caption, size = "11rem" }: ScoreRingProps) {
  const { t } = useTranslation();
  const mode = useChartMode();
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const safe = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const tr = tier ?? tierOf(safe);
  const color = TIER_COLOR[mode][tr];
  const word = t(TIER_WORD[tr].key, { defaultValue: TIER_WORD[tr].en });
  const { ref, value } = useCountUp(Math.round(safe), 1.1);
  const label = t("varshik.ring.label", {
    defaultValue: "Overall score {{score}} out of 100, {{tier}}",
    score: Math.round(safe),
    tier: word,
  });
  const target = (safe / 100) * C;

  return (
    <figure className="m-0 flex flex-col items-center gap-3 text-center">
      <div className="relative" style={{ width: size, maxWidth: "100%" }}>
        <svg viewBox="0 0 120 120" className="h-auto w-full overflow-visible" role="img" aria-label={label}>
          <defs>
            <linearGradient id={`${gid}-arc`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.55" />
              <stop offset="55%" stopColor={color} />
              <stop offset="100%" stopColor="#fff6d6" />
            </linearGradient>
            <filter id={`${gid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const major = i % 5 === 0;
            const r1 = 60 - (major ? 5 : 3);
            return (
              <line
                key={i}
                x1={60 + Math.cos(a) * r1}
                y1={60 + Math.sin(a) * r1}
                x2={60 + Math.cos(a) * 59}
                y2={60 + Math.sin(a) * 59}
                stroke="var(--gold)"
                strokeWidth={major ? 0.9 : 0.4}
                opacity={major ? 0.7 : 0.35}
              />
            );
          })}
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border-faint)" strokeWidth="7" />
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={`url(#${gid}-arc)`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${target} ${C}`}
            transform="rotate(-90 60 60)"
            filter={`url(#${gid}-glow)`}
            initial={{ strokeDasharray: `${reduce ? target : 0} ${C}` }}
            whileInView={{ strokeDasharray: `${target} ${C}` }}
            viewport={{ once: true }}
            transition={{ duration: reduce ? 0 : 1.1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            ref={ref}
            className="vk-foil vk-shimmer font-light leading-none tabular-nums"
            style={{ fontFamily: "var(--font-serif-alt), Georgia, serif", fontSize: "3.4rem" }}
          >
            {value}
          </span>
          <span className="mt-1 text-xs tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
            / 100
          </span>
        </div>
      </div>
      <figcaption className="flex min-w-0 flex-col items-center gap-1 break-words leading-[1.45]">
        <span
          className="rounded-full border px-3 py-0.5 text-sm font-medium"
          style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <span aria-hidden="true">{TIER_GLYPH[tr]} </span>
          {word}
        </span>
        {caption ? (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {caption}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
