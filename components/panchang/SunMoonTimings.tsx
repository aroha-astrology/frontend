"use client";

import { useTranslation } from "react-i18next";
import { Sun, Sunset } from "lucide-react";
import Card from "@/components/ui/Card";
import { getPlanet } from "@/components/3d/planet-registry";
import { durationMinutes, formatDurationHm } from "@/lib/panchang/time-window";

interface SunMoonTimingsProps {
  sunriseTime?: string;
  sunsetTime?: string;
  /** Both moonrise/moonset are legitimately absent some days (the Moon doesn't rise/set within every civil day) — the row only renders when both are present. */
  moonriseTime?: string;
  moonsetTime?: string;
}

/** Small CSS orb built from the shared planet-registry palette — same convention as MoonBackground.tsx's CssOrb, just icon-sized. */
function MoonDot() {
  const v = getPlanet("moon");
  return (
    <span
      className="w-4 h-4 rounded-full inline-block shrink-0"
      style={{
        background: `radial-gradient(circle at 35% 30%, ${v.highlight} 0%, ${v.base} 45%, ${v.shadow} 100%)`,
      }}
    />
  );
}

function TimingRow({
  startIcon,
  startLabel,
  startTime,
  endIcon,
  endLabel,
  endTime,
  durationText,
}: {
  startIcon: React.ReactNode;
  startLabel: string;
  startTime: string;
  endIcon: React.ReactNode;
  endLabel: string;
  endTime: string;
  durationText: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center gap-1 shrink-0 w-16">
        {startIcon}
        <p className="text-[9px] text-muted uppercase tracking-wider">{startLabel}</p>
        <p className="text-xs font-semibold text-foreground">{startTime}</p>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1 px-1 min-w-0">
        <div className="w-full border-t border-dashed border-gold/25" />
        <p className="text-[10px] text-muted whitespace-nowrap">{durationText}</p>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0 w-16">
        {endIcon}
        <p className="text-[9px] text-muted uppercase tracking-wider">{endLabel}</p>
        <p className="text-xs font-semibold text-foreground">{endTime}</p>
      </div>
    </div>
  );
}

/** Sunrise/sunset and (when available) moonrise/moonset, each as a connected pair with the elapsed duration shown between them. */
export default function SunMoonTimings({
  sunriseTime,
  sunsetTime,
  moonriseTime,
  moonsetTime,
}: SunMoonTimingsProps) {
  const { t } = useTranslation();

  if (!sunriseTime && !sunsetTime) return null;

  const showMoonRow = !!moonriseTime && !!moonsetTime;

  return (
    <Card className="p-4 border-gold/10 space-y-4">
      {sunriseTime && sunsetTime && (
        <TimingRow
          startIcon={<Sun size={16} className="text-gold" />}
          startLabel={t("horoscope.panchang.sunrise")}
          startTime={sunriseTime}
          endIcon={<Sunset size={16} className="text-gold" />}
          endLabel={t("horoscope.panchang.sunset")}
          endTime={sunsetTime}
          durationText={formatDurationHm(durationMinutes(sunriseTime, sunsetTime))}
        />
      )}
      {showMoonRow && (
        <TimingRow
          startIcon={<MoonDot />}
          startLabel={t("horoscope.panchang.moonrise")}
          startTime={moonriseTime!}
          endIcon={<MoonDot />}
          endLabel={t("horoscope.panchang.moonset")}
          endTime={moonsetTime!}
          durationText={formatDurationHm(durationMinutes(moonriseTime!, moonsetTime!))}
        />
      )}
    </Card>
  );
}
