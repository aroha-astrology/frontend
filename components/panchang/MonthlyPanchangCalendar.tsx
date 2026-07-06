"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, type PanchangMonthDay } from "@/lib/api";
import Card from "@/components/ui/Card";
import { getFestivalsForDate } from "@/lib/panchang/hindu-festivals";
import { findAdhikMaas } from "@/lib/panchang/adhik-maas-ranges";

interface MonthlyPanchangCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  lat?: number;
  lon?: number;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MonthlyPanchangCalendar({
  selectedDate,
  onSelectDate,
  lat,
  lon,
}: MonthlyPanchangCalendarProps) {
  const { t } = useTranslation();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = selectedDate.split("-").map(Number);
    return { year: y, month: m }; // month is 1-12
  });
  const [days, setDays] = useState<PanchangMonthDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .panchangMonth(cursor.year, cursor.month, lat, lon)
      .then((res) => {
        if (!cancelled) setDays(res.days);
      })
      .catch(() => {
        if (!cancelled) setDays(null);
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
          <button onClick={goToday} className="px-2 py-1 rounded-lg text-[10px] font-semibold text-gold hover:bg-gold/10">
            {monthLabel}
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
        {WEEKDAY_LABELS.map((w, i) => (
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
              {festivals.length > 0 ? (
                <span className="text-[9px]">{festivals[0].emoji}</span>
              ) : cell.isFullMoon ? (
                <span className="text-[9px]">🌕</span>
              ) : cell.isNewMoon ? (
                <span className="text-[9px]">🌑</span>
              ) : cell.isEkadashi ? (
                <span className="text-[9px]">🪷</span>
              ) : null}
            </button>
          );
        })}
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
                (d.isFullMoon ? "Purnima" : d.isNewMoon ? "Amavasya" : d.isEkadashi ? "Ekadashi" : d.tithiName);
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
