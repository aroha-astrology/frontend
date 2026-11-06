"use client";

import { useTranslation } from "react-i18next";
import NorthIndianChart from "@/components/ui/NorthIndianChart";
import ArtSlot from "./ArtSlot";
import AreaBars from "./AreaBars";
import AreaMonthLine from "./AreaMonthLine";
import BigMovesGantt from "./BigMovesGantt";
import DecisionTable from "./DecisionTable";
import DoshaTable from "./DoshaTable";
import MomentumWave from "./MomentumWave";
import Narrative from "./Narrative";
import PanchadhikariTable from "./PanchadhikariTable";
import PlanetImpactTable from "./PlanetImpactTable";
import ScoreRing from "./ScoreRing";
import SkyCalendar from "./SkyCalendar";
import TimingMap from "./TimingMap";
import VarshaTimeline from "./VarshaTimeline";
import YogaList from "./YogaList";
import { AREA_ART, PLANET_ART, art } from "./assets";
import { areaExtremes, birthChartData, monthLong, shortDate } from "./facts-helpers";
import { signName } from "./sign-name";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, useChartMode } from "./tiers";
import type { Tier } from "./types";
import type { PageCtx } from "./page-types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function useTierWord() {
  const { t } = useTranslation();
  return (tier: Tier) => t(TIER_WORD[tier].key, { defaultValue: TIER_WORD[tier].en });
}

/** A month as a small chip: name, score, tier glyph and word. */
function MonthChip({ month, score, tier, lang, onClick }: { month: number; score: number; tier: Tier; lang: string; onClick?: () => void }) {
  const mode = useChartMode();
  const tierWord = useTierWord();
  const color = TIER_COLOR[mode][tier];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className="vk-panel flex min-w-0 flex-col items-center gap-0.5 p-2.5 text-center"
      style={{ borderColor: color }}
    >
      <span className="vk-h3 break-words">{monthLong(month, lang)}</span>
      <span className="tabular-nums" style={{ color, fontFamily: "var(--font-serif-alt), Georgia, serif", fontSize: "1.5rem" }}>
        {Math.round(score)}
      </span>
      <span className="vk-caption" style={{ color }}>
        <span aria-hidden="true">{TIER_GLYPH[tier]} </span>
        {tierWord(tier)}
      </span>
    </Tag>
  );
}

/** Page 5. 2027 at a glance. */
export function GlanceBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const { facts } = ctx;
  const v = facts.varsha[facts.varsha.length - 1]!;
  const planetWord = (p: string) => t(`varshik.planet.${p.toLowerCase()}`, { defaultValue: p });
  const lord = PLANET_ART[v.yearLord];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ScoreRing score={facts.scores.overall.score} tier={facts.scores.overall.tier} caption={t("varshik.glance.caption", { defaultValue: "Your 2027" })} />
      <div className="grid grid-cols-2 gap-3">
        <div className="vk-panel flex min-w-0 items-center gap-3 p-3">
          {lord ? <ArtSlot kind="medallion" code={lord} src={art(lord)} maxWidth="3.25rem" /> : null}
          <span className="flex min-w-0 flex-col">
            <span className="vk-caption">{t("varshik.glance.yearLord", { defaultValue: "Year Lord" })}</span>
            <span className="vk-h3 break-words">{planetWord(v.yearLord)}</span>
          </span>
        </div>
        <div className="vk-panel flex min-w-0 flex-col justify-center p-3">
          <span className="vk-caption">{t("varshik.glance.muntha", { defaultValue: "Muntha house" })}</span>
          <span className="vk-h3 break-words">{v.muntha.house}</span>
        </div>
      </div>
      <Narrative section={ctx.byId.year_at_a_glance} />
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="vk-h3 m-0">{t("varshik.glance.peaks", { defaultValue: "Your three peak months" })}</h3>
        <div className="grid grid-cols-3 gap-2">
          {facts.scores.peakMonths.map((m) => (
            <MonthChip key={m} month={m} score={facts.scores.months[m]!.score} tier={facts.scores.months[m]!.tier} lang={ctx.lang} onClick={() => ctx.go(`month_${m}_a`)} />
          ))}
        </div>
        <h3 className="vk-h3 m-0 pt-2">{t("varshik.glance.rest", { defaultValue: "Your month to rest" })}</h3>
        <div className="grid grid-cols-3 gap-2">
          <MonthChip
            month={facts.scores.restMonth}
            score={facts.scores.months[facts.scores.restMonth]!.score}
            tier={facts.scores.months[facts.scores.restMonth]!.tier}
            lang={ctx.lang}
            onClick={() => ctx.go(`month_${facts.scores.restMonth}_a`)}
          />
        </div>
      </div>
    </div>
  );
}

/** Page 6. The birth chart: North-Indian diagram, then the planets in a plain list. */
export function BirthChartBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const { facts } = ctx;
  const chart = birthChartData(facts);
  const planetWord = (p: string) => t(`varshik.planet.${p.toLowerCase()}`, { defaultValue: p });
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2">
        {[
          [t("varshik.birth.date", { defaultValue: "Born" }), facts.reader.birthDate],
          [t("varshik.birth.time", { defaultValue: "Time" }), facts.reader.birthTime],
          [t("varshik.birth.lagna", { defaultValue: "Lagna" }), `${signName(t, facts.birth.lagna.sign)} ${facts.birth.lagna.degree.toFixed(1)}°`],
          [t("varshik.birth.nakshatra", { defaultValue: "Nakshatra" }), `${facts.birth.lagna.nakshatra} (${facts.birth.lagna.pada})`],
        ].map(([k, val]) => (
          <div key={String(k)} className="flex min-w-0 flex-col">
            <dt className="vk-caption">{k}</dt>
            <dd className="vk-body m-0 break-words">{val}</dd>
          </div>
        ))}
      </dl>
      <NorthIndianChart chartData={chart as never} instant />
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {facts.birth.planets.map((p) => (
          <li key={p.planet} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 border-b border-[color:var(--border-faint)] pb-1.5">
            <span className="vk-body min-w-0 break-words">
              {planetWord(p.planet)}
              {p.retrograde ? " ℞" : ""}
            </span>
            <span className="vk-caption min-w-0 break-words text-right">
              {signName(t, p.sign)} {p.degree.toFixed(1)}° · {p.nakshatra} {p.pada} · {t("varshik.birth.house", { defaultValue: "house {{n}}", n: p.house })}
            </span>
          </li>
        ))}
      </ul>
      <p className="vk-caption m-0 break-words">
        {t("varshik.birth.dasha", {
          defaultValue: "Dasha at birth: {{planet}}, {{years}} years left",
          planet: planetWord(facts.dashas.balance.planet),
          years: facts.dashas.balance.yearsLeft.toFixed(1),
        })}
      </p>
    </div>
  );
}

/** Page 7. The two Varsha charts. */
export function TwoVarshaBody({ ctx }: { ctx: PageCtx }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <VarshaTimeline years={ctx.facts.varsha} timezone={ctx.facts.reader.timezone} />
      <Narrative section={ctx.byId.two_varsha_years} />
    </div>
  );
}

/** Page 8. Year Lord and Muntha. */
export function YearLordBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const v = ctx.facts.varsha[ctx.facts.varsha.length - 1]!;
  const code = PLANET_ART[v.yearLord];
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center gap-4">
        {code ? <ArtSlot kind="medallion" code={code} src={art(code)} maxWidth="6rem" /> : null}
        <div className="flex min-w-0 flex-col">
          <span className="vk-eyebrow">{t("varshik.glance.yearLord", { defaultValue: "Year Lord" })}</span>
          <span className="vk-title break-words">{t(`varshik.planet.${v.yearLord.toLowerCase()}`, { defaultValue: v.yearLord })}</span>
          <span className="vk-caption">
            {t("varshik.yearLord.muntha", { defaultValue: "Muntha in {{sign}}, house {{house}}", sign: signName(t, v.muntha.sign), house: v.muntha.house })}
          </span>
        </div>
      </div>
      <PanchadhikariTable year={v} />
      <Narrative section={ctx.byId.year_lord_muntha} />
    </div>
  );
}

/** Page 9. Big sky moves. */
export function BigMovesBody({ ctx }: { ctx: PageCtx }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.big_sky_moves} />
      <BigMovesGantt transits={ctx.facts.ashtakavarga.transits} />
    </div>
  );
}

/** Page 10. Planet by planet. */
export function PlanetsBody({ ctx }: { ctx: PageCtx }) {
  const icons: Record<string, string> = {};
  for (const [planet, code] of Object.entries(PLANET_ART)) {
    const src = art(code);
    if (src) icons[planet] = src;
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.planet_by_planet} />
      <PlanetImpactTable rows={ctx.facts.scores.planetImpact} icons={icons} />
    </div>
  );
}

export function DoshasBody({ ctx }: { ctx: PageCtx }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.doshas} />
      <DoshaTable doshas={ctx.facts.doshas} />
    </div>
  );
}

export function YogasBody({ ctx }: { ctx: PageCtx }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.yogas} />
      <YogaList yogas={ctx.facts.yogas} />
    </div>
  );
}

/** Page 14. The seven areas, each out of 100. */
export function AreaOverviewBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <p className="vk-body m-0 break-words">
        {t("varshik.areas.intro", { defaultValue: "Seven parts of life, each scored out of 100 for the whole of 2027. The next seven pages take them one at a time." })}
      </p>
      <AreaBars areas={ctx.facts.scores.areaOverall} />
    </div>
  );
}

/** Pages 15-21. One area: banner, score, its twelve months, then the words. */
export function AreaBody({ ctx, area }: { ctx: PageCtx; area: string }) {
  const { t } = useTranslation();
  const tierWord = useTierWord();
  const cells = ctx.facts.scores.timingMap[area]!;
  const overall = ctx.facts.scores.areaOverall[area]!;
  const { best, hold } = areaExtremes(cells);
  const label = t(`varshik.area.${area}`, { defaultValue: cap(area) });
  const code = AREA_ART[area]!;
  const names = (ms: number[]) => ms.map((m) => monthLong(m, ctx.lang)).join(", ");
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ArtSlot kind="banner" code={code} src={art(code)} />
      <div className="flex items-center gap-4">
        <ScoreRing score={overall.score} tier={overall.tier} size="6.5rem" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="vk-h3 break-words">{label}</span>
          <span className="vk-caption">
            {TIER_GLYPH[overall.tier]} {tierWord(overall.tier)}
          </span>
        </div>
      </div>
      <AreaMonthLine cells={cells} areaLabel={label} bestMonths={best} holdMonths={hold} />
      <Narrative section={ctx.byId[`area_${area}`]} />
      <p className="vk-body m-0 break-words">
        <span style={{ color: "var(--gold)" }}>{t("varshik.areas.best", { defaultValue: "Best months" })}: </span>
        {names(best)}.{" "}
        <span style={{ color: "var(--gold)" }}>{t("varshik.areas.rest", { defaultValue: "Quietest month" })}: </span>
        {names(hold)}.
      </p>
    </div>
  );
}

/** Page 23. The master Timing Map; tapping a cell opens that month. */
export function TimingMapBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.timing_map} />
      <TimingMap map={ctx.facts.scores.timingMap} peakMonths={ctx.facts.scores.peakMonths} restMonth={ctx.facts.scores.restMonth} onMonth={(m) => ctx.go(`month_${m}_a`)} />
      <p className="vk-caption m-0">{t("varshik.timing.tap", { defaultValue: "Tap any tile to open that month." })}</p>
    </div>
  );
}

/** Page 24. The year's rhythm. */
export function RhythmBody({ ctx }: { ctx: PageCtx }) {
  const { facts } = ctx;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.year_rhythm} />
      <MomentumWave daily={facts.scores.dailyOverall} mudda={facts.varsha.flatMap((v) => v.mudda)} sahams={facts.sahamWindows} />
    </div>
  );
}

export function SkyBody({ ctx }: { ctx: PageCtx }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.sky_calendar} />
      <SkyCalendar events={ctx.facts.skyEvents} />
    </div>
  );
}

/** Page 26. When to act, with filter pills. */
export function WhenToActBody({ ctx }: { ctx: PageCtx }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.when_to_act} />
      <DecisionTable rows={ctx.facts.scores.decisionTable} filterable />
    </div>
  );
}

/** Page 27. Golden windows and key dates: the words, then one dated window per decision. */
export function GoldenBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const mode = useChartMode();
  const tierWord = useTierWord();
  const rows = Object.entries(ctx.facts.scores.answerWindows);
  const spaced = (key: string) => cap(key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " "));
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Narrative section={ctx.byId.golden_windows} />
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {rows.map(([key, w]) => {
          const color = TIER_COLOR[mode][w.best.tier];
          return (
            <li key={key} className="vk-panel flex min-w-0 flex-col gap-1 p-3" style={{ borderLeft: `3px solid ${color}` }}>
              <span className="vk-h3 break-words">{t(`varshik.decision.${key}`, { defaultValue: spaced(key) })}</span>
              <span className="vk-body break-words" style={{ color }}>
                <span aria-hidden="true">{TIER_GLYPH[w.best.tier]} </span>
                {shortDate(w.best.fromDate, ctx.lang)} – {shortDate(w.best.toDate, ctx.lang)} · {tierWord(w.best.tier)}
              </span>
              <span className="vk-caption break-words">
                {t("varshik.golden.peak", { defaultValue: "Peak on {{date}}", date: shortDate(w.best.peakDate, ctx.lang) })}
                {w.then
                  ? ` · ${t("varshik.golden.then", { defaultValue: "then {{from}} – {{to}}", from: shortDate(w.then.fromDate, ctx.lang), to: shortDate(w.then.toDate, ctx.lang) })}`
                  : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
