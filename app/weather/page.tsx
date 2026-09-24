"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CloudSun, Lightbulb, ListChecks } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import WhyButton from "@/components/why/WhyButton";
import ListenButton from "@/components/weather/ListenButton";
import { AreaBars, DayTimeline, MomentLine, TrendIcon } from "@/components/weather/WeatherBits";
import { useNewFeature } from "@/hooks/useFeature";
import { useAstroWeather } from "@/hooks/useAstroWeather";
import { useAuth } from "@/providers/auth-provider";
import { api, type PersonalizedHoroscope } from "@/lib/api";
import { listenScript, scoreWordKey } from "@/lib/weather-format";
import { whyFactorText } from "@/lib/why-format";

/** The horoscope category each Astro Weather row takes its advice from. */
const ADVICE_CATEGORY = { career: "career", relationships: "marriage", money: "finance", energy: "health" } as const;

function WeatherPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, activeProfile } = useAuth();
  const { enabled: listenOn } = useNewFeature("home.astroWeatherListen");
  const weather = useAstroWeather(true);
  const [reading, setReading] = useState<PersonalizedHoroscope | null>(null);

  // The advice lines come from today's personal reading, already translated.
  useEffect(() => {
    let cancelled = false;
    api
      .horoscope("daily", i18n.language)
      .then((res) => {
        if (!cancelled && res.status === "ready") setReading(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const name = (activeProfile?.displayName ?? user?.displayName)?.trim().split(/\s+/)[0] ?? null;

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display flex-1 flex items-center gap-2">
            <CloudSun size={18} className="text-gold" />
            {t("weather.title")}
          </h1>
        </div>

        {weather.status !== "ready" ? (
          <p className="py-10 text-center text-sm text-muted">
            {t(weather.status === "notReady" ? "weather.notReady" : weather.status === "error" ? "weather.error" : "weather.loading")}
          </p>
        ) : (
          <>
            <Card className="p-5 border-gold/20">
              {weather.data.header.mahadasha && (
                <p className="text-[11px] text-muted">
                  {t("weather.headerLine", {
                    moonSign: t(`zodiac.signs.${weather.data.header.moonSign.toLowerCase()}`),
                    mahadasha: t(`planetNames.${weather.data.header.mahadasha.toLowerCase()}`),
                  })}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-semibold">
                  {t(`weather.scoreWord.${scoreWordKey(weather.data.overall.score)}`)}
                </span>
                <TrendIcon trend={weather.data.overall.trend} />
              </div>
              <p className="text-xs text-muted">
                {t("weather.trendLine", {
                  today: t(`weather.scoreWord.${scoreWordKey(weather.data.overall.score)}`),
                  trend: t(`weather.trend.${weather.data.overall.trend}`),
                })}
              </p>
              <div className="mt-4">
                <AreaBars areas={weather.data.areas} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {weather.data.areas.map((a) => (
                  <span key={a.key} className="inline-flex items-center gap-1 text-[10px] text-muted">
                    {t(`weather.areas.${a.key}`)}
                    <WhyButton area={a.area} date={weather.data.date} />
                  </span>
                ))}
                {listenOn && <ListenButton text={listenScript(t, weather.data, name, i18n.language)} />}
              </div>
            </Card>

            {weather.data.moments.length > 0 && (
              <Card className="p-5 border-gold/15 space-y-2">
                <p className="text-xs font-semibold text-gold uppercase tracking-wider">{t("weather.moments.title")}</p>
                {weather.data.moments.map((m) => (
                  <MomentLine key={m.at + m.kind} moment={m} />
                ))}
              </Card>
            )}

            <Card className="p-5 border-gold/15">
              <p className="mb-3 text-xs font-semibold text-gold uppercase tracking-wider">{t("weather.day.title")}</p>
              <DayTimeline weather={weather.data} />
            </Card>

            {reading?.structured && (
              <Card className="p-5 border-gold/15 space-y-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-gold uppercase tracking-wider">
                  <ListChecks size={14} />
                  {t("weather.actionsTitle")}
                </p>
                {weather.data.areas.map((a) => {
                  const advice = reading.structured?.categories[ADVICE_CATEGORY[a.key]]?.advice;
                  return advice ? (
                    <div key={a.key}>
                      <p className="text-[11px] font-semibold text-foreground/80">{t(`weather.areas.${a.key}`)}</p>
                      <p className="text-xs text-foreground/85 leading-relaxed">{advice}</p>
                    </div>
                  ) : null;
                })}
              </Card>
            )}

            {weather.data.why.length > 0 && (
              <Card className="p-5 border-gold/15 space-y-2">
                <p className="flex items-center gap-2 text-xs font-semibold text-gold uppercase tracking-wider">
                  <Lightbulb size={14} />
                  {t("weather.whyTitle")}
                </p>
                {weather.data.why.map((f, i) => (
                  <p key={i} className="text-xs text-foreground/85 leading-relaxed">
                    {whyFactorText(t, f, i18n.language)}
                  </p>
                ))}
              </Card>
            )}

            <p className="pb-4 text-center text-[10px] text-muted">{t("weather.guidance")}</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function WeatherRoute() {
  return (
    <NewFeatureGuard featureKey="home.astroWeather">
      <WeatherPage />
    </NewFeatureGuard>
  );
}
