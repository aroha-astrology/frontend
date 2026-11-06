"use client";

import { useTranslation } from "react-i18next";
import { AREAS, type Cell } from "./types";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, useChartMode } from "./tiers";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Seven areas overview: one horizontal bar per life area, tier-coloured, scored out of 100. */
export default function AreaBars({
  areas,
  order = AREAS,
}: {
  areas: Record<string, Cell>;
  order?: readonly string[];
}) {
  const { t } = useTranslation();
  const mode = useChartMode();
  const keys = order.filter((k) => areas[k]);
  if (keys.length === 0) return null;

  return (
    <ul
      className="m-0 flex list-none flex-col gap-3 p-0 leading-[1.45]"
      aria-label={t("varshik.areaBars.label", { defaultValue: "Scores for the seven areas of life" })}
    >
      {keys.map((key) => {
        const cell = areas[key];
        const score = Number.isFinite(cell.score) ? Math.max(0, Math.min(100, cell.score)) : 0;
        const color = TIER_COLOR[mode][cell.tier];
        return (
          <li key={key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 flex-1 break-words text-sm" style={{ color: "var(--foreground)" }}>
                {t(`varshik.area.${key}`, { defaultValue: cap(key) })}
              </span>
              <span className="flex shrink-0 items-baseline gap-1.5">
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                  {Math.round(score)}
                </span>
                <span className="text-xs" style={{ color }}>
                  <span aria-hidden="true">{TIER_GLYPH[cell.tier]} </span>
                  {t(TIER_WORD[cell.tier].key, { defaultValue: TIER_WORD[cell.tier].en })}
                </span>
              </span>
            </div>
            <div className="relative h-2.5 w-full rounded-full" style={{ background: "var(--border-faint)" }}>
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${score}%`, background: color, borderRadius: "0 999px 999px 0" }}
              />
              {[45, 60, 75].map((edge) => (
                <span
                  key={edge}
                  aria-hidden="true"
                  className="absolute inset-y-0 w-px"
                  style={{ left: `${edge}%`, background: "var(--text-muted)", opacity: 0.45 }}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
