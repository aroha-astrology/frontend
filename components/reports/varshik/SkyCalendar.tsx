"use client";

import { useTranslation } from "react-i18next";
import type { SkyEventFact, SkyEventKind } from "./types";
import { dayOfYear, monthShort } from "./format";

const KIND: Record<SkyEventKind, { glyph: string; en: string }> = {
  ingress: { glyph: "→", en: "changes sign" },
  "station-retrograde": { glyph: "℞", en: "turns retrograde" },
  "station-direct": { glyph: "▶", en: "turns direct" },
  "combust-in": { glyph: "◐", en: "goes combust" },
  "combust-out": { glyph: "○", en: "leaves combustion" },
  "eclipse-solar": { glyph: "●", en: "solar eclipse" },
  "eclipse-lunar": { glyph: "◗", en: "lunar eclipse" },
};
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const SLOT = 3;

/** The sky calendar: a 12-month strip with a mark per event, then every event listed by month. */
export default function SkyCalendar({ events }: { events: SkyEventFact[] }) {
  const { t, i18n } = useTranslation();
  if (events.length === 0) return null;
  const lang = i18n.language;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const word = (p: string) => t(`varshik.planet.${p.toLowerCase()}`, { defaultValue: p });
  const dateFmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
    } catch {
      return iso;
    }
  };
  const eclipse = (k: SkyEventKind) => k === "eclipse-solar" || k === "eclipse-lunar";

  // Marks stack in rows (SLOT days wide each) so two events on one date never sit on top of each other.
  const rowEnd: number[] = [];
  const marks = sorted.map((e) => {
    const day = dayOfYear(e.date);
    let r = rowEnd.findIndex((end) => day - end >= SLOT);
    if (r === -1) r = rowEnd.length;
    rowEnd[r] = day;
    return { e, x: 8 + (day / 364) * 344, r };
  });
  const rows = Math.min(rowEnd.length, 8);
  const height = 20 + rows * 9;

  return (
    <div className="flex flex-col gap-3 leading-[1.45]">
      <svg
        viewBox={`0 0 360 ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("varshik.sky.label", { defaultValue: "Sky events through 2027" })}
      >
        {MONTH_START.map((d) => (
          <line key={d} x1={8 + (d / 364) * 344} x2={8 + (d / 364) * 344} y1={0} y2={height} stroke="var(--border-faint)" strokeWidth={1} />
        ))}
        {marks
          .filter((m) => m.r < 8)
          .map(({ e, x, r }, i) => (
            <circle
              key={i}
              cx={x}
              cy={10 + r * 9}
              r={eclipse(e.kind) ? 3.2 : 2.2}
              fill={eclipse(e.kind) ? "var(--gold)" : "var(--text-muted)"}
              stroke={eclipse(e.kind) ? "var(--foreground)" : "none"}
              strokeWidth={0.8}
            />
          ))}
      </svg>
      <div className="grid grid-cols-6 gap-y-1 min-[420px]:grid-cols-12" aria-hidden="true">
        {Array.from({ length: 12 }, (_, m) => (
          <span key={m} className="min-w-0 break-words text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
            {monthShort(m, lang)}
          </span>
        ))}
      </div>
      <p className="m-0 text-xs" style={{ color: "var(--text-muted)" }}>
        <span aria-hidden="true" style={{ color: "var(--gold)" }}>● </span>
        {t("varshik.sky.eclipseKey", { defaultValue: "Gold marks are eclipses" })}
      </p>

      {Array.from({ length: 12 }, (_, m) => {
        const inMonth = sorted.filter((e) => e.month === m);
        if (inMonth.length === 0) return null;
        return (
          <section key={m} className="flex flex-col gap-1.5">
            <h3 className="m-0 text-sm font-semibold" style={{ color: "var(--gold)" }}>
              {new Intl.DateTimeFormat(lang, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2027, m, 15)))}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {inMonth.map((e, i) => (
                <li
                  key={`${e.date}-${e.planet}-${e.kind}-${i}`}
                  className="flex min-w-0 gap-2 break-words text-xs"
                  style={{ color: "var(--foreground)", fontWeight: eclipse(e.kind) ? 600 : 400 }}
                >
                  <span aria-hidden="true" className="w-4 shrink-0 text-center" style={{ color: eclipse(e.kind) ? "var(--gold)" : "var(--text-muted)" }}>
                    {KIND[e.kind].glyph}
                  </span>
                  <span className="w-14 shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {dateFmt(e.date)}
                  </span>
                  <span className="min-w-0 flex-1">
                    {eclipse(e.kind)
                      ? t(`varshik.sky.${e.kind}`, { defaultValue: "{{kind}} in {{sign}}, house {{house}} of your chart", kind: KIND[e.kind].en.charAt(0).toUpperCase() + KIND[e.kind].en.slice(1), sign: e.sign, house: e.natalHouse })
                      : t(`varshik.sky.${e.kind}`, {
                          defaultValue: "{{planet}} {{kind}}: {{sign}}, house {{house}}",
                          planet: word(e.planet),
                          kind: KIND[e.kind].en,
                          sign: e.sign,
                          house: e.natalHouse,
                        })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
