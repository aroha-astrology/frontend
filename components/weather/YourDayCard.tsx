"use client";

import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { useAstroWeather } from "@/hooks/useAstroWeather";
import { DayTimeline, MomentLine } from "./WeatherBits";

/** Home's "Your Day": today's good and caution windows, with the one you're in highlighted. Ships off (`home.yourDay`). */
export default function YourDayCard() {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("home.yourDay");
  const weather = useAstroWeather(enabled);
  if (!enabled || weather.status !== "ready") return null;

  return (
    <Card className="p-5 border-gold/15">
      <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
        <Clock3 size={14} />
        {t("weather.day.title")}
      </p>
      <DayTimeline weather={weather.data} limit={6} />
      {weather.data.moments.length > 0 && (
        <div className="mt-3 space-y-1">
          {weather.data.moments.map((m) => (
            <MomentLine key={m.at + m.kind} moment={m} />
          ))}
        </div>
      )}
    </Card>
  );
}
