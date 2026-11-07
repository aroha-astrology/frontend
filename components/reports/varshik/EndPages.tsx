"use client";

import { useTranslation } from "react-i18next";
import ArtSlot from "./ArtSlot";
import Narrative from "./Narrative";
import ScoreRing from "./ScoreRing";
import { art } from "./assets";
import { monthLong, shortDate } from "./facts-helpers";
import { monthShort } from "./format";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, useChartMode } from "./tiers";
import type { Tier } from "./types";
import type { PageCtx } from "./page-types";
import type { ReportSection } from "@/lib/reports-api";

const HAND = "var(--font-hand), var(--vk-serif)";
const REMEDY_ICONS = ["A40", "A41", "A42", "A43", "A44", "A45"];

/** Page 53. Simple remedies, at most three. */
export function RemediesBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const present = ctx.facts.doshas.filter((d) => d.status === "present").slice(0, 3);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.simple_remedies} />
      {present.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {present.map((d, i) => (
            <li key={d.key} className="vk-panel flex min-w-0 items-center gap-3 p-3">
              <ArtSlot kind="medallion" code={REMEDY_ICONS[i]!} src={art(REMEDY_ICONS[i]!)} maxWidth="3.5rem" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="vk-h3 break-words">{t(`varshik.dosha.${d.key}`, { defaultValue: d.label })}</span>
                <span className="vk-body break-words">{d.remedy}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Page 54. The year on one card, and twelve small month cards. Carries no birth time, place or personal facts: it gets shared. */
export function YearCardBody({ ctx }: { ctx: PageCtx }) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  const { facts } = ctx;
  const v = facts.varsha[facts.varsha.length - 1]!;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="vk-panel flex min-w-0 flex-col items-center gap-3 p-5 text-center">
        <span className="vk-eyebrow">{t("varshik.card.eyebrow", { defaultValue: "Varshik Rashifal 2027" })}</span>
        <ScoreRing score={facts.scores.overall.score} tier={facts.scores.overall.tier} size="9rem" />
        <span className="vk-body break-words">
          {t("varshik.card.yearLord", { defaultValue: "Year Lord: {{planet}}", planet: t(`varshik.planet.${v.yearLord.toLowerCase()}`, { defaultValue: v.yearLord }) })}
        </span>
        <span className="vk-caption break-words">
          {t("varshik.card.peaks", { defaultValue: "Peak months: {{months}}", months: facts.scores.peakMonths.map((m) => monthLong(m, ctx.lang)).join(", ") })}
        </span>
      </div>
      <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
        {facts.scores.months.map((c, m) => (
          <li
            key={m}
            className="vk-panel flex min-w-0 flex-col items-center gap-0.5 p-2 text-center"
            style={{ borderColor: TIER_COLOR[mode][c.tier] }}
          >
            <span className="vk-caption">{monthShort(m, i18n.language)}</span>
            <span className="tabular-nums" style={{ color: TIER_COLOR[mode][c.tier], fontFamily: "var(--vk-serif)", fontSize: "1.25rem" }}>
              {Math.round(c.score)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pages of Chapter VI: one question the reader is facing, with its dated window. */
export function QuestionBody({ section }: { section: ReportSection }) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  const ui = (section.uiData ?? {}) as {
    windowFrom?: string;
    windowTo?: string;
    peak?: string;
    tier?: Tier;
    weak?: boolean;
    next?: { from: string; to: string } | null;
  };
  const tier = ui.tier ?? "amber";
  const color = TIER_COLOR[mode][tier];
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ArtSlot kind="banner" code="A52" src={art("A52")} />
      {ui.windowFrom && ui.windowTo ? (
        <div className="vk-panel flex min-w-0 flex-col gap-1 p-3" style={{ borderLeft: `3px solid ${color}` }}>
          <span className="vk-caption">{t("varshik.question.eases", { defaultValue: "When it eases" })}</span>
          <span className="vk-h3 break-words" style={{ color }}>
            <span aria-hidden="true">{TIER_GLYPH[tier]} </span>
            {shortDate(ui.windowFrom, i18n.language)} – {shortDate(ui.windowTo, i18n.language)} · {t(TIER_WORD[tier].key, { defaultValue: TIER_WORD[tier].en })}
          </span>
          {ui.next ? (
            <span className="vk-caption break-words">
              {t("varshik.golden.then", { defaultValue: "then {{from}} – {{to}}", from: shortDate(ui.next.from, i18n.language), to: shortDate(ui.next.to, i18n.language) })}
            </span>
          ) : null}
        </div>
      ) : null}
      <Narrative section={section} />
    </div>
  );
}

/** "What you've been through, and what changes": the recent hard stretch, then the dated turning points. */
export function ReliefBody({ ctx }: { ctx: PageCtx }) {
  const { t, i18n } = useTranslation();
  const mode = useChartMode();
  const relief = ctx.facts.scores.relief;
  const item = (e: { date: string; kind: string; detail: string; effect: "relief" | "hard" }, i: number) => {
    const color = e.effect === "relief" ? TIER_COLOR[mode].dark_green : TIER_COLOR[mode].amber;
    return (
      <li key={`${e.date}-${i}`} className="flex min-w-0 gap-3">
        <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="flex min-w-0 flex-col">
          <span className="vk-caption tabular-nums">{shortDate(e.date, i18n.language)} {e.date.slice(0, 4)}</span>
          <span className="vk-body break-words">{e.detail}</span>
        </span>
      </li>
    );
  };
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ArtSlot kind="banner" code="A53" src={art("A53")} />
      <Narrative section={ctx.byId.what_changes} />
      <div className="flex min-w-0 flex-col gap-3">
        {relief.lookback.length > 0 ? (
          <>
            <h3 className="vk-h3 m-0">{t("varshik.relief.past", { defaultValue: "The stretch behind you" })}</h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">{relief.lookback.map(item)}</ul>
          </>
        ) : null}
        {relief.ahead.length > 0 || relief.nextRelief ? (
          <>
            <h3 className="vk-h3 m-0 pt-2">{t("varshik.relief.ahead", { defaultValue: "The turning points ahead" })}</h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {relief.ahead.map(item)}
              {relief.ahead.length === 0 && relief.nextRelief ? item(relief.nextRelief, 0) : null}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** The last page: Baba Ji's closing letter, signed with the seal. */
export function ClosingBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ArtSlot kind="banner" code="A6" src={art("A6")} />
      <Narrative section={ctx.byId.closing_letter} dropCap />
      <div className="flex items-center justify-between gap-3 pt-2">
        <span style={{ fontFamily: HAND, fontSize: "1.8rem", color: "var(--gold)" }}>{t("varshik.welcome.babaJi", { defaultValue: "Baba Ji" })}</span>
        <ArtSlot kind="medallion" code="A49" src={art("A49")} maxWidth="5rem" />
      </div>
    </div>
  );
}
