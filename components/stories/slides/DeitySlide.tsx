"use client";

import { useTranslation } from "react-i18next";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import { IMG_BASE } from "@/lib/shlokas";
import { weekdayName } from "@/lib/why-format";
import { STORY_CAPS, type StoryMode } from "../StoryFrame";

/**
 * The deity of the weekday: Hanuman ji on a Tuesday, Lakshmi on a Friday.
 * The picture is the mantra library's own artwork, which is small, so it is
 * shown as a framed medallion rather than stretched across the screen.
 */
export default function DeitySlide({ data }: { data: DailyStoriesData; mode: StoryMode }) {
  const { t, i18n } = useTranslation();
  const { deity, now } = data;
  const planet = t(`planetNames.${deity.planet.toLowerCase()}`, { defaultValue: deity.planet });

  return (
    <div className="flex flex-col items-center text-center" data-testid="story-deity">
      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-5 rounded-full blur-2xl"
          style={{ background: "radial-gradient(closest-side, rgba(255,190,90,0.55), transparent)" }}
        />
        <div
          className="relative h-44 w-44 rounded-full p-[3px]"
          style={{ background: "linear-gradient(140deg, #FFE7A8, #C98B2B 45%, #7A4A12 70%, #FFD98A)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- drawn into the share picture, which next/image's lazy loading breaks */}
          <img
            src={`${IMG_BASE}${deity.img}`}
            alt=""
            className="h-full w-full rounded-full border-[3px] border-[#2a1206] object-cover object-top"
          />
        </div>
      </div>

      <p className={`mt-6 text-[11px] font-semibold ${STORY_CAPS}`} style={{ color: "var(--story-accent)" }}>
        {weekdayName(now.getDay(), i18n.language)} · {planet}
      </p>
      <h2 className="mt-2 font-display text-[2.5rem] leading-tight text-white">{t(`stories.deity.list.${deity.id}.name`)}</h2>

      <div className="mt-3 flex items-center gap-2" aria-hidden>
        <span className="h-px w-12 bg-white/25" />
        <span className="h-1.5 w-1.5 rotate-45" style={{ background: "var(--story-accent)" }} />
        <span className="h-px w-12 bg-white/25" />
      </div>

      <p className="mt-4 max-w-[19rem] text-[15px] leading-relaxed text-white/85">{t(`stories.deity.list.${deity.id}.line`)}</p>
    </div>
  );
}
