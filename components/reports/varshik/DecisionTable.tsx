"use client";

import { useTranslation } from "react-i18next";
import type { DecisionRow, Tier } from "./types";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, useChartMode } from "./tiers";
import { monthShort } from "./format";

const TIERS: Tier[] = ["dark_green", "light_green", "amber", "rust"];

const spaced = (key: string) => {
  const s = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** When to act, by persona: a 12-month tier strip per decision, its best window and the months to hold. */
export default function DecisionTable({ rows }: { rows: DecisionRow[] }) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  if (rows.length === 0) return null;
  const lang = i18n.language;
  const tierWord = (tier: Tier) => t(TIER_WORD[tier].key, { defaultValue: TIER_WORD[tier].en });
  const inBest = (r: DecisionRow, m: number) =>
    r.best.from <= r.best.to ? m >= r.best.from && m <= r.best.to : m >= r.best.from || m <= r.best.to;

  return (
    <div className="flex flex-col gap-3 leading-[1.45]">
      <div className="grid grid-cols-12 gap-[2px]" aria-hidden="true">
        {[0, 3, 6, 9].map((m) => (
          <span key={m} className="col-span-3 whitespace-nowrap text-[11px]" style={{ color: "var(--text-muted)" }}>
            {monthShort(m, lang)}
          </span>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((r) => (
          <li
            key={r.key}
            className="flex flex-col gap-2 rounded-xl border border-[color:var(--border-faint)] p-3"
            style={{ background: "var(--card)", borderLeft: r.isMain ? "3px solid var(--gold)" : undefined }}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 break-words text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {t(`varshik.decision.${r.key}`, { defaultValue: spaced(r.key) })}
              </span>
              {r.isMain ? (
                <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
                  {t("varshik.decision.main", { defaultValue: "Your main decision" })}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-12 gap-[2px]">
              {r.months.map((c, m) => (
                <div
                  key={m}
                  className="flex h-5 items-center justify-center rounded-[2px] text-[10px]"
                  style={{
                    background: TIER_COLOR[mode][c.tier],
                    color: "#ffffff",
                    outline: inBest(r, m) ? "2px solid var(--foreground)" : undefined,
                    outlineOffset: -2,
                  }}
                  title={`${monthShort(m, lang)}: ${Math.round(c.score)}`}
                >
                  {r.hold.includes(m) ? <span aria-hidden="true">○</span> : null}
                </div>
              ))}
            </div>
            <p className="m-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
              {t("varshik.decision.best", {
                defaultValue: "Best window: {{from}} to {{to}} ({{score}}) {{tier}}",
                from: monthShort(r.best.from, lang),
                to: monthShort(r.best.to, lang),
                score: Math.round(r.best.score),
                tier: `${TIER_GLYPH[r.best.tier]} ${tierWord(r.best.tier)}`,
              })}
            </p>
            <p className="m-0 break-words text-xs" style={{ color: "var(--text-muted)" }}>
              {r.hold.length > 0
                ? t("varshik.decision.hold", {
                    defaultValue: "Hold: {{months}}",
                    months: r.hold.map((m) => monthShort(m, lang)).join(", "),
                  })
                : t("varshik.decision.noHold", { defaultValue: "Nothing to hold" })}
            </p>
          </li>
        ))}
      </ul>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs" style={{ color: "var(--foreground)" }}>
        {TIERS.map((tier) => (
          <li key={tier} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: TIER_COLOR[mode][tier] }} />
            <span aria-hidden="true">{TIER_GLYPH[tier]}</span>
            {tierWord(tier)}
          </li>
        ))}
      </ul>
    </div>
  );
}
