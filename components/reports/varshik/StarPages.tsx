"use client";

import { useTranslation } from "react-i18next";
import { useY } from "./year-context";
import { usePdfCapturing } from "@/components/pdf/PdfCapturingContext";
import Narrative from "./Narrative";
import { shortDate, starLabel, wheelSlots } from "./facts-helpers";
import { signName } from "./sign-name";
import { TIER_COLOR, useChartMode } from "./tiers";
import type { PageCtx } from "./page-types";
import type { StarFacts, TriPatakiFlag, VarshaExtraFacts, VarshaYear } from "./types";

type Tr = (key: string, options?: Record<string, unknown>) => string;
const planetWordOf = (t: Tr, p: string) => t(`varshik.planet.${p.toLowerCase()}`, { defaultValue: p });

function Missing() {
  const { t } = useTranslation();
  return <p className="vk-body m-0">{t("varshik.stars.missing", { defaultValue: "The star pages are not part of this older report." })}</p>;
}

/** "Your birth stars" (Chapter I, after the birth chart): the ten rows, then the stars of the lords that run in 2027. */
export function BirthStarsBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const y = useY();
  const stars = ctx.facts.stars;
  if (!stars) return <Missing />;
  const word = (p: string) => planetWordOf(t, p);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="vk-panel flex flex-col gap-1 p-3" style={{ borderLeft: "3px solid var(--gold)" }}>
        <span className="vk-eyebrow">{t("varshik.stars.birthStar", { defaultValue: "Your birth star" })}</span>
        <span className="vk-title break-words">{starLabel(stars.birthStar.name)}</span>
        <span className="vk-caption break-words">
          {t("varshik.stars.birthStarLine", {
            defaultValue: "Pada {{pada}}, star lord {{lord}}, in {{sign}}",
            pada: stars.birthStar.pada,
            lord: word(stars.birthStar.lord),
            sign: signName(t as never, stars.birthStar.sign),
          })}
        </span>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {stars.table.map((r) => (
          <li key={r.point} className="vk-panel flex min-w-0 flex-col gap-1 p-3">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="vk-h3 min-w-0 break-words">
                {r.point === "Lagna" ? t("varshik.birth.lagna", { defaultValue: "Lagna" }) : word(r.point)}
              </span>
              <span className="vk-body min-w-0 break-words text-right">
                {starLabel(r.nakshatra)} · {t("varshik.stars.pada", { defaultValue: "pada {{n}}", n: r.pada })}
              </span>
            </div>
            <span className="vk-caption break-words">
              {t("varshik.stars.rowLine", {
                defaultValue: "Star lord {{lord}}, house {{house}} · {{nature}} · {{gana}}",
                lord: word(r.starLord),
                house: r.starLordHouse,
                nature: t(`varshik.starText.nature.${r.nature}`, { defaultValue: r.nature }),
                gana: t(`varshik.starText.gana.${r.gana}`, { defaultValue: r.gana }),
              })}
            </span>
            <span className="vk-caption break-words">{t(`varshik.starText.shakti.${r.nakshatra}`, { defaultValue: r.shakti })}</span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span
                className="rounded-full border px-2 py-0.5 text-xs"
                style={{ borderColor: r.tara.good ? "var(--gold)" : "var(--border-faint)", color: r.tara.good ? "var(--gold)" : "var(--text-muted)" }}
              >
                {r.tara.good ? "✓ " : "◑ "}
                {r.tara.good
                  ? t("varshik.stars.friendly", { defaultValue: "A friendly star for you" })
                  : t("varshik.stars.care", { defaultValue: "A star that asks for care" })}
              </span>
              {r.gandanta.present ? (
                <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
                  {t("varshik.stars.gandanta", { defaultValue: "Sensitive junction point" })}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {stars.dashaLords.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="vk-h3 m-0">{y(t("varshik.stars.dashaLords", { defaultValue: "The lords that run in 2027, and their stars" }))}</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {stars.dashaLords.map((d) => (
              <li key={d.planet} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 border-b border-[color:var(--border-faint)] pb-1.5">
                <span className="vk-body min-w-0 break-words">
                  {word(d.planet)}{" "}
                  <span className="vk-caption">({d.roles.map((r) => t(`varshik.stars.role.${r}`, { defaultValue: r })).join(", ")})</span>
                </span>
                <span className="vk-caption min-w-0 break-words text-right">
                  {starLabel(d.nakshatra)} ·{" "}
                  {t("varshik.stars.lordHouse", { defaultValue: "lord {{lord}} in house {{house}}", lord: word(d.starLord), house: d.starLordHouse })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Narrative section={ctx.byId.birth_stars} />
    </div>
  );
}

function FlagCard({ title, flags }: { title: string; flags: TriPatakiFlag[] }) {
  const { t } = useTranslation();
  return (
    <div className="vk-panel flex min-w-0 flex-col gap-1.5 p-3">
      <span className="vk-h3 break-words">{title}</span>
      {flags.length === 0 ? (
        <span className="vk-caption">{t("varshik.flags.none", { defaultValue: "Nothing touches this flag." })}</span>
      ) : (
        <ul className="vk-dense m-0 flex list-none flex-col gap-1 p-0">
          {flags.map((f) => (
            <li key={f.body} className="vk-body flex min-w-0 gap-2 break-words">
              <span aria-hidden="true" style={{ color: f.nature === "benefic" ? "var(--gold)" : "var(--text-muted)" }}>
                {f.nature === "benefic" ? "✓" : "◑"}
              </span>
              <span className="min-w-0">
                {planetWordOf(t, f.body)}{" "}
                <span className="vk-caption">
                  {f.nature === "benefic" ? t("varshik.flags.supportive", { defaultValue: "supportive" }) : t("varshik.flags.testing", { defaultValue: "testing" })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DashaPanel({ title, rows }: { title: string; rows: { key: string; lord: string; when: string }[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h3 className="vk-h3 m-0">{title}</h3>
      <ul className="vk-dense m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((r) => (
          <li key={r.key} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 break-words">
            <span className="vk-body">{planetWordOf(t, r.lord)}</span>
            <span className="vk-caption text-right">{r.when}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type YearWithExtra = VarshaYear & { extra: VarshaExtraFacts };

/** "The year's three flags" (Chapter I, after Year Lord and Muntha): Tri-Pataki, and Mudda, Yogini and Patyayini side by side. */
export function ThreeFlagsBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const { facts, lang } = ctx;
  const years = facts.varsha.filter((v): v is YearWithExtra => !!v.extra);
  if (years.length === 0) return <Missing />;
  const range = (a: string, b: string) => `${shortDate(a, lang)} ${t("varshik.wave.to", { defaultValue: "to" })} ${shortDate(b, lang)}`;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {years.map((v) => (
        <section key={v.targetYear} className="flex min-w-0 flex-col gap-3">
          {years.length > 1 ? (
            <h3 className="vk-h3 m-0">{t("varshik.flags.chart", { defaultValue: "Varsha chart of {{year}}", year: v.targetYear })}</h3>
          ) : null}
          <FlagCard title={t("varshik.flags.lagna", { defaultValue: "The Lagna flag" })} flags={v.extra.triPataki.onLagna} />
          <FlagCard title={t("varshik.flags.moon", { defaultValue: "The Moon flag" })} flags={v.extra.triPataki.onMoon} />
          <DashaPanel
            title={t("varshik.flags.mudda", { defaultValue: "Mudda periods" })}
            rows={v.mudda.map((p, i) => ({ key: `m${i}`, lord: p.lord, when: range(p.from, p.to) }))}
          />
          <DashaPanel
            title={t("varshik.flags.yogini", { defaultValue: "Mudda Yogini periods" })}
            rows={v.extra.muddaYogini.map((p, i) => ({ key: `y${i}`, lord: p.lord, when: range(p.from, p.to) }))}
          />
          <DashaPanel
            title={t("varshik.flags.patyayini", { defaultValue: "Patyayini periods, by the week" })}
            rows={v.extra.patyayini.map((p, i) => ({ key: `p${i}`, lord: p.lord, when: `${p.fromWeek} – ${p.toWeek}` }))}
          />
        </section>
      ))}
      <Narrative section={ctx.byId.three_flags} />
    </div>
  );
}

/** The 27 stars counted from the birth star, in a ring: friendly stars filled, the sensitive ones marked. */
function Wheel({ birthStar }: { birthStar: StarFacts["birthStar"] }) {
  const { t } = useTranslation();
  const mode = useChartMode();
  const color = TIER_COLOR[mode];
  const slots = wheelSlots(birthStar.number);
  const R = 118;
  const cx = 150;
  const cy = 150;
  return (
    <svg
      viewBox="0 0 300 300"
      className="h-auto w-full"
      role="img"
      aria-label={t("varshik.stars.wheelLabel", { defaultValue: "The 27 stars counted from your birth star" })}
    >
      {slots.map((s) => {
        const a = (s.offset / 27) * Math.PI * 2 - Math.PI / 2;
        const x = cx + R * Math.cos(a);
        const y = cy + R * Math.sin(a);
        const lx = cx + (R + 22) * Math.cos(a);
        const ly = cy + (R + 22) * Math.sin(a);
        return (
          <g key={s.offset}>
            <circle
              cx={x}
              cy={y}
              r={s.offset === 0 ? 10 : 8}
              fill={s.good ? color.light_green : "none"}
              stroke={s.offset === 0 ? "var(--gold)" : s.good ? color.light_green : "var(--text-muted)"}
              strokeWidth={s.offset === 0 ? 2.4 : 1.2}
            />
            <text x={x} y={y + 3} textAnchor="middle" fontSize={8} fill={s.good ? "#0b0b0b" : "var(--foreground)"}>
              {s.tara}
            </text>
            {s.special ? (
              <text x={lx} y={ly + 3} textAnchor="middle" fontSize={10} fill="var(--gold)" aria-hidden="true">
                ◆
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fill="var(--gold)">
        {starLabel(birthStar.name)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
        {t("varshik.stars.wheelCentre", { defaultValue: "your birth star" })}
      </text>
    </svg>
  );
}

const TARA = ["your own star, a day to go gently", "a star of wealth and gain", "a star of setbacks, so go carefully", "a star of well-being and comfort", "a star of obstacles and push-back", "a star of achievement", "a hard, draining star", "a star of friends and support", "a star of close friends and good company"];

/** "Your stars in 2027" (Chapter III, after the sky calendar): the Navatara wheel and the slow planets' crossings with dates. */
export function YourStarsBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const { facts, lang } = ctx;
  const stars = facts.stars;
  const mode = useChartMode();
  // On the printed sheet the sign-change list is left out: the month pages carry each of those lines.
  const sheet = usePdfCapturing();
  if (!stars) return <Missing />;
  const slow = stars.segments.filter((s) => ["Saturn", "Jupiter", "Rahu", "Ketu"].includes(s.planet));
  const moorti = sheet ? [] : stars.moorti.filter((m) => ["Saturn", "Jupiter", "Rahu", "Ketu", "Mars"].includes(m.planet));
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="vk-wheel-row flex min-w-0 flex-col gap-4">
        <div className="vk-wheel-box">
          <Wheel birthStar={stars.birthStar} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="vk-h3 m-0">{t("varshik.stars.numbersTitle", { defaultValue: "What the numbers mean" })}</h3>
          <p className="vk-caption m-0 break-words">
            {t("varshik.stars.numbersIntro", { defaultValue: "Count the 27 stars of the sky from your own birth star. Every star gets a number from 1 to 9, and each number has one meaning." })}
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <li key={n} className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                  style={{
                    background: [2, 4, 6, 8, 9].includes(n) ? TIER_COLOR[mode].light_green : "transparent",
                    border: `1px solid ${n === 1 ? "var(--gold)" : [2, 4, 6, 8, 9].includes(n) ? TIER_COLOR[mode].light_green : "var(--text-muted)"}`,
                    color: [2, 4, 6, 8, 9].includes(n) ? "#0b0b0b" : "var(--foreground)",
                  }}
                >
                  {n}
                </span>
                <span className="vk-caption min-w-0 break-words" style={{ color: "var(--foreground)" }}>
                  {t(`varshik.starText.tara.${n}`, { defaultValue: TARA[n - 1] })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="vk-caption m-0 break-words">
        <span aria-hidden="true" style={{ color: TIER_COLOR[mode].light_green }}>● </span>
        {t("varshik.stars.wheelKeyGood", { defaultValue: "Filled: a friendly star for you." })}{" "}
        <span aria-hidden="true">○ </span>
        {t("varshik.stars.wheelKeyCare", { defaultValue: "Open: a star that asks for care." })}{" "}
        <span aria-hidden="true" style={{ color: "var(--gold)" }}>◆ </span>
        {t("varshik.stars.wheelKeySens", { defaultValue: "A sensitive star: work, home, mind or recognition." })}
      </p>

      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="vk-h3 m-0">{t("varshik.stars.crossings", { defaultValue: "The slow planets through your stars" })}</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {slow.map((s, i) => (
            <li key={`${s.planet}-${s.from}-${i}`} className="vk-panel flex min-w-0 flex-col gap-0.5 p-3">
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
                <span className="vk-h3 flex min-w-0 items-center gap-2 break-words">
                  <span
                    aria-hidden="true"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                    style={{ background: s.tara.good ? TIER_COLOR[mode].light_green : "transparent", border: `1px solid ${s.tara.good ? TIER_COLOR[mode].light_green : "var(--text-muted)"}`, color: s.tara.good ? "#0b0b0b" : "var(--foreground)" }}
                  >
                    {s.tara.number}
                  </span>
                  <span className="min-w-0">{planetWordOf(t, s.planet)} · {starLabel(s.nakshatra)}</span>
                </span>
                <span className="vk-caption">
                  {s.enters ? shortDate(s.from, lang) : t("varshik.stars.startsYear", { defaultValue: "from 1 Jan" })}{" "}
                  {t("varshik.wave.to", { defaultValue: "to" })} {shortDate(s.to, lang)}
                </span>
              </div>
              <span className="vk-caption break-words" style={{ color: s.tara.good ? "var(--gold)" : "var(--text-muted)" }}>
                {s.special
                  ? t(`varshik.starText.special.${s.special.number}`, { defaultValue: s.special.plain })
                  : t(`varshik.starText.tara.${s.tara.number}`, { defaultValue: s.tara.plain })}
                {s.natalPointsHere.length > 0
                  ? ` · ${t("varshik.stars.natalStar", { defaultValue: "the star of your natal {{planets}}", planets: s.natalPointsHere.map((p) => planetWordOf(t, p)).join(", ") })}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {moorti.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="vk-h3 m-0">{t("varshik.stars.moorti", { defaultValue: "How each sign change begins (Moorti)" })}</h3>
          <ul className="vk-dense m-0 flex list-none flex-col gap-1.5 p-0">
            {moorti.map((m, i) => (
              <li key={`${m.planet}-${m.date}-${i}`} className="flex min-w-0 gap-3 break-words">
                <span className="vk-caption w-14 shrink-0 tabular-nums">{shortDate(m.date, lang)}</span>
                <span className="vk-body min-w-0 flex-1">
                  {planetWordOf(t, m.planet)} → {signName(t as never, m.toSign)}: {t(`varshik.starText.moorti.${m.moorti}`, { defaultValue: m.plain })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Narrative section={ctx.byId.your_stars_2027} />
    </div>
  );
}
