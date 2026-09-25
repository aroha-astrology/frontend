"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Clock3 } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { useAstroWeather } from "@/hooks/useAstroWeather";
import { formatClock, istClock, upcomingWindows } from "@/lib/weather-format";
import { DayTimeline, MomentLine } from "./WeatherBits";

/** Windows shown before "Show full day": the one you're in, then what's next. */
const COLLAPSED = 3;

/**
 * Panchang's "Your Day": today's good and caution windows, starting from the
 * one you're in right now, with the whole day one tap away. Ships off
 * (`home.yourDay`, a key kept from when this card lived on Home).
 */
export default function YourDayCard() {
  const { t, i18n } = useTranslation();
  const { enabled } = useNewFeature("home.yourDay");
  const weather = useAstroWeather(enabled);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Keeps "Now" and the list moving while the page stays open.
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled || weather.status !== "ready") return null;

  const w = weather.data;
  const upcoming = upcomingWindows(w.day, now);
  const shown = expanded ? w.day : upcoming.slice(0, COLLAPSED);
  const canExpand = w.dayAvailable && w.day.length > shown.length;

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
      {w.dayAvailable && w.day.length > 0 && upcoming.length === 0 && !expanded ? (
        <p className="text-xs text-muted">{t("weather.day.over")}</p>
      ) : (
        <DayTimeline weather={w} windows={shown} now={now} />
      )}
      {(canExpand || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-gold"
        >
          {t(expanded ? "weather.day.showLess" : "weather.day.showAll")}
          <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
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
