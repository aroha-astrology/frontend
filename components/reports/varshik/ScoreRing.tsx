"use client";

import { useTranslation } from "react-i18next";
import type { Tier } from "./types";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, tierOf, useChartMode } from "./tiers";

interface ScoreRingProps {
  score: number;
  /** Defaults to the tier the score falls in. */
  tier?: Tier;
  /** Words under the ring, e.g. "Your 2027". Rendered as HTML so Indic text wraps. */
  caption?: string;
  /** CSS width of the ring, default 9rem. */
  size?: string;
}

const R = 52;
const C = 2 * Math.PI * R;

/** Overall score ring (0-100): a tier-coloured arc, the number, and the tier word beneath. */
export default function ScoreRing({ score, tier, caption, size = "9rem" }: ScoreRingProps) {
  const { t } = useTranslation();
  const mode = useChartMode();
  const safe = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const tr = tier ?? tierOf(safe);
  const color = TIER_COLOR[mode][tr];
  const word = t(TIER_WORD[tr].key, { defaultValue: TIER_WORD[tr].en });
  const label = t("varshik.ring.label", {
    defaultValue: "Overall score {{score}} out of 100, {{tier}}",
    score: Math.round(safe),
    tier: word,
  });

  return (
    <figure className="m-0 flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: size, maxWidth: "100%" }}>
        <svg viewBox="0 0 120 120" className="h-auto w-full" role="img" aria-label={label}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border-faint)" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(safe / 100) * C} ${C}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold leading-[1.45] tabular-nums" style={{ color: "var(--foreground)" }}>
            {Math.round(safe)}
          </span>
          <span className="text-xs leading-[1.45]" style={{ color: "var(--text-muted)" }}>
            / 100
          </span>
        </div>
      </div>
      <figcaption className="flex min-w-0 flex-col items-center gap-0.5 break-words leading-[1.45]">
        <span className="text-sm font-medium" style={{ color }}>
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
