"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, type PanchangMonthDay, type PanchangRegionalMonth } from "@/lib/api";
import Card from "@/components/ui/Card";
import { getFestivalsForDate } from "@/lib/panchang/hindu-festivals";
import { findAdhikMaas } from "@/lib/panchang/adhik-maas-ranges";
import { buildKey, cacheGet, cacheSet, roundCoord } from "@/lib/cache";
import { tithiPakshaDayNumber, type RegionId } from "@/lib/panchang/regions";

/** A calendar month's per-day panchang summaries are immutable once computed — cache for a fixed, generous window (see app/panchang/page.tsx for the sibling single-day endpoint's identical reasoning). Version bumped whenever this response's shape grows — e.g. v2 added the whole-month regionalMonths label, v3 added per-day regionalMonths (needed for the grid's dayOfMonth) — without a bump, a pre-existing cached entry from before that change would keep being served (same key) missing the new data, forever. */
const PANCHANG_MONTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface MonthlyPanchangCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  lat?: number;
  lon?: number;
  /** Which regional lunar/solar calendar convention to show alongside the Gregorian month — see hooks/usePanchangRegion.ts (defaults from app language, user-overridable via RegionPicker on the Panchang page). */
  region: RegionId;
}

interface PanchangMonthCache {
  days: PanchangMonthDay[];
  regionalMonths: Record<RegionId, PanchangRegionalMonth> | null;
}

export default function MonthlyPanchangCalendar({
  selectedDate,
  onSelectDate,
  lat,
  lon,
  region,
}: MonthlyPanchangCalendarProps) {
  const { t } = useTranslation();
  const weekdayLabels = t("horoscope.panchang.weekdayShort", { returnObjects: true }) as string[];
  const [cursor, setCursor] = useState(() => {
    const [y, m] = selectedDate.split("-").map(Number);
    return { year: y, month: m }; // month is 1-12
  });
  const [days, setDays] = useState<PanchangMonthDay[] | null>(null);
  const [regionalMonths, setRegionalMonths] = useState<Record<RegionId, PanchangRegionalMonth> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Hard cache (see lib/cache.ts): fixed TTL regardless of which month is
    // shown — every day in a requested month is immutable once computed.
    const cacheKey = buildKey(
      "panchangMonth",
      "v3",
      cursor.year,
      cursor.month,
      lat != null ? roundCoord(lat) : undefined,
      lon != null ? roundCoord(lon) : undefined,
    );
    const cached = cacheGet<PanchangMonthCache>(cacheKey);
    if (cached) {
      setDays(cached.days);
      setRegionalMonths(cached.regionalMonths);
      setLoading(false);
      return;
    }

    api
      .panchangMonth(cursor.year, cursor.month, lat, lon)
      .then((res) => {
        if (!cancelled) {
          const entry: PanchangMonthCache = {
            days: res.days,
            regionalMonths: (res.regionalMonths as Record<RegionId, PanchangRegionalMonth>) ?? null,
          };
          setDays(entry.days);
          setRegionalMonths(entry.regionalMonths);
          cacheSet(cacheKey, entry, Date.now() + PANCHANG_MONTH_TTL_MS);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDays(null);
          setRegionalMonths(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cursor.year, cursor.month, lat, lon]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
    const leading: (PanchangMonthDay | null)[] = Array.from({ length: firstWeekday }, () => null);
    const dayCells = days ?? [];
    const totalCells = leading.length + dayCells.length;
    const trailing: (PanchangMonthDay | null)[] = Array.from({ length: (7 - (totalCells % 7)) % 7 }, () => null);
    return [...leading, ...dayCells, ...trailing];
  }, [cursor, days]);

  const keyDates = useMemo(() => {
    if (!days) return [];
    return days.filter(
      (d) => d.isFullMoon || d.isNewMoon || d.isEkadashi || getFestivalsForDate(d.isoDate).length > 0,
    );
  }, [days]);

  function goToMonth(delta: number) {
    setCursor((c) => {
      let month = c.month + delta;
      let year = c.year;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return { year, month };
    });
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() + 1 });
    onSelectDate(now.toISOString().slice(0, 10));
  }

  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const regionalMonth = regionalMonths?.[region];
  const regionalLabel = regionalMonth ? `${regionalMonth.monthName} ${regionalMonth.year}` : null;

  return (
    <Card className="p-4 border-gold/10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-display text-foreground">{t("horoscope.panchang.monthlyCalendarTitle")}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToMonth(-1)}
            className="p-1.5 rounded-lg hover:bg-gold/10 text-muted"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={goToday}
            className="px-2 py-1 rounded-lg text-[10px] font-semibold text-gold hover:bg-gold/10 flex flex-col items-center leading-tight"
          >
            <span>{monthLabel}</span>
            {regionalLabel && <span className="text-emerald-400">{regionalLabel}</span>}
          </button>
          <button
            onClick={() => goToMonth(1)}
            className="p-1.5 rounded-lg hover:bg-gold/10 text-muted"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdayLabels.map((w, i) => (
          <p key={i} className="text-center text-[9px] text-muted uppercase">
            {w}
          </p>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1 ${loading ? "opacity-50" : ""}`}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const festivals = getFestivalsForDate(cell.isoDate);
          const adhik = findAdhikMaas(cell.isoDate);
          const isSelected = cell.isoDate === selectedDate;
          const isShukla = cell.paksha === "Shukla";
          return (
            <button
              key={cell.isoDate}
              onClick={() => onSelectDate(cell.isoDate)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                isSelected
                  ? "bg-gold text-[#1a0e00] font-semibold"
                  : adhik
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : festivals.length > 0
                      ? "bg-amber-500/10 text-foreground border border-amber-500/25"
                      : isShukla
                        ? "bg-surface/60 text-foreground"
                        : "bg-surface/30 text-muted"
              }`}
            >
              <span>{cell.day}</span>
              <span className={`text-[8px] leading-none ${isSelected ? "text-[#1a0e00]/70" : "text-emerald-400"}`}>
                {(() => {
                  // Solar (day-of-solar-month, approx) and fixed_solar
                  // (Nanakshahi, exact) regions carry their own dayOfMonth on
                  // THIS day's regional snapshot — genuinely region-specific,
                  // so it changes when the picker changes region. Lunisolar
                  // regions (purnimanta/amanta) have no separate day-of-month
                  // concept; their "date" is the tithi, which is the same
                  // across every lunisolar region (only the month NAME
                  // differs, shown in the header above) — not a bug.
                  const regionalDay = cell.regionalMonths?.[region]?.dayOfMonth;
                  if (regionalDay != null) return regionalDay;
                  return tithiPakshaDayNumber(cell.tithiNumber, cell.paksha);
                })()}
              </span>
              {(() => {
                // Every marker shown here must use the SAME symbol as its legend
                // entry below — festivals carry their own specific emoji in data
                // (e.g. Raksha Bandhan is 🪢), so the grid uses a generic ✨ for
                // "festival" instead, matching the legend exactly. A day can
                // satisfy more than one of these at once (e.g. a festival that
                // also falls on Ekadashi, or any marker inside an Adhik Maas
                // month), so all that apply are shown, not just the first.
                const icons: { symbol: string; dimmed?: boolean }[] = [];
                if (festivals.length > 0) icons.push({ symbol: "✨" });
                if (cell.isFullMoon) icons.push({ symbol: "🌕" });
                if (cell.isNewMoon) icons.push({ symbol: "🌑" });
                if (cell.isEkadashi) icons.push({ symbol: "🪷" });
                if (adhik) icons.push({ symbol: "🚫", dimmed: true });
                if (icons.length === 0) return null;
                return (
                  <span className="flex items-center gap-0.5 leading-none">
                    {icons.map((icon, idx) => (
                      <span key={idx} className={`text-[9px] ${icon.dimmed ? "opacity-70" : ""}`}>
                        {icon.symbol}
                      </span>
                    ))}
                  </span>
                );
              })()}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[9px] text-muted justify-center border-t border-gold/10 pt-3">
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> {t("horoscope.panchang.legend.regionalDate")}</div>
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-red-500/20 border border-red-500/40" /> {t("horoscope.panchang.legend.adhikMaas")}</div>
         <div className="flex items-center gap-1.5"><span>🌕</span> {t("horoscope.panchang.legend.purnima")}</div>
         <div className="flex items-center gap-1.5"><span>🌑</span> {t("horoscope.panchang.legend.amavasya")}</div>
         <div className="flex items-center gap-1.5"><span>🪷</span> {t("horoscope.panchang.legend.ekadashi")}</div>
         <div className="flex items-center gap-1.5"><span>✨</span> {t("horoscope.panchang.legend.festival")}</div>
      </div>

      {keyDates.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gold/10">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-2">
            {t("horoscope.panchang.keyDatesThisMonth")}
          </p>
          <div className="space-y-1.5">
            {keyDates.map((d) => {
              const festivals = getFestivalsForDate(d.isoDate);
              const label =
                festivals[0]?.name ??
                (d.isFullMoon
                  ? t("horoscope.panchang.legend.purnima")
                  : d.isNewMoon
                    ? t("horoscope.panchang.legend.amavasya")
                    : d.isEkadashi
                      ? t("horoscope.panchang.legend.ekadashi")
                      : d.tithiName);
              return (
                <button
                  key={d.isoDate}
                  onClick={() => onSelectDate(d.isoDate)}
                  className="w-full flex items-center justify-between text-[11px] px-2 py-1 rounded-lg hover:bg-gold/5"
                >
                  <span className="text-muted">
                    {d.isoDate.slice(8, 10)} · {label}
                  </span>
                  <span className="text-foreground">{d.vara}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
