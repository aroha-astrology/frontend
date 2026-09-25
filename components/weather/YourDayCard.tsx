"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { useAstroWeather } from "@/hooks/useAstroWeather";
import { formatClock, istClock, upcomingWindows } from "@/lib/weather-format";
import { DayTimeline, MomentLine } from "./WeatherBits";

/**
 * Panchang's "Your Day": today's good and caution windows from sunrise to
 * midnight, in a list that scrolls and opens on the window you're in. Ships
 * off (`home.yourDay`, a key kept from when this card lived on Home).
 */
export default function YourDayCard() {
  const { t, i18n } = useTranslation();
  const { enabled } = useNewFeature("home.yourDay");
  const weather = useAstroWeather(enabled);
  const [now, setNow] = useState(() => new Date());
  const listRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  const day = weather.status === "ready" ? weather.data.day : null;

  // Keeps "Now" and the highlight moving while the page stays open.
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  // Opens the list on the window you're in (the end, once the day's over);
  // after that the scroll is yours.
  useEffect(() => {
    const list = listRef.current;
    if (!day || !list || opened.current) return;
    opened.current = true;
    const ist = istClock(new Date());
    const next = day.findIndex((w) => w.end > ist);
    const row = list.querySelectorAll("li")[next === -1 ? day.length - 1 : next];
    if (row) list.scrollTop = row.offsetTop;
  }, [day]);

  if (!enabled || weather.status !== "ready") return null;

  const w = weather.data;
  const over = w.dayAvailable && w.day.length > 0 && upcomingWindows(w.day, now).length === 0;

  return (
    <Card className="p-5 border-gold/15">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
          <Clock3 size={14} />
          {t("weather.day.title")}
        </p>
        <p className="text-[11px] tabular-nums text-foreground/80">
          {t("weather.day.nowAt", { time: formatClock(istClock(now), i18n.language) })}
        </p>
      </div>
      {over && <p className="mb-2 text-xs text-muted">{t("weather.day.over")}</p>}
      <div
        ref={listRef}
        role="region"
        aria-label={t("weather.day.title")}
        tabIndex={0}
        className="relative max-h-48 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
      >
        <DayTimeline weather={w} now={now} />
      </div>
      {w.moments.length > 0 && (
        <div className="mt-3 space-y-1">
          {w.moments.map((m) => (
            <MomentLine key={m.at + m.kind} moment={m} />
          ))}
        </div>
      )}
    </Card>
  );
}
