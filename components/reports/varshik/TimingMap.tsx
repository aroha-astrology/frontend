"use client";

import { useTranslation } from "react-i18next";
import { AREAS, type Cell, type Tier } from "./types";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, useChartMode } from "./tiers";
import { monthShort } from "./format";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const TIERS: { tier: Tier; range: string }[] = [
  { tier: "dark_green", range: "75+" },
  { tier: "light_green", range: "60-74" },
  { tier: "amber", range: "45-59" },
  { tier: "rust", range: "<45" },
];

/** Master Timing Map: seven areas by twelve months, each cell coloured by tier. */
export default function TimingMap({
  map,
  order = AREAS,
  peakMonths = [],
  restMonth,
}: {
  map: Record<string, Cell[]>;
  order?: readonly string[];
  peakMonths?: number[];
  restMonth?: number;
}) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  const keys = order.filter((k) => map[k]?.length === 12);
  if (keys.length === 0) return null;
  const tierWord = (tier: Tier) => t(TIER_WORD[tier].key, { defaultValue: TIER_WORD[tier].en });
  const ink = (tier: Tier) => (mode === "dark" && tier !== "rust" ? "#0b0b2a" : "#ffffff");

  return (
    <div className="flex flex-col gap-3 leading-[1.45]">
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "minmax(5rem, 32%) repeat(12, minmax(0, 1fr))" }}
      >
        <div />
        {Array.from({ length: 12 }, (_, m) => (
          <div key={m} className="flex min-w-0 items-end justify-center">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: peakMonths.includes(m) ? "var(--gold)" : "transparent",
                border: m === restMonth ? "1px solid var(--text-muted)" : "none",
              }}
            />
          </div>
        ))}
        {/* Names for Jan, Apr, Jul and Oct only: 12 names never fit 12 narrow columns in Hindi or Tamil.
            Every cell below still carries its own full month in its title and aria-label. */}
        <div />
        {[0, 3, 6, 9].map((m) => (
          <span
            key={m}
            aria-hidden="true"
            className="col-span-3 min-w-0 whitespace-nowrap text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            {monthShort(m, i18n.language)}
          </span>
        ))}
        {keys.map((key) => {
          const area = t(`varshik.area.${key}`, { defaultValue: cap(key) });
          return (
            <div key={key} className="contents">
              <div className="min-w-0 self-center break-words text-xs" style={{ color: "var(--foreground)" }}>
                {area}
              </div>
              {map[key].map((cell, m) => (
                <div
                  key={m}
                  className="flex aspect-square items-center justify-center rounded-[3px]"
                  style={{ background: TIER_COLOR[mode][cell.tier], color: ink(cell.tier) }}
                  title={`${area}, ${monthShort(m, i18n.language)}: ${Math.round(cell.score)}, ${tierWord(cell.tier)}`}
                  aria-label={`${area}, ${monthShort(m, i18n.language)}: ${Math.round(cell.score)}, ${tierWord(cell.tier)}`}
                >
                  <span className="text-[9px] font-semibold tabular-nums min-[400px]:text-[10px]">
                    {Math.round(cell.score)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs">
        {TIERS.map(({ tier, range }) => (
          <li key={tier} className="flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TIER_COLOR[mode][tier] }} />
            <span aria-hidden="true">{TIER_GLYPH[tier]}</span>
            {tierWord(tier)} <span style={{ color: "var(--text-muted)" }}>{range}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
