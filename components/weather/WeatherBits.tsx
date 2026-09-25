"use client";

import { useTranslation } from "react-i18next";
import { Moon, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import type { AstroWeather } from "@/lib/insights-api";
import { formatClock, isNowIn, istClock, scoreWordKey } from "@/lib/weather-format";

/** Shared pieces of the Astro Weather card and page. */

export function TrendIcon({ trend }: { trend: AstroWeather["overall"]["trend"] }) {
  if (trend === "improving") return <TrendingUp size={14} className="text-emerald-400" />;
  if (trend === "declining") return <TrendingDown size={14} className="text-amber-400" />;
  return <ArrowRight size={14} className="text-muted" />;
}

export function AreaBars({ areas }: { areas: AstroWeather["areas"] }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      {areas.map((a) => (
        <div key={a.key} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-foreground/80">{t(`weather.areas.${a.key}`)}</span>
          <div
            className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"
            role="meter"
            aria-label={t(`weather.areas.${a.key}`)}
            aria-valuenow={a.score}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-gold" style={{ width: `${a.score}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right text-[10px] text-muted">
            {t(`weather.scoreWord.${scoreWordKey(a.score)}`)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MomentLine({ moment }: { moment: AstroWeather["moments"][number] }) {
  const { t, i18n } = useTranslation();
  const time = formatClock(moment.time, i18n.language);
  const text =
    moment.kind === "moonSign"
      ? t("weather.moments.moonSign", { sign: t(`zodiac.signs.${moment.to.toLowerCase()}`), time })
      : t("weather.moments.moonNakshatra", { nakshatra: t(`nakshatraNames.${moment.to.toLowerCase()}`), time });
  return (
    <p className="flex items-center gap-2 text-xs text-foreground/85">
      <Moon size={12} className="text-gold shrink-0" />
      {text}
    </p>
  );
}

/**
 * The day's windows. `windows` narrows the list (Your Day passes only what's
 * still to come); windows that have already ended are dimmed.
 */
export function DayTimeline({
  weather,
  windows = weather.day,
  now = new Date(),
}: {
  weather: AstroWeather;
  windows?: AstroWeather["day"];
  now?: Date;
}) {
  const { t, i18n } = useTranslation();
  if (!weather.dayAvailable) return <p className="text-xs text-muted">{t("weather.day.notIndia")}</p>;
  if (weather.day.length === 0) return <p className="text-xs text-muted">{t("weather.day.empty")}</p>;
  const clock = istClock(now);
  return (
    <ul className="space-y-1.5">
      {windows.map((w, i) => {
        const current = isNowIn(w.start, w.end, now);
        const past = w.end <= clock;
        return (
          <li
            key={`${w.start}-${w.name}-${i}`}
            className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${current ? "bg-gold/10 border border-gold/30" : ""} ${past ? "opacity-50" : ""}`}
          >
            <span className="w-[124px] shrink-0 whitespace-nowrap text-[11px] tabular-nums text-foreground/80">
              {formatClock(w.start, i18n.language)} – {formatClock(w.end, i18n.language)}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${w.kind === "good" ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="flex-1 min-w-0 text-xs text-foreground truncate">
              {t(`muhurtaNames.${w.name.charAt(0).toLowerCase()}${w.name.slice(1)}`)} ·{" "}
              <span className="text-muted">{t(`weather.day.${w.kind}`)}</span>
            </span>
            {current && <span className="text-[10px] font-semibold text-gold">{t("weather.day.now")}</span>}
          </li>
        );
      })}
    </ul>
  );
}
