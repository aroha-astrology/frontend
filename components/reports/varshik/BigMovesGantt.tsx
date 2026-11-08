"use client";

import { useTranslation } from "react-i18next";
import { useY } from "./year-context";
import { signName } from "./sign-name";
import type { TransitRow } from "./types";
import { monthShort } from "./format";
import { ordinal } from "./sky-text";

interface Segment {
  from: number;
  to: number;
  house: number;
  /** C5: the same sign counted from the natal Moon (absent in older reports). */
  moon?: number;
  sign: string;
  avg: number;
}

function segmentsOf(rows: TransitRow[]): Segment[] {
  const sorted = [...rows].sort((a, b) => a.month - b.month);
  const out: (Segment & { sum: number; n: number })[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && last.house === r.natalHouse && last.to === r.month - 1) {
      last.to = r.month;
      last.sum += r.bindus;
      last.n += 1;
    } else {
      out.push({ from: r.month, to: r.month, house: r.natalHouse, moon: r.moonHouse, sign: r.sign, avg: 0, sum: r.bindus, n: 1 });
    }
  }
  return out.map((s) => ({ from: s.from, to: s.to, house: s.house, moon: s.moon, sign: s.sign, avg: s.sum / s.n }));
}

/** Big sky moves: for each slow planet a 12-month strip of the house it stands in, shaded by bindus. */
export default function BigMovesGantt({
  transits,
  planetOrder = ["Saturn", "Jupiter", "Rahu", "Ketu"],
}: {
  transits: TransitRow[];
  planetOrder?: string[];
}) {
  const { t, i18n } = useTranslation();
  const y = useY();
  const lang = i18n.language;
  const blocks = planetOrder
    .map((planet) => ({ planet, rows: transits.filter((r) => r.planet === planet) }))
    .filter((b) => b.rows.length > 0);
  if (blocks.length === 0) return null;

  // Saturn and Jupiter report 0-8 bindus per sign, Rahu and Ketu the sign's combined total
  // (about 20-40), so each scale gets its own shading range.
  const shade = (avg: number, max: number) =>
    0.25 + 0.7 * Math.max(0, Math.min(1, max <= 8 ? avg / 8 : (avg - 20) / 20));

  return (
    <div className="flex flex-col gap-4 leading-[1.45]">
      {blocks.map(({ planet, rows }) => {
        const word = t(`varshik.planet.${planet.toLowerCase()}`, { defaultValue: planet });
        const segs = segmentsOf(rows);
        const min = Math.min(...rows.map((r) => r.bindus));
        const max = Math.max(...rows.map((r) => r.bindus));
        return (
          <section
            key={planet}
            className="flex flex-col gap-2 vk-panel p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="vk-h3 m-0 min-w-0 break-words">
                {word}
              </h3>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {t("varshik.moves.bindusRange", { defaultValue: "Bindus {{min}} to {{max}}", min, max })}
              </span>
            </div>
            <svg
              viewBox="0 0 360 40"
              className="h-auto w-full"
              role="img"
              aria-label={y(t("varshik.moves.label", {
                defaultValue: "{{planet}} through the twelve months of 2027",
                planet: word,
              }))}
            >
              {segs.map((s) => {
                const w = (s.to - s.from + 1) * 30 - 2;
                const op = shade(s.avg, max);
                return (
                  <g key={s.from}>
                    <rect x={s.from * 30 + 1} y={4} width={w} height={24} rx={5} fill="var(--gold)" opacity={op} />
                    <text
                      x={s.from * 30 + 1 + w / 2}
                      y={20}
                      fontSize={12}
                      fontWeight={600}
                      textAnchor="middle"
                      fill="var(--foreground)"
                    >
                      {s.moon === undefined ? (w < 40 ? s.house : `H${s.house}`) : w < 58 ? `${s.house}·${s.moon}` : `L${s.house} · M${s.moon}`}
                    </text>
                  </g>
                );
              })}
              {Array.from({ length: 13 }, (_, i) => (
                <line key={i} x1={i * 30} x2={i * 30} y1={32} y2={38} stroke="var(--text-muted)" strokeWidth={1} aria-hidden="true" />
              ))}
            </svg>
            <div className="grid grid-cols-6 gap-y-1 min-[420px]:grid-cols-12">
              {Array.from({ length: 12 }, (_, m) => (
                <span key={m} className="min-w-0 break-words text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {monthShort(m, lang)}
                </span>
              ))}
            </div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs" style={{ color: "var(--foreground)" }}>
              {segs.map((s) => (
                <li key={s.from} className="min-w-0 break-words">
                  {s.moon === undefined
                    ? t(s.from === s.to ? "varshik.moves.segmentOne" : "varshik.moves.segment", {
                        defaultValue:
                          s.from === s.to
                            ? "{{from}} · house {{house}} · {{sign}} · {{bindus}} bindus"
                            : "{{from}} to {{to}} · house {{house}} · {{sign}} · {{bindus}} bindus",
                        from: monthShort(s.from, lang),
                        to: monthShort(s.to, lang),
                        house: s.house,
                        sign: signName(t, s.sign),
                        bindus: Math.round(s.avg),
                      })
                    : t(s.from === s.to ? "varshik.moves.segmentRefOne" : "varshik.moves.segmentRef", {
                        defaultValue:
                          s.from === s.to
                            ? "{{from}} · {{sign}} · {{lagna}} from your Lagna · {{moon}} from your Moon · {{bindus}} bindus"
                            : "{{from}} to {{to}} · {{sign}} · {{lagna}} from your Lagna · {{moon}} from your Moon · {{bindus}} bindus",
                        from: monthShort(s.from, lang),
                        to: monthShort(s.to, lang),
                        sign: signName(t, s.sign),
                        lagna: ordinal(s.house, lang),
                        moon: ordinal(s.moon, lang),
                        bindus: Math.round(s.avg),
                      })}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="m-0 text-xs" style={{ color: "var(--text-muted)" }}>
        {t("varshik.moves.note", {
          defaultValue: "Bindus show how supportive a house is for that planet; more is easier.",
        })}
        {transits.some((r) => r.moonHouse !== undefined)
          ? ` ${t("varshik.moves.refKey", { defaultValue: "In the bars, L is the house from your Lagna and M the house from your Moon." })}`
          : null}
      </p>
    </div>
  );
}
