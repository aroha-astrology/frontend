"use client";

import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import { formatClock } from "@/lib/stories/format";
import { horaGuideKeys } from "@/lib/stories/hora";
import { StoryLabel, StorySkeleton, StoryUnavailable, type StoryMode } from "../StoryFrame";

/**
 * The hora worth acting in: the running one when it is auspicious, otherwise
 * the next auspicious one. Says how long is left (or when it starts), and
 * what that planet's hour is good for and what to leave for later.
 */
export default function HoraSlide({ data, mode }: { data: DailyStoriesData; mode: StoryMode }) {
  const { t } = useTranslation();

  if (data.panchangState === "loading") return <StorySkeleton />;
  const best = data.hora;
  const guide = best ? horaGuideKeys(best.slot.planet) : null;
  if (!best || !guide) return <StoryUnavailable message={t("stories.unavailable")} />;

  const { slot, status } = best;
  const planet = t(`planetNames.${slot.planet.toLowerCase()}`, { defaultValue: slot.planet });
  const isLive = status === "live";

  return (
    <div className="flex flex-col" data-testid="story-hora">
      <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
        <span
          className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse" : ""}`}
          style={{ background: isLive ? "#7BE3A8" : "rgba(255,255,255,0.6)" }}
        />
        {isLive
          ? t("stories.hora.live", { minutes: best.minutes })
          : t("stories.hora.upcoming", { time: formatClock(slot.startTime) })}
      </span>

      <h2 className="mt-4 font-display text-[2.6rem] leading-none text-white">
        {slot.isAuspicious ? t("stories.hora.auspicious") : t("stories.hora.caution")}
      </h2>
      <p className="mt-2 text-2xl font-medium" style={{ color: "var(--story-accent)" }}>
        {t("stories.hora.title", { planet })}
      </p>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, best.progress)) * 100)}%`, background: "var(--story-accent)" }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-white/70">
        <span>{formatClock(slot.startTime)}</span>
        <span>{formatClock(slot.endTime)}</span>
      </div>

      {/* The shared picture has less room than a screen; the two lists are what people pass on. */}
      {mode === "view" && <p className="mt-4 text-[15px] leading-relaxed text-white/90">{t(guide.about)}</p>}

      <div className="mt-4 border-t border-white/15 pt-4">
        <StoryLabel>{t("stories.hora.good")}</StoryLabel>
        <ul className="mt-2 space-y-2">
          {guide.good.map((key) => (
            <li key={key} className="flex items-start gap-2.5 text-[15px] leading-snug text-white">
              <Check size={16} className="mt-0.5 shrink-0" style={{ color: "#7BE3A8" }} />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <StoryLabel>{t("stories.hora.avoid")}</StoryLabel>
        <ul className="mt-2 space-y-2">
          {guide.avoid.map((key) => (
            <li key={key} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/85">
              <X size={16} className="mt-0.5 shrink-0" style={{ color: "#FF9C8A" }} />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      {mode === "view" && data.referenceLocation && (
        <p className="mt-3 text-[10px] text-white/40">{t("horoscope.panchang.referenceLocation")}</p>
      )}
    </div>
  );
}
