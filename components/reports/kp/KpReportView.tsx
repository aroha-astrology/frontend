"use client";

import { useTranslation } from "react-i18next";
import { isReportHeader, isReportVerdict } from "@/lib/report-score-facts";
import { shortDateWithYear, shortMonthYear } from "@/lib/calendar-format";
import Card from "@/components/ui/Card";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import AnalysisAccordion from "../AnalysisAccordion";
import PlanetIcon from "../PlanetIcon";
import ScrollTable from "../blocks/ScrollTable";
import type { ReportReady } from "@/hooks/useReport";

/**
 * The bespoke KP Year Ahead screen. Presentation only: everything comes from the
 * `scores` the API already returns (backend lib/astro-engine/reports/kp-annual.ts,
 * KpAnnualScores). Until this existed the report went through the generic path,
 * which printed every cusp, planet and area as one long "Key: value · Key: value"
 * line.
 *
 * Every field is read defensively: an older or partial report renders the cards it
 * has and skips the rest.
 *
 * This report covers twelve months from the day it was bought, so it always runs
 * into the next calendar year. Every date here therefore carries its year, and
 * the month table is split by year — a bare "Apr" or "26 Apr" left the reader
 * guessing which April.
 */

type Tone = "peak" | "active" | "quiet";
type Promise3 = "strong" | "steady" | "slow";

interface Area {
  key: string;
  principalCusp: number;
  cuspSubLord: string;
  promise: Promise3;
  cuspNearBoundary?: boolean;
  peakMonths?: number[];
  bestWindow?: { start: string; end: string; lords: string[] } | null;
}
interface Month {
  index: number;
  start: string;
  dasha?: { md: string; ad: string; pd: string };
  tones?: Record<string, Tone>;
  focus?: string;
  care?: "spending" | "rest" | null;
}
interface Cusp {
  house: number;
  sign: string;
  nakshatra: string;
  starLord: string;
  subLord: string;
}
interface PlanetRow {
  planet: string;
  sign: string;
  nakshatra: string;
  starLord: string;
  subLord: string;
  house: number;
  retrograde?: boolean;
  signifies?: number[];
}
interface KpScores {
  areas?: Area[];
  months?: Month[];
  cusps?: Cusp[];
  planets?: PlanetRow[];
  sensitiveCusps?: number[];
  dashaNow?: { md: string; ad: string; pd: string; adEnds: string } | null;
  dashaShifts?: Array<{ date: string; ad: string; md: string }>;
  rulingPlanets?: Array<{ planet: string }>;
}

const SECTION_ICON: Record<string, string> = {
  year_at_a_glance: "Sparkles",
  kp_blueprint: "Grid3x3",
  dasha_story: "Layers",
  transit_triggers: "Compass",
  career_money: "TrendingUp",
  love_family: "Heart",
  health_wellbeing: "Activity",
  home_travel_learning: "Home",
  month_by_month: "CalendarHeart",
  guidance_remedies: "Leaf",
  closing_note: "Sparkles",
  your_questions: "Compass",
};

const TONE_DOT: Record<Tone, string> = {
  peak: "bg-emerald-400",
  active: "bg-gold",
  quiet: "bg-foreground/20",
};

const PROMISE_STYLE: Record<Promise3, string> = {
  strong: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  steady: "border-gold/30 bg-gold/10 text-gold",
  slow: "border-border text-muted",
};

const planetKey = (name: string) => name.toLowerCase();

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 font-display text-base text-gold">{children}</h2>;
}

export default function KpReportView({ data }: { data: ReportReady }) {
  const { t, i18n } = useTranslation();
  const scores = data.scores as unknown as KpScores & Record<string, unknown>;
  const lang = i18n.language;
  const verdict = isReportVerdict(data.scores.verdict) ? data.scores.verdict : null;

  const areas = Array.isArray(scores.areas) ? scores.areas : [];
  const months = Array.isArray(scores.months) ? scores.months : [];
  const cusps = Array.isArray(scores.cusps) ? scores.cusps : [];
  const planets = Array.isArray(scores.planets) ? scores.planets : [];
  const shifts = Array.isArray(scores.dashaShifts) ? scores.dashaShifts : [];
  const ruling = Array.isArray(scores.rulingPlanets) ? scores.rulingPlanets : [];
  const sensitive = new Set(Array.isArray(scores.sensitiveCusps) ? scores.sensitiveCusps : []);
  const now = scores.dashaNow ?? null;

  const areaName = (key: string) => t(`kpReport.area.${key}`, key.charAt(0).toUpperCase() + key.slice(1));
  const monthName = (iso: string) => {
    try {
      return new Date(`${iso}T00:00:00Z`).toLocaleString(lang, { month: "short", timeZone: "UTC" });
    } catch {
      return iso.slice(5, 7);
    }
  };
  const yearOf = (iso: string) => iso.slice(0, 4);
  const areaKeys = areas.map((a) => a.key);
  // "Sep 2026 – Aug 2027": first and last month of the table, each with its year.
  const monthsRange =
    months.length > 0
      ? `${shortMonthYear(months[0]!.start, lang)} – ${shortMonthYear(months[months.length - 1]!.start, lang)}`
      : null;

  return (
    <>
      {isReportHeader(data.scores.header) && <ReportHeaderCard header={data.scores.header} />}

      {now && (
        <Card className="p-4">
          <Title>{t("kpReport.now.title", "Your running period")}</Title>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["kpReport.now.maha", "Maha", now.md],
                ["kpReport.now.bhukti", "Bhukti", now.ad],
                ["kpReport.now.antara", "Antara", now.pd],
              ] as const
            ).map(([k, label, planet]) => (
              <div key={k} className="rounded-xl border border-gold/15 bg-surface/40 px-2 py-3">
                <PlanetIcon planet={planetKey(planet)} size={40} className="mx-auto" />
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">{t(k, label)}</p>
                <p className="text-sm font-semibold text-foreground">{planet}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            {t("kpReport.now.adEnds", "This bhukti runs until {{date}}.", { date: shortDateWithYear(now.adEnds, lang) })}
          </p>
          {ruling.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gold/10 pt-3">
              <span className="text-[10px] uppercase tracking-wider text-muted">
                {t("kpReport.now.ruling", "Ruling planets today")}
              </span>
              {ruling.map((r) => (
                <span key={r.planet} className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 px-2 py-1 text-xs text-foreground">
                  <PlanetIcon planet={planetKey(r.planet)} size={18} />
                  {r.planet}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {areas.length > 0 && (
        <Card className="p-4">
          <Title>{t("kpReport.areas.title", "What the chart promises")}</Title>
          <div className="grid gap-3 sm:grid-cols-2">
            {areas.map((a) => (
              <div key={a.key} className="flex flex-col gap-2 rounded-xl border border-gold/15 bg-surface/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{areaName(a.key)}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PROMISE_STYLE[a.promise] ?? PROMISE_STYLE.slow}`}>
                    {t(`kpReport.promise.${a.promise}`, a.promise)}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <PlanetIcon planet={planetKey(a.cuspSubLord)} size={18} />
                  {t("kpReport.areas.subLord", "House {{cusp}} sub lord: {{lord}}", { cusp: a.principalCusp, lord: a.cuspSubLord })}
                </p>
                {a.bestWindow ? (
                  <p className="text-xs text-foreground">
                    <span className="text-muted">{t("kpReport.areas.best", "Best window")}: </span>
                    {shortDateWithYear(a.bestWindow.start, lang)} – {shortDateWithYear(a.bestWindow.end, lang)}
                  </p>
                ) : (
                  <p className="text-xs text-muted">{t("kpReport.areas.noWindow", "No standout window this year")}</p>
                )}
                {a.cuspNearBoundary && (
                  <p className="text-[11px] text-amber-400">
                    {t("kpReport.areas.boundary", "Sensitive to birth time: a few minutes could change this reading.")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {months.length > 0 && areaKeys.length > 0 && (
        <Card className="p-4" data-testid="kp-months">
          <Title>{t("kpReport.months.title", "Month by month")}</Title>
          {monthsRange && <p className="-mt-2 mb-3 text-xs text-muted">{monthsRange}</p>}
          <ScrollTable tableClassName="min-w-[420px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.months.month", "Month")}</th>
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.months.bhukti", "Bhukti")}</th>
                {areaKeys.map((k) => (
                  <th key={k} className="px-1 py-1 text-center font-medium">
                    {areaName(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.flatMap((m, i) => [
                // A year row before the first month of each calendar year.
                ...(i === 0 || yearOf(m.start) !== yearOf(months[i - 1]!.start)
                  ? [
                      <tr key={`year-${yearOf(m.start)}`} className="border-t border-gold/10">
                        <th
                          scope="rowgroup"
                          colSpan={2 + areaKeys.length}
                          className="pb-1 pt-3 text-left text-[11px] font-semibold tracking-wider text-gold"
                        >
                          {yearOf(m.start)}
                        </th>
                      </tr>,
                    ]
                  : []),
                <tr key={m.index} className="border-t border-gold/10">
                  <td className="py-2 pr-2 font-medium text-foreground">{monthName(m.start)}</td>
                  <td className="py-2 pr-2 text-muted">{m.dasha?.ad ?? ""}</td>
                  {areaKeys.map((k) => {
                    const tone = (m.tones?.[k] ?? "quiet") as Tone;
                    return (
                      <td key={k} className="px-1 py-2 text-center">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${TONE_DOT[tone]} ${m.focus === k ? "ring-2 ring-gold/60 ring-offset-1 ring-offset-card" : ""}`}
                          title={t(`kpReport.tone.${tone}`, tone)}
                        />
                        <span className="sr-only">{t(`kpReport.tone.${tone}`, tone)}</span>
                      </td>
                    );
                  })}
                </tr>,
              ])}
            </tbody>
          </ScrollTable>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
            {(["peak", "active", "quiet"] as Tone[]).map((tone) => (
              <span key={tone} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[tone]}`} />
                {t(`kpReport.tone.${tone}`, tone)}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-gold/60 ring-offset-1 ring-offset-card" />
              {t("kpReport.months.focus", "Month's main focus")}
            </span>
          </div>
        </Card>
      )}

      {shifts.length > 0 && (
        <Card className="p-4">
          <Title>{t("kpReport.shifts.title", "Turning points")}</Title>
          <ol className="space-y-2">
            {shifts.map((s) => (
              <li key={`${s.date}-${s.ad}`} className="flex items-center gap-3 text-sm">
                <PlanetIcon planet={planetKey(s.ad)} size={28} />
                <span className="flex-1 text-foreground">
                  {t("kpReport.shifts.row", "{{ad}} bhukti begins", { ad: s.ad })}
                  <span className="text-muted"> · {s.md}</span>
                </span>
                <span className="text-xs text-gold">{shortDateWithYear(s.date, lang)}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <AnalysisAccordion sections={data.sections} sectionIcon={SECTION_ICON} titleKey="kpReport.analysis.title" />

      {cusps.length > 0 && (
        <Card className="p-4">
          <Title>{t("kpReport.cusps.title", "Your 12 cusps")}</Title>
          <ScrollTable tableClassName="min-w-[420px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.col.house", "House")}</th>
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.col.sign", "Sign")}</th>
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.col.star", "Star lord")}</th>
                <th className="py-1 text-left font-medium">{t("kpReport.col.sub", "Sub lord")}</th>
              </tr>
            </thead>
            <tbody>
              {cusps.map((c) => (
                <tr key={c.house} className="border-t border-gold/10">
                  <td className="py-1.5 pr-2 font-semibold text-gold">
                    {c.house}
                    {sensitive.has(c.house) && <span className="ml-1 text-amber-400" title={t("kpReport.cusps.sensitive", "Sub lord could change with a small birth-time shift")}>*</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-foreground">{c.sign}</td>
                  <td className="py-1.5 pr-2 text-foreground">{c.starLord}</td>
                  <td className="py-1.5 text-foreground">{c.subLord}</td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
          {sensitive.size > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              * {t("kpReport.cusps.sensitive", "Sub lord could change with a small birth-time shift")}
            </p>
          )}
        </Card>
      )}

      {planets.length > 0 && (
        <Card className="p-4">
          <Title>{t("kpReport.planets.title", "Your planets in KP")}</Title>
          <ScrollTable tableClassName="min-w-[480px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.col.planet", "Planet")}</th>
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.col.house", "House")}</th>
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.col.star", "Star lord")}</th>
                <th className="py-1 pr-2 text-left font-medium">{t("kpReport.col.sub", "Sub lord")}</th>
                <th className="py-1 text-left font-medium">{t("kpReport.col.signifies", "Signifies")}</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((p) => (
                <tr key={p.planet} className="border-t border-gold/10">
                  <td className="py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <PlanetIcon planet={planetKey(p.planet)} size={22} />
                      {p.planet}
                      {p.retrograde && <span className="text-[10px] text-amber-400">℞</span>}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-foreground">{p.house}</td>
                  <td className="py-1.5 pr-2 text-foreground">{p.starLord}</td>
                  <td className="py-1.5 pr-2 text-foreground">{p.subLord}</td>
                  <td className="py-1.5 text-muted">{(p.signifies ?? []).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        </Card>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
