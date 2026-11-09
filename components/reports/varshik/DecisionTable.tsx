"use client";

import { useEffect, useState } from "react";
import { Hand } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Closure, ClosureReason, DecisionRow, Tier } from "./types";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, useChartMode } from "./tiers";
import { monthShort } from "./format";
import { shortDate } from "./facts-helpers";
import { useReportYear } from "./year-context";

/** C5: a month needs at least this many days outside every closure to hold a wedding or move-in window (same as the engine). */
const MIN_OPEN_DAYS = 7;

export const CLOSURE_EN: Record<ClosureReason, string> = {
  shukra_asta: "Venus combust (Shukra Asta): {{from}} to {{to}}",
  guru_asta: "Jupiter combust (Guru Asta): {{from}} to {{to}}",
  kharmas: "Kharmas, the Sun in Sagittarius or Pisces: {{from}} to {{to}}",
  chaturmas: "Chaturmas: {{from}} to {{to}}",
};

/** Per month (0-11): true when fewer than MIN_OPEN_DAYS of its days are outside every closure. */
function closedMonths(closures: Closure[], year: number): boolean[] {
  return Array.from({ length: 12 }, (_, m) => {
    const last = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    let open = 0;
    for (let d = 1; d <= last; d++) {
      const iso = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (!closures.some((c) => iso >= c.from && iso <= c.to)) open++;
    }
    return open < MIN_OPEN_DAYS;
  });
}

/** Soft custom lines (owner, 2026-11-09): a family custom, never a rule. */
const NOTE_EN: Record<"move_custom" | "sagai_custom", string> = {
  move_custom: "Many families also avoid Kharmas and Chaturmas for moving in. Check your family's custom.",
  sagai_custom: "Families often choose a sagai date by the same rules as the wedding.",
};

const FTUE_KEY = "aroha.varshik.decisionFtue";

const STRIPES = "repeating-linear-gradient(135deg, rgba(0,0,0,0.38) 0 3px, transparent 3px 7px)";

const TIERS: Tier[] = ["dark_green", "light_green", "amber", "rust"];

const spaced = (key: string) => {
  const s = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** When to act, by persona: a 12-month tier strip per decision, its best window and the months to hold. */
export default function DecisionTable({ rows, filterable = false }: { rows: DecisionRow[]; filterable?: boolean }) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  const year = useReportYear();
  // "all" or one row's key. The reader's main decision starts selected when filtering is on.
  const [pick, setPick] = useState<string>(() => (filterable ? (rows.find((r) => r.isMain)?.key ?? "all") : "all"));
  // First-time guide: shown once per device, gone for good after "Got it" or the first tap on a pill.
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    try {
      setSeen(localStorage.getItem(FTUE_KEY) === "1");
    } catch {
      setSeen(false);
    }
  }, []);
  const dismissFtue = () => {
    setSeen(true);
    try {
      localStorage.setItem(FTUE_KEY, "1");
    } catch {}
  };
  const showFtue = filterable && !seen;
  if (rows.length === 0) return null;
  const shown = pick === "all" ? rows : rows.filter((r) => r.key === pick);
  const title = (key: string) => t(`varshik.decision.${key}`, { defaultValue: spaced(key) });
  const lang = i18n.language;
  const anyClosed = rows.some((r) => r.closed);
  const tierWord = (tier: Tier) => t(TIER_WORD[tier].key, { defaultValue: TIER_WORD[tier].en });
  const inBest = (r: DecisionRow, m: number) =>
    r.best.from <= r.best.to ? m >= r.best.from && m <= r.best.to : m >= r.best.from || m <= r.best.to;

  return (
    <div className="flex flex-col gap-3 leading-[1.45]">
      {showFtue ? (
        <div
          role="note"
          data-testid="decision-ftue"
          className="vk-panel flex items-start gap-3 p-3 text-xs"
          style={{ borderColor: "var(--gold)" }}
        >
          <Hand size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: "var(--gold)" }} />
          <div className="flex min-w-0 flex-col gap-2">
            <span className="break-words leading-[1.45]" style={{ color: "var(--foreground)" }}>
              {t("varshik.decision.ftue", {
                defaultValue: "Pick what you are planning. Tap a decision such as Marriage or Money move to see only that one, or tap All to see every decision.",
              })}
            </span>
            <button type="button" onClick={dismissFtue} className="self-start rounded-full border px-3 py-1" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
              {t("varshik.decision.ftueOk", { defaultValue: "Got it" })}
            </button>
          </div>
        </div>
      ) : null}
      {filterable ? (
        <div role="group" aria-label={t("varshik.decision.filter", { defaultValue: "Show one decision" })} className="flex flex-wrap gap-2">
          {[{ key: "all", label: t("varshik.decision.all", { defaultValue: "All" }) }, ...rows.map((r) => ({ key: r.key, label: title(r.key) }))].map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={pick === o.key}
              onClick={() => {
                setPick(o.key);
                dismissFtue();
              }}
              className={`rounded-full border px-3 py-1 text-xs leading-[1.45]${showFtue ? " animate-pulse" : ""}`}
              style={{
                borderColor: pick === o.key ? "var(--gold)" : "var(--border-faint)",
                color: pick === o.key ? "var(--gold)" : "var(--text-muted)",
                background: pick === o.key ? "color-mix(in srgb, var(--gold) 12%, transparent)" : "transparent",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-12 gap-[2px]" aria-hidden="true">
        {[0, 3, 6, 9].map((m) => (
          <span key={m} className="col-span-3 whitespace-nowrap text-[11px]" style={{ color: "var(--text-muted)" }}>
            {monthShort(m, lang)}
          </span>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {shown.map((r) => {
          const closures = r.closed ? (r.closures ?? []) : [];
          const shut = closedMonths(closures, year);
          const span = (c: { from: string; to: string }) => ({ from: shortDate(c.from, lang), to: shortDate(c.to, lang) });
          const bySource = (src: "panchang" | "report") => closures.filter((_, i) => (r.ruleSource?.[i] ?? "panchang") === src);
          return (
          <li
            key={r.key}
            className="flex flex-col gap-2 vk-panel p-3"
            style={{ borderLeft: r.isMain ? "3px solid var(--gold)" : undefined }}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <span className="vk-h3 min-w-0 break-words">
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
                    background: `${shut[m] ? `${STRIPES}, ` : ""}linear-gradient(160deg, color-mix(in srgb, ${TIER_COLOR[mode][c.tier]} 80%, #fff 20%), ${TIER_COLOR[mode][c.tier]} 60%, color-mix(in srgb, ${TIER_COLOR[mode][c.tier]} 78%, #000 22%))`,
                    opacity: shut[m] ? 0.55 : 1,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 5px -2px ${TIER_COLOR[mode][c.tier]}`,
                    color: "#ffffff",
                    outline: inBest(r, m) ? "2px solid var(--foreground)" : undefined,
                    outlineOffset: -2,
                  }}
                  title={`${monthShort(m, lang)}: ${Math.round(c.score)}${shut[m] ? ` · ${t("varshik.decision.closedMonth", { defaultValue: "no muhurat this month" })}` : ""}`}
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
            {r.closed && (r.openSpans?.length ?? 0) > 0 ? (
              <p className="m-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
                {t("varshik.decision.openDays", {
                  defaultValue: "Open days in this window: {{spans}}",
                  spans: r.openSpans!.map((sp) => (sp.from === sp.to ? shortDate(sp.from, lang) : `${shortDate(sp.from, lang)} ${t("varshik.wave.to", { defaultValue: "to" })} ${shortDate(sp.to, lang)}`)).join(", "),
                })}
              </p>
            ) : null}
            {(["panchang", "report"] as const).map((src) =>
              bySource(src).length > 0 ? (
                <div key={src} className="flex flex-col gap-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--foreground)" }}>
                    {src === "panchang"
                      ? t(`varshik.decision.noMuhurat.${r.key}`, { defaultValue: r.key === "move_home" ? "Traditionally no griha pravesh muhurat:" : "Traditionally no wedding muhurat:" })
                      : t("varshik.decision.keptClear", { defaultValue: "This report keeps these dates clear:" })}
                  </span>
                  <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                    {bySource(src).map((c, i) => (
                      <li key={i} className="break-words">
                        {t(`varshik.closure.${c.reason}`, { defaultValue: CLOSURE_EN[c.reason], ...span(c) })}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
            {r.note ? (
              <p className="m-0 break-words text-xs italic" style={{ color: "var(--text-muted)" }}>
                {t(`varshik.decision.note.${r.note}`, { defaultValue: NOTE_EN[r.note] })}
              </p>
            ) : null}
          </li>
          );
        })}
      </ul>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs" style={{ color: "var(--foreground)" }}>
        {TIERS.map((tier) => (
          <li key={tier} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: TIER_COLOR[mode][tier] }} />
            <span aria-hidden="true">{TIER_GLYPH[tier]}</span>
            {tierWord(tier)}
          </li>
        ))}
        {anyClosed ? (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: `${STRIPES}, var(--text-muted)` }} />
            {t("varshik.decision.closedKey", { defaultValue: "Striped: no muhurat for that event" })}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
