"use client";

import { useTranslation } from "react-i18next";
import type { EclipsePlace, SkyEventFact, SkyEventKind, StarFacts } from "./types";
import { dayOfYear, monthShort } from "./format";
import { starLabel } from "./facts-helpers";
import { ECLIPSE_TYPE_EN, eclipsePlaceLines, skyLabel } from "./sky-text";
import { signName } from "./sign-name";
import { useReportYear, useY } from "./year-context";
import { usePdfCapturing } from "@/components/pdf/PdfCapturingContext";

const SLOW_OR_MARS = new Set(["Saturn", "Jupiter", "Rahu", "Ketu", "Mars"]);

/** One line of the calendar that is not a sky event: a planet entering a star, or the Moorti of a sign change. */
interface StarLine {
  date: string;
  month: number;
  kind: "star" | "sensitive" | "moorti";
  planet: string;
  what: string;
  plain: string;
  plainKey: string;
}

function starLines(stars: StarFacts | undefined): StarLine[] {
  if (!stars) return [];
  const out: StarLine[] = [];
  for (const s of stars.segments) {
    if (!s.enters || !SLOW_OR_MARS.has(s.planet)) continue;
    const sensitive = !!s.special || s.natalPointsHere.length > 0;
    out.push({
      date: s.from,
      month: Number(s.from.slice(5, 7)) - 1,
      kind: sensitive ? "sensitive" : "star",
      planet: s.planet,
      what: starLabel(s.nakshatra),
      plain: s.special ? s.special.plain : s.tara.plain,
      plainKey: s.special ? `varshik.starText.special.${s.special.number}` : `varshik.starText.tara.${s.tara.number}`,
    });
  }
  for (const x of stars.moorti) {
    if (!SLOW_OR_MARS.has(x.planet)) continue;
    out.push({ date: x.date, month: Number(x.date.slice(5, 7)) - 1, kind: "moorti", planet: x.planet, what: x.toSign, plain: x.plain, plainKey: `varshik.starText.moorti.${x.moorti}` });
  }
  return out;
}

const GLYPH: Record<SkyEventKind, string> = {
  ingress: "→",
  "station-retrograde": "℞",
  "station-direct": "▶",
  "combust-in": "◐",
  "combust-out": "○",
  "eclipse-solar": "●",
  "eclipse-lunar": "◗",
};
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** What a mark on the strip stands for. Each kind has its own shape, and the legend lists the kinds the year holds. */
type MarkKind =
  | "ingress"
  | "station-retrograde"
  | "station-direct"
  | "combust-in"
  | "combust-out"
  | "grahan"
  | "marker"
  | "eclipse";

const MARK_ORDER: MarkKind[] = ["grahan", "marker", "eclipse", "ingress", "station-retrograde", "station-direct", "combust-in", "combust-out"];

const MARK_EN: Record<MarkKind, string> = {
  grahan: "Eclipse seen as a Grahan",
  marker: "Eclipse, penumbral or not visible: a marker only",
  eclipse: "Eclipse",
  ingress: "A planet changes sign",
  "station-retrograde": "Turns retrograde",
  "station-direct": "Turns direct",
  "combust-in": "Goes combust (too close to the Sun)",
  "combust-out": "Leaves combustion",
};

function markKindOf(e: SkyEventFact): MarkKind {
  if (e.kind === "eclipse-solar" || e.kind === "eclipse-lunar") {
    if (!e.eclipse) return "eclipse";
    return e.eclipse.class === "grahan" ? "grahan" : "marker";
  }
  return e.kind;
}

/** One mark, centred on (x, y). Every shape sets its own fill so it reads in both themes. */
function Mark({ kind, x, y }: { kind: MarkKind; x: number; y: number }) {
  switch (kind) {
    case "grahan":
    case "eclipse":
      return <circle cx={x} cy={y} r={3.2} fill="var(--gold)" stroke="var(--foreground)" strokeWidth={0.8} />;
    case "marker":
      return <circle cx={x} cy={y} r={3} fill="none" stroke="var(--gold)" strokeWidth={1} />;
    case "ingress":
      return <circle cx={x} cy={y} r={2.2} fill="var(--text-muted)" />;
    case "station-retrograde":
      return <polygon points={`${x - 2.8},${y} ${x + 2.2},${y - 2.8} ${x + 2.2},${y + 2.8}`} fill="var(--foreground)" />;
    case "station-direct":
      return <polygon points={`${x + 2.8},${y} ${x - 2.2},${y - 2.8} ${x - 2.2},${y + 2.8}`} fill="var(--foreground)" />;
    case "combust-in":
      return <polygon points={`${x},${y - 2.9} ${x + 2.9},${y} ${x},${y + 2.9} ${x - 2.9},${y}`} fill="var(--text-muted)" />;
    case "combust-out":
      return <polygon points={`${x},${y - 2.6} ${x + 2.6},${y} ${x},${y + 2.6} ${x - 2.6},${y}`} fill="none" stroke="var(--text-muted)" strokeWidth={0.9} />;
  }
}
// Marks closer than this many days go on separate rows, so no two shapes touch.
const SLOT = 7;

/** The sky calendar: a 12-month strip with a mark per event, then every event listed by month. */
export default function SkyCalendar({ events, stars, place }: { events: SkyEventFact[]; stars?: StarFacts; place?: EclipsePlace }) {
  const { t, i18n } = useTranslation();
  const year = useReportYear();
  const y = useY();
  // On the printed sheet the star-entry lines are left out: each month's own pages carry them.
  const sheet = usePdfCapturing();
  if (events.length === 0) return null;
  const lang = i18n.language;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const dateFmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
    } catch {
      return iso;
    }
  };
  const eclipse = (k: SkyEventKind) => k === "eclipse-solar" || k === "eclipse-lunar";
  // C5: only a visible Grahan is drawn in solid gold; an Upachchaya or unseen eclipse is a hollow marker.
  const grahan = (e: SkyEventFact) => eclipse(e.kind) && (e.eclipse ? e.eclipse.class === "grahan" : true);
  const kindsHere = new Set(events.map(markKindOf));
  const starRows = sheet ? [] : starLines(stars).sort((a, b) => a.date.localeCompare(b.date));

  // Marks stack in rows (SLOT days wide each) so two events on one date never sit on top of each other.
  // The strip is drawn on a wider canvas in print, so it takes less height on the page (the marks keep their size).
  const W = sheet ? 520 : 360;
  const rowEnd: number[] = [];
  const marks = sorted.map((e) => {
    const day = dayOfYear(e.date, year);
    // In print the wider canvas spaces the days further apart, so 5 days already keep two marks from touching.
    let r = rowEnd.findIndex((end) => day - end >= (sheet ? 5 : SLOT));
    if (r === -1) r = rowEnd.length;
    rowEnd[r] = day;
    return { e, x: 8 + (day / 364) * (W - 16), r };
  });
  const rows = Math.min(rowEnd.length, 12);
  const height = 20 + rows * 9;

  return (
    <div className="flex flex-col gap-3 leading-[1.45]">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={y(t("varshik.sky.label", { defaultValue: "Sky events through 2027" }))}
      >
        {MONTH_START.map((d) => (
          <line key={d} x1={8 + (d / 364) * (W - 16)} x2={8 + (d / 364) * (W - 16)} y1={0} y2={height} stroke="var(--border-faint)" strokeWidth={1} />
        ))}
        {marks
          .filter((m) => m.r < 12)
          .map(({ e, x, r }, i) => (
            <Mark key={i} kind={markKindOf(e)} x={x} y={10 + r * 9} />
          ))}
      </svg>
      <div className="grid grid-cols-6 gap-y-1 min-[420px]:grid-cols-12" aria-hidden="true">
        {Array.from({ length: 12 }, (_, m) => (
          <span key={m} className="min-w-0 break-words text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
            {monthShort(m, lang)}
          </span>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-xs" style={{ color: "var(--text-muted)" }} data-testid="sky-legend">
        {MARK_ORDER.filter((k) => kindsHere.has(k)).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <svg viewBox="0 0 8 8" width={13} height={13} aria-hidden="true" className="shrink-0">
              <Mark kind={k} x={4} y={4} />
            </svg>
            {t(`varshik.sky.legend.${k}`, { defaultValue: MARK_EN[k] })}
          </li>
        ))}
      </ul>
      {sheet && events.some((e) => e.moonHouse !== undefined) ? (
        <p className="m-0 text-xs" style={{ color: "var(--text-muted)" }}>
          {t("varshik.sky.refKey", { defaultValue: "L is the house from your Lagna, M the house from your Moon." })}
        </p>
      ) : null}
      {starRows.length > 0 ? (
        <p className="m-0 text-xs" style={{ color: "var(--text-muted)" }}>
          <span aria-hidden="true">✦ </span>
          {t("varshik.sky.starKey", { defaultValue: "a planet entering a new star, ◆ a sensitive star, ◈ how a sign change begins" })}
        </p>
      ) : null}

      <div className="flex flex-col gap-3" data-vk-flow data-vk-maxcols="4">
      {Array.from({ length: 12 }, (_, m) => {
        const inMonth = sorted.filter((e) => e.month === m);
        const starsInMonth = starRows.filter((s) => s.month === m);
        if (inMonth.length === 0 && starsInMonth.length === 0) return null;
        return (
          <section key={m} className="flex flex-col gap-1.5" data-vk-split>
            <h3 className="m-0 text-sm font-semibold" style={{ color: "var(--gold)" }}>
              {new Intl.DateTimeFormat(lang, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, m, 15)))}
            </h3>
            <ul className="vk-dense m-0 flex list-none flex-col gap-1 p-0">
              {inMonth.map((e, i) => (
                <li
                  key={`${e.date}-${e.planet}-${e.kind}-${i}`}
                  className="flex min-w-0 gap-2 break-words text-xs"
                  style={{ color: "var(--foreground)", fontWeight: grahan(e) ? 600 : 400 }}
                >
                  <span aria-hidden="true" className="w-4 shrink-0 text-center" style={{ color: eclipse(e.kind) ? "var(--gold)" : "var(--text-muted)" }}>
                    {GLYPH[e.kind]}
                  </span>
                  <span className="w-14 shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {dateFmt(e.date)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span>
                      {skyLabel(t, e, lang, place, sheet)}
                      {e.eclipse ? (
                        <span
                          className="ml-1.5 inline-block rounded-full border px-1.5 text-[10px] font-normal"
                          style={{ borderColor: "var(--border-faint)", color: "var(--text-muted)" }}
                        >
                          {t(`varshik.eclipse.type.${e.eclipse.subtype}`, { defaultValue: ECLIPSE_TYPE_EN[e.eclipse.subtype] })}
                        </span>
                      ) : null}
                    </span>
                    {e.eclipse && e.eclipse.class !== "not_visible"
                      ? (() => {
                          const scope =
                            place?.scope === "reader"
                              ? t("varshik.eclipse.scopeReader", { defaultValue: "Times where you live ({{place}}):", place: place.name })
                              : t("varshik.eclipse.scopeIndia", { defaultValue: "Times across India, in IST:" });
                          const lines = eclipsePlaceLines(t, e);
                          const rule =
                            e.eclipse.class === "grahan"
                              ? t(e.kind === "eclipse-solar" ? "varshik.eclipse.sutakSolar" : "varshik.eclipse.sutakLunar", {
                                  defaultValue:
                                    e.kind === "eclipse-solar"
                                      ? "Sutak starts 12 hours (4 prahar) before the eclipse begins where you are."
                                      : "Sutak starts 9 hours (3 prahar) before the eclipse begins where you are.",
                                })
                              : null;
                          // On the printed sheet the label, the cities and the Sutak rule run on as one paragraph.
                          if (sheet) {
                            return (
                              <span className="font-normal tabular-nums" style={{ color: "var(--text-muted)" }}>
                                {scope} <span style={{ color: "var(--foreground)" }}>{lines.join(" · ")}</span>
                                {rule ? ` ${rule}` : ""}
                              </span>
                            );
                          }
                          return (
                            <>
                              <span className="font-normal" style={{ color: "var(--text-muted)" }}>
                                {scope}
                              </span>
                              {lines.map((line, j) => (
                                <span key={j} className="font-normal tabular-nums">
                                  {line}
                                </span>
                              ))}
                              {rule ? (
                                <span className="font-normal" style={{ color: "var(--text-muted)" }}>
                                  {rule}
                                </span>
                              ) : null}
                            </>
                          );
                        })()
                      : null}
                  </span>
                </li>
              ))}
              {starsInMonth.map((s, i) => (
                <li key={`star-${s.date}-${s.planet}-${s.kind}-${i}`} className="flex min-w-0 gap-2 break-words text-xs" style={{ color: "var(--foreground)" }}>
                  <span aria-hidden="true" className="w-4 shrink-0 text-center" style={{ color: s.kind === "sensitive" ? "var(--gold)" : "var(--text-muted)" }}>
                    {s.kind === "moorti" ? "◈" : s.kind === "sensitive" ? "◆" : "✦"}
                  </span>
                  <span className="w-14 shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {dateFmt(s.date)}
                  </span>
                  <span className="min-w-0 flex-1">
                    {s.kind === "moorti"
                      ? t("varshik.month.moorti", {
                          defaultValue: "{{planet}} enters {{sign}}: {{plain}}",
                          planet: t(`varshik.planet.${s.planet.toLowerCase()}`, { defaultValue: s.planet }),
                          sign: signName(t, s.what),
                          plain: t(s.plainKey, { defaultValue: s.plain }),
                        })
                      : t(s.kind === "sensitive" ? "varshik.month.starSensitive" : "varshik.month.starMove", {
                          defaultValue: s.kind === "sensitive" ? "{{planet}} enters {{star}}, a sensitive star: {{plain}}" : "{{planet}} enters {{star}}: {{plain}}",
                          planet: t(`varshik.planet.${s.planet.toLowerCase()}`, { defaultValue: s.planet }),
                          star: s.what,
                          plain: t(s.plainKey, { defaultValue: s.plain }),
                        })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      </div>
    </div>
  );
}
