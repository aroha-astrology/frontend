"use client";

import { useTranslation } from "react-i18next";
import type { VarshaYear } from "./types";

/** The Varsha (solar-return) years on one timeline, with a card of start, end, Lagna, Muntha and Year Lord. */
export default function VarshaTimeline({ years, timezone }: { years: VarshaYear[]; timezone: string }) {
  const { t, i18n } = useTranslation();
  const sorted = [...years].sort((a, b) => a.targetYear - b.targetYear);
  if (sorted.length === 0) return null;

  const fmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const spans = sorted.map((y) => Math.max(1, y.endMs - y.startMs));
  const total = spans.reduce((a, b) => a + b, 0);
  const usable = 336 - 3 * (sorted.length - 1);
  let cursor = 12;
  const bars = sorted.map((y, i) => {
    const w = (spans[i] / total) * usable;
    const bar = { year: y.targetYear, x: cursor, w, opacity: sorted.length === 1 ? 0.75 : i === 0 ? 0.35 : 0.75 };
    cursor += w + 3;
    return bar;
  });

  return (
    <div className="flex flex-col gap-3 leading-[1.45]">
      <svg
        viewBox="0 0 360 60"
        className="h-auto w-full"
        role="img"
        aria-label={t("varshik.timeline.label", { defaultValue: "Your two Varsha years" })}
      >
        {bars.map((b) => (
          <g key={b.year}>
            <rect x={b.x} y={24} width={b.w} height={14} rx={7} fill="var(--gold)" opacity={b.opacity} />
            <circle cx={b.x + 7} cy={31} r={7} fill="var(--card)" stroke="var(--gold)" strokeWidth={2} />
            <text x={b.x} y={16} fontSize={12} fill="var(--foreground)" textAnchor="start">
              {b.year}
            </text>
          </g>
        ))}
      </svg>

      <div className="grid gap-3 min-[640px]:grid-cols-2">
        {sorted.map((y) => {
          const rows: [string, string, string][] = [
            ["starts", "Starts", fmt(y.startsAt)],
            ["ends", "Ends", fmt(y.endsAt)],
            ["lagna", "Varsha Lagna", y.lagna],
            ["muntha", "Muntha", `${y.muntha.sign}, ${t("varshik.timeline.house", { defaultValue: "house {{n}}", n: y.muntha.house })}${y.muntha.auspicious ? " ✓" : ""}`],
            ["yearLord", "Year Lord", y.yearLord],
          ];
          return (
            <div
              key={y.targetYear}
              className="flex flex-col gap-1.5 rounded-xl border border-[color:var(--border-faint)] p-3"
              style={{ background: "var(--card)" }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {y.targetYear}
                </span>
                {y.isDayReturn ? (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t("varshik.timeline.dayReturn", { defaultValue: "Solar return by the day" })}
                  </span>
                ) : null}
              </div>
              {rows.map(([key, en, value]) => (
                <div key={key} className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t(`varshik.timeline.${key}`, { defaultValue: en })}
                  </span>
                  <span className="min-w-0 break-words text-right text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
