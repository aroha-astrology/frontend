"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ChoghadiyaSlot } from "@/lib/api";
import { durationMinutes, isCurrentlyActive } from "@/lib/panchang/time-window";

/**
 * Same good/bad/neutral -> emerald/red/gold mapping the original page's
 * Choghadiya block used for the period-name text (see the removed
 * `p.type === "good" ? "text-emerald-400" : ...` in app/panchang/page.tsx's
 * pre-redesign version) — extended here to also tint each pill's
 * background/border, since this timeline needs the type visible on the
 * pill itself rather than a shared neutral card background.
 */
const TYPE_STYLES: Record<ChoghadiyaSlot["type"], { bg: string; border: string; text: string }> = {
  good: { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400" },
  bad: { bg: "bg-red-500/10", border: "border-red-500/25", text: "text-red-400" },
  neutral: { bg: "bg-gold/10", border: "border-gold/25", text: "text-gold" },
};

/** Tall enough that all 16 (roughly equal-duration) periods stay comfortably tappable/readable. */
const RAIL_HEIGHT_PX = 560;

interface ChoghadiyaTimelineProps {
  day: ChoghadiyaSlot[];
  night: ChoghadiyaSlot[];
}

interface LaidOutPeriod {
  slot: ChoghadiyaSlot;
  topPct: number;
  heightPct: number;
}

/**
 * Positions periods along a single continuous rail by cumulative duration
 * (not raw clock-time percent) — day+night together always sum to exactly
 * 24h by construction (see jyotish-backend's calculateChoghadiya:
 * nightDuration = 24*60 - dayDuration), so "cumulative offset / total" is a
 * full, gap-free day cycle running sunrise -> next sunrise. This sidesteps
 * needing to detect/split periods that cross midnight (several of the later
 * night periods do) — cumulative-by-duration positioning handles that for
 * free, unlike positioning by raw wall-clock percent would.
 */
function layOut(periods: ChoghadiyaSlot[]): LaidOutPeriod[] {
  const durations = periods.map((p) => durationMinutes(p.startTime, p.endTime));
  const totalMinutes = durations.reduce((a, b) => a + b, 0) || 1;
  let offset = 0;
  return periods.map((slot, i) => {
    const topPct = (offset / totalMinutes) * 100;
    const heightPct = (durations[i] / totalMinutes) * 100;
    offset += durations[i];
    return { slot, topPct, heightPct };
  });
}

/**
 * Day + night Choghadiya periods on one continuous vertical rail (replaces
 * the old collapsed two-column accordion). A period is "active" via the
 * same isCurrentlyActive check the rest of the app already uses for
 * Hora/Choghadiya highlighting (see lib/panchang/time-window.ts) — periods
 * before it in chronological order render dimmed (already passed today),
 * the active one is ring-highlighted with a small NOW badge, and periods
 * after it render at full opacity (still upcoming).
 */
export default function ChoghadiyaTimeline({ day, night }: ChoghadiyaTimelineProps) {
  const { t } = useTranslation();
  const periods = useMemo(() => [...day, ...night], [day, night]);
  const laid = useMemo(() => layOut(periods), [periods]);
  const activeIndex = useMemo(
    () => periods.findIndex((p) => isCurrentlyActive(p.startTime, p.endTime)),
    [periods],
  );

  if (periods.length === 0) return null;

  const sunsetTime = day[day.length - 1]?.endTime;
  const dividerTopPct = laid[day.length]?.topPct;

  return (
    <div className="relative mt-2" style={{ height: RAIL_HEIGHT_PX }}>
      {/* Day/night divider, drawn at the actual sunset boundary rather than a fixed midpoint. */}
      {day.length > 0 && night.length > 0 && dividerTopPct !== undefined && (
        <div
          className="absolute left-0 right-0 border-t border-dashed border-gold/20 flex justify-center z-10"
          style={{ top: `${dividerTopPct}%` }}
        >
          {sunsetTime && (
            <span className="-translate-y-1/2 bg-background px-2 text-[9px] text-muted uppercase tracking-wider">
              {sunsetTime}
            </span>
          )}
        </div>
      )}

      {laid.map(({ slot, topPct, heightPct }, i) => {
        const style = TYPE_STYLES[slot.type];
        const active = i === activeIndex;
        const past = activeIndex !== -1 && i < activeIndex;
        return (
          <div
            key={`${slot.name}-${slot.startTime}-${i}`}
            className={`absolute left-0 right-0 rounded-lg border flex items-center justify-between gap-2 px-3 transition-opacity ${
              style.bg
            } ${active ? "ring-2 ring-gold/60 border-transparent" : style.border} ${past ? "opacity-40" : ""}`}
            style={{ top: `${topPct}%`, height: `calc(${heightPct}% - 3px)` }}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              {active && (
                <span className="shrink-0 text-[8px] font-bold text-gold bg-gold/20 rounded px-1 py-0.5 tracking-wider">
                  {t("horoscope.panchang.now")}
                </span>
              )}
              <span className={`text-[10px] font-medium truncate ${style.text}`}>{slot.name}</span>
            </span>
            <span className="shrink-0 text-[10px] text-muted font-mono">
              {slot.startTime} – {slot.endTime}
            </span>
          </div>
        );
      })}
    </div>
  );
}
