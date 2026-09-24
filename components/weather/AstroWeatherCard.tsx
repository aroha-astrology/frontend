"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, CloudSun } from "lucide-react";
import Card from "@/components/ui/Card";
import WhyButton from "@/components/why/WhyButton";
import { useNewFeature } from "@/hooks/useFeature";
import { useAstroWeather } from "@/hooks/useAstroWeather";
import { useAuth } from "@/providers/auth-provider";
import { listenScript, scoreWordKey } from "@/lib/weather-format";
import ListenButton from "./ListenButton";
import { AreaBars, MomentLine, TrendIcon } from "./WeatherBits";

/**
 * Home's daily view: how today leans overall and where it's heading, four
 * area bars, the day's Moon change, plus "Why?" and a spoken summary.
 * Ships off (`home.astroWeather`).
 */
export default function AstroWeatherCard() {
  const { t, i18n } = useTranslation();
  const { enabled } = useNewFeature("home.astroWeather");
  const { enabled: listenOn } = useNewFeature("home.astroWeatherListen");
  const { user, activeProfile } = useAuth();
  const weather = useAstroWeather(enabled);
  if (!enabled) return null;

  if (weather.status !== "ready") {
    return (
      <Card className="p-5 border-gold/20">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
          <CloudSun size={14} />
          {t("weather.title")}
        </p>
        <p className="mt-3 text-sm text-muted">
          {t(weather.status === "notReady" ? "weather.notReady" : weather.status === "error" ? "weather.error" : "weather.loading")}
        </p>
      </Card>
    );
  }

  const w = weather.data;
  const name = (activeProfile?.displayName ?? user?.displayName)?.trim().split(/\s+/)[0] ?? null;
  const signChange = w.moments.find((m) => m.kind === "moonSign") ?? w.moments[0];

  return (
    <Card className="p-5 border-gold/20 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-28 h-28 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
          <CloudSun size={14} />
          {t("weather.title")}
        </p>
        {w.header.mahadasha && (
          <p className="text-[10px] text-muted truncate">
            {t("weather.headerLine", {
              moonSign: t(`zodiac.signs.${w.header.moonSign.toLowerCase()}`),
              mahadasha: t(`planetNames.${w.header.mahadasha.toLowerCase()}`),
            })}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-lg font-semibold text-foreground">{t(`weather.scoreWord.${scoreWordKey(w.overall.score)}`)}</span>
        <TrendIcon trend={w.overall.trend} />
        <span className="text-xs text-muted">{t(`weather.trend.${w.overall.trend}`)}</span>
      </div>

      <div className="mt-4">
        <AreaBars areas={w.areas} />
      </div>

      {signChange && (
        <div className="mt-4">
          <MomentLine moment={signChange} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <WhyButton area="overall" date={w.date} />
          {listenOn && <ListenButton text={listenScript(t, w, name, i18n.language)} />}
        </div>
        <Link href="/weather" className="flex items-center gap-0.5 text-[11px] font-medium text-gold">
          {t("weather.details")}
          <ChevronRight size={12} />
        </Link>
      </div>
    </Card>
  );
}
