"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import PlanetIcon from "@/components/reports/PlanetIcon";
import FactorList from "@/components/why/FactorList";
import { shortDateWithYear } from "@/lib/calendar-format";
import type { BondWindow, SharedWindow } from "@/lib/bonds-api";

const DAY = 86_400_000;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

const TONE_BAR: Record<BondWindow["tone"], string> = {
  good: "bg-emerald-500/80",
  care: "bg-amber-500/80",
};

/**
 * "Periods ahead" for both people on one three-year scale: a row of bars for
 * the account owner, a row for the other person, and a gold band where the two
 * agree. Every period is also a row underneath; tapping a bar or a row opens
 * its planets and reasons.
 */
export default function PeriodsTimeline({
  windows,
  shared,
  horizon,
  name,
}: {
  windows: BondWindow[];
  shared: SharedWindow[];
  /** The last day on the scale; three years from today when the API didn't say. */
  horizon?: string;
  name: string;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [picked, setPicked] = useState(0);

  const { from, to, years } = useMemo(() => {
    const now = new Date();
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const end = horizon ? day(horizon) : start + 3 * 365 * DAY;
    const marks: Array<{ year: number; at: number }> = [];
    for (let y = now.getUTCFullYear() + 1; Date.UTC(y, 0, 1) < end; y++) marks.push({ year: y, at: Date.UTC(y, 0, 1) });
    return { from: start, to: end, years: marks };
  }, [horizon]);

  const pct = (ms: number) => Math.max(0, Math.min(100, ((ms - from) / (to - from)) * 100));
  const span = (start: string, end: string) => {
    const left = pct(day(start));
    return { left: `${left}%`, width: `${Math.max(0, pct(day(end)) - left)}%` };
  };
  const who = (w: BondWindow) => (w.who === "them" ? name : t("bonds.phase.you"));
  const planet = (p: string) => t(`planetNames.${p.toLowerCase()}`);

  const lanes: Array<{ id: "you" | "them"; label: string }> = [
    { id: "you", label: t("bonds.phase.you") },
    { id: "them", label: name },
  ];

  return (
    <Card className="p-4 border-gold/10 space-y-3" data-testid="bond-periods">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("bonds.upcoming.title")}</p>

      {windows.length === 0 ? (
        <p className="text-xs text-muted">{t("bonds.upcoming.none")}</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {/* Year marks */}
            <div className="relative ml-16 h-4 text-[10px] text-muted">
              <span className="absolute left-0">{t("bonds.upcoming.today")}</span>
              {/* A new year that starts within weeks of today would print over the "Today" label. */}
              {years
                .filter((y) => pct(y.at) >= 16)
                .map((y) => (
                  <span key={y.year} className="absolute -translate-x-1/2" style={{ left: `${pct(y.at)}%` }}>
                    {y.year}
                  </span>
                ))}
            </div>
            {lanes.map((lane) => (
              <div key={lane.id} className="flex items-center gap-2">
                <span className="w-14 shrink-0 truncate text-[11px] text-foreground/85">{lane.label}</span>
                <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-gold/5">
                  {years.map((y) => (
                    <span key={y.year} className="absolute inset-y-0 w-px bg-gold/15" style={{ left: `${pct(y.at)}%` }} aria-hidden />
                  ))}
                  {shared.map((s) => (
                    <span
                      key={`${s.start}-${s.tone}`}
                      className="absolute inset-y-0 border-x border-gold/60 bg-gold/15"
                      style={span(s.start, s.end)}
                      aria-hidden
                    />
                  ))}
                  {windows.map((w, i) =>
                    (w.who ?? "you") !== lane.id ? null : (
                      <button
                        key={`${w.start}-${w.tone}-${i}`}
                        type="button"
                        onClick={() => setPicked(i)}
                        aria-pressed={picked === i}
                        aria-label={`${who(w)}: ${t(`bonds.upcoming.${w.tone}`)}, ${shortDateWithYear(w.start, lang)} – ${shortDateWithYear(w.end, lang)}`}
                        data-testid={`period-bar-${lane.id}`}
                        style={span(w.start, w.end)}
                        className={`absolute inset-y-1 min-w-[10px] rounded-md ${TONE_BAR[w.tone]} ${
                          picked === i ? "ring-2 ring-gold ring-offset-1 ring-offset-transparent" : "opacity-80"
                        }`}
                      />
                    ),
                  )}
                </div>
              </div>
            ))}
            <div className="ml-16 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-emerald-500/80" />
                {t("bonds.upcoming.good")}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-amber-500/80" />
                {t("bonds.upcoming.care")}
              </span>
              {shared.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm border border-gold/60 bg-gold/15" />
                  {t("bonds.upcoming.both")}
                </span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted">{t("bonds.upcoming.tap")}</p>

          {/* Every period again as a row, so the bars are never the only way in. */}
          <ul className="space-y-1.5">
            {windows.map((w, i) => {
              const active = picked === i;
              return (
                <li key={`${w.start}-${w.tone}-${i}`} className={`rounded-2xl border transition-colors ${active ? "border-gold/40 bg-gold/5" : "border-gold/10"}`}>
                  <button
                    type="button"
                    onClick={() => setPicked(i)}
                    aria-expanded={active}
                    data-testid="period-row"
                    className="flex w-full items-start gap-2 px-3 py-2 text-left"
                  >
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_BAR[w.tone]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-foreground/90">
                        {who(w)} · {t(`bonds.upcoming.${w.tone}`)}
                      </span>
                      <span className="block text-xs text-muted">
                        {shortDateWithYear(w.start, lang)} – {shortDateWithYear(w.end, lang)}
                      </span>
                    </span>
                  </button>
                  {active && (
                    <div className="space-y-2 px-3 pb-3 pl-8" data-testid="period-detail">
                      <div className="flex items-center gap-1.5 text-xs text-foreground/85">
                        <PlanetIcon planet={w.lords[0].toLowerCase()} size={18} />
                        <PlanetIcon planet={w.lords[1].toLowerCase()} size={18} />
                        <span>{t("bonds.upcoming.lords", { maha: planet(w.lords[0]), antar: planet(w.lords[1]) })}</span>
                      </div>
                      {w.why.length > 0 && <FactorList factors={w.why} extra={{ name }} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {shared.length > 0 && (
            <ul className="space-y-1 border-t border-gold/10 pt-2">
              {shared.map((s) => (
                <li key={`${s.start}-${s.tone}`} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground/85">{t(s.tone === "good" ? "bonds.upcoming.bothGood" : "bonds.upcoming.bothCare")}</span>
                  <span className="shrink-0 text-muted">
                    {shortDateWithYear(s.start, lang)} – {shortDateWithYear(s.end, lang)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
