"use client";

import { useTranslation } from "react-i18next";
import type { PlanetImpactRow } from "./types";
import { TIER_COLOR, useChartMode } from "./tiers";
import { monthShort } from "./format";

const GLYPH: Record<string, string> = {
  Sun: "☉", Moon: "☾", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};
const EFFECT_EN = { helping: "Helping", weighing: "Weighing", neutral: "Steady" } as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Planet by planet: how each of the nine planets treats the reader in 2027. */
export default function PlanetImpactTable({
  rows,
  icons = {},
}: {
  rows: PlanetImpactRow[];
  icons?: Record<string, string>;
}) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  if (rows.length === 0) return null;

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0 leading-[1.45]">
      {rows.map((r) => {
        const word = t(`varshik.planet.${r.planet.toLowerCase()}`, { defaultValue: r.planet });
        const pill =
          r.effect === "helping"
            ? { glyph: "▲", color: TIER_COLOR[mode].dark_green }
            : r.effect === "weighing"
              ? { glyph: "▼", color: TIER_COLOR[mode].rust }
              : { glyph: "■", color: "var(--text-muted)" };
        return (
          <li
            key={r.planet}
            className="flex gap-3 vk-panel p-3"
          >
            {icons[r.planet] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icons[r.planet]} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-faint)] text-lg"
                style={{ color: "var(--gold)" }}
              >
                {GLYPH[r.planet] ?? "✦"}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="vk-h3 min-w-0 break-words">
                  {word}
                </span>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: pill.color, color: pill.color }}>
                  <span aria-hidden="true">{pill.glyph} </span>
                  {t(`varshik.effect.${r.effect}`, { defaultValue: EFFECT_EN[r.effect] })}
                </span>
              </div>
              <p className="m-0 break-words text-xs" style={{ color: "var(--text-muted)" }}>
                {r.natalHouse !== null
                  ? t("varshik.impact.house", { defaultValue: "House {{n}} in your birth chart", n: r.natalHouse })
                  : null}
                {r.natalHouse !== null && r.roles.length > 0 ? ". " : null}
                {r.roles.join(", ")}
              </p>
              <p className="m-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
                {t("varshik.impact.months", {
                  defaultValue: "Best month: {{best}}. Harder month: {{hard}}.",
                  best: monthShort(r.bestMonth, i18n.language),
                  hard: monthShort(r.hardMonth, i18n.language),
                })}
              </p>
              <p className="m-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
                {t("varshik.impact.topArea", {
                  defaultValue: "Strongest on: {{area}}",
                  area: t(`varshik.area.${r.topArea.area}`, { defaultValue: cap(r.topArea.area) }),
                })}
              </p>
              {r.strength !== null ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t("varshik.impact.strength", { defaultValue: "Strength" })}
                  </span>
                  <div className="h-1.5 w-full rounded-full" style={{ background: "var(--border-faint)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, (r.strength / 20) * 100))}%`, background: "linear-gradient(90deg, var(--vk-gold-lo), var(--gold) 70%, var(--vk-gold-hi))" }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
