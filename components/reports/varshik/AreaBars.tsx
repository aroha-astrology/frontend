"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AREAS, type Cell } from "./types";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, useChartMode } from "./tiers";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Seven areas overview: a glowing gradient bar per life area, each filling once as it scrolls in. */
export default function AreaBars({
  areas,
  order = AREAS,
}: {
  areas: Record<string, Cell>;
  order?: readonly string[];
}) {
  const { t } = useTranslation();
  const mode = useChartMode();
  const reduce = useReducedMotion();
  const keys = order.filter((k) => areas[k]);
  if (keys.length === 0) return null;

  return (
    <ul
      className="m-0 flex list-none flex-col gap-4 p-0 leading-[1.45]"
      aria-label={t("varshik.areaBars.label", { defaultValue: "Scores for the seven areas of life" })}
    >
      {keys.map((key, i) => {
        const cell = areas[key];
        const score = Number.isFinite(cell.score) ? Math.max(0, Math.min(100, cell.score)) : 0;
        const color = TIER_COLOR[mode][cell.tier];
        return (
          <li key={key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 flex-1 break-words text-[0.95rem]" style={{ color: "var(--foreground)" }}>
                {t(`varshik.area.${key}`, { defaultValue: cap(key) })}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span
                  className="tabular-nums"
                  style={{ fontFamily: "var(--font-serif-alt), Georgia, serif", fontSize: "1.5rem", color: "var(--foreground)" }}
                >
                  {Math.round(score)}
                </span>
                <span className="text-xs" style={{ color }}>
                  <span aria-hidden="true">{TIER_GLYPH[cell.tier]} </span>
                  {t(TIER_WORD[cell.tier].key, { defaultValue: TIER_WORD[cell.tier].en })}
                </span>
              </span>
            </div>
            <div
              className="relative h-2 w-full rounded-full"
              style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)" }}
            >
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{
                  background: `linear-gradient(90deg, color-mix(in srgb, ${color} 45%, transparent), ${color})`,
                  borderRadius: "0 999px 999px 0",
                  boxShadow: `0 0 12px -1px ${color}`,
                }}
                initial={{ width: reduce ? `${score}%` : "0%" }}
                whileInView={{ width: `${score}%` }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : i * 0.06, ease: "easeOut" }}
              />
              {[45, 60, 75].map((edge) => (
                <span
                  key={edge}
                  aria-hidden="true"
                  className="absolute -inset-y-1 w-px"
                  style={{ left: `${edge}%`, background: "var(--gold)", opacity: 0.35 }}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
