"use client";

import { useTranslation } from "react-i18next";
import ArtSlot from "./ArtSlot";
import AreaBars from "./AreaBars";
import Narrative from "./Narrative";
import ScoreRing from "./ScoreRing";
import { art, monthArt } from "./assets";
import { keyDatesOf, muddaInMonth, shortDate, varshaInForce } from "./facts-helpers";
import { skyLabel } from "./sky-text";
import { signName } from "./sign-name";
import { TIER_GLYPH, TIER_WORD } from "./tiers";
import { AREAS, type Cell } from "./types";
import type { PageCtx } from "./page-types";

/** Page A of a month, "The month at a glance": banner, score, seven mini bars, the Varsha in force, the Mudda lord, key dates. */
export function MonthABody({ ctx, month }: { ctx: PageCtx; month: number }) {
  const { t } = useTranslation();
  const { facts, lang } = ctx;
  const cell = facts.scores.months[month]!;
  const areas: Record<string, Cell> = {};
  for (const a of AREAS) {
    const c = facts.scores.timingMap[a]?.[month];
    if (c) areas[a] = c;
  }
  const varsha = varshaInForce(facts, month);
  const mudda = muddaInMonth(facts, month);
  const dates = keyDatesOf(facts, month);
  const code = monthArt(month);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ArtSlot kind="banner" code={code} src={art(code)} />
      <div className="flex items-center gap-4">
        <ScoreRing score={cell.score} tier={cell.tier} size="7.5rem" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="vk-h3 break-words">{t("varshik.month.score", { defaultValue: "Score for the month" })}</span>
          <span className="vk-caption">
            {TIER_GLYPH[cell.tier]} {t(TIER_WORD[cell.tier].key, { defaultValue: TIER_WORD[cell.tier].en })}
          </span>
          {varsha ? (
            <span className="vk-caption break-words">
              {t("varshik.month.varsha", {
                defaultValue: "Varsha chart of {{year}}, Lagna {{lagna}}",
                year: varsha.targetYear,
                lagna: signName(t, varsha.lagna),
              })}
            </span>
          ) : null}
        </div>
      </div>
      <AreaBars areas={areas} />
      {mudda.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="vk-h3 m-0">{t("varshik.month.mudda", { defaultValue: "Mudda lord" })}</h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {mudda.map((p, i) => (
              <li key={i} className="vk-body break-words">
                {t(`varshik.planet.${p.lord.toLowerCase()}`, { defaultValue: p.lord })} · {shortDate(p.from, lang)} {t("varshik.wave.to", { defaultValue: "to" })} {shortDate(p.to, lang)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {dates.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="vk-h3 m-0">{t("varshik.month.keyDates", { defaultValue: "Key dates" })}</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {dates.map((d, i) => (
              <li key={i} className="flex min-w-0 gap-3 break-words">
                <span className="vk-caption w-14 shrink-0 tabular-nums">{shortDate(d.date, lang)}</span>
                <span className="vk-body min-w-0 flex-1" style={d.major || d.sky?.kind.startsWith("eclipse") ? { color: "var(--gold)" } : undefined}>
                  {d.kind === "sky" && d.sky
                    ? skyLabel(t, d.sky)
                    : d.kind === "saham"
                      ? t("varshik.month.sahamPeak", { defaultValue: "Saham peak: {{name}}", name: d.label })
                      : `✦ ${d.label}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Page B of a month, "Living the month": what to do, what to hold, career and money, love and health, one remedy. */
export function MonthBBody({ ctx, month }: { ctx: PageCtx; month: number }) {
  const { t } = useTranslation();
  const id = `month_${String(month + 1).padStart(2, "0")}`;
  const labels = [
    t("varshik.month.label.do", { defaultValue: "What to do" }),
    t("varshik.month.label.hold", { defaultValue: "What to hold" }),
    t("varshik.month.label.work", { defaultValue: "Career and money" }),
    t("varshik.month.label.heart", { defaultValue: "Love and health" }),
    t("varshik.month.label.remedy", { defaultValue: "This month's remedy" }),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId[id]} labels={labels} />
      <ArtSlot kind="divider" code="A47" src={art("A47")} maxWidth="100%" />
    </div>
  );
}
