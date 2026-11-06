"use client";

import { motion, useReducedMotion } from "framer-motion";
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

/** Master Timing Map: seven areas by twelve months. Each cell is a jewel-toned tile; the grid reveals month by month. */
export default function TimingMap({
  map,
  order = AREAS,
  peakMonths = [],
  restMonth,
  onMonth,
}: {
  map: Record<string, Cell[]>;
  order?: readonly string[];
  peakMonths?: number[];
  restMonth?: number;
  /** When given, every tile opens that month (keyboard and tap). */
  onMonth?: (month: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  const reduce = useReducedMotion();
  const keys = order.filter((k) => map[k]?.length === 12);
  if (keys.length === 0) return null;
  const tierWord = (tier: Tier) => t(TIER_WORD[tier].key, { defaultValue: TIER_WORD[tier].en });
  const ink = (tier: Tier) => (mode === "dark" && tier !== "rust" ? "#0a0a0c" : "#ffffff");

  return (
    <div className="flex flex-col gap-4 leading-[1.45]">
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
                boxShadow: peakMonths.includes(m) ? "0 0 8px var(--gold)" : "none",
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
            className="col-span-3 min-w-0 whitespace-nowrap text-[10px] uppercase tracking-[0.14em]"
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
              {map[key].map((cell, m) => {
                const c = TIER_COLOR[mode][cell.tier];
                return (
                  <motion.div
                    key={m}
                    className={`flex aspect-square items-center justify-center rounded-[4px] ${onMonth ? "cursor-pointer" : ""}`}
                    style={{
                      background: `linear-gradient(160deg, color-mix(in srgb, ${c} 82%, #fff 18%), ${c} 55%, color-mix(in srgb, ${c} 80%, #000 20%))`,
                      color: ink(cell.tier),
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 6px -2px ${c}`,
                    }}
                    title={`${area}, ${monthShort(m, i18n.language)}: ${Math.round(cell.score)}, ${tierWord(cell.tier)}`}
                    aria-label={`${area}, ${monthShort(m, i18n.language)}: ${Math.round(cell.score)}, ${tierWord(cell.tier)}`}
                    {...(onMonth
                      ? {
                          role: "button" as const,
                          tabIndex: 0,
                          onClick: () => onMonth(m),
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onMonth(m);
                            }
                          },
                        }
                      : {})}
                    initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.7 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "0px 0px -6% 0px" }}
                    transition={{ duration: 0.32, delay: reduce ? 0 : m * 0.035, ease: "easeOut" }}
                  >
                    <span className="text-[9px] font-semibold tabular-nums min-[400px]:text-[10px]">
                      {Math.round(cell.score)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-xs">
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
