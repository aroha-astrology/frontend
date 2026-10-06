"use client";

import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import { storyDateLabel } from "@/lib/stories/format";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/stories/share-image";
import type { StoryId } from "@/lib/stories/types";
import StoryFrame from "./StoryFrame";
import { STORY_SLIDES } from "./slides";
import type { StoryMeta } from "./story-meta";

/**
 * The picture that gets shared: the story itself, with the Aroha name on top
 * and where to find the app underneath. It is laid out at 360×640 and drawn at
 * three times that (lib/stories/share-image.ts), so it lands on WhatsApp
 * Status or an Instagram Story as a full 1080×1920 screen.
 *
 * Plain <img> on purpose: the capture inlines whatever is in the DOM, and
 * next/image's lazy loading leaves it nothing to inline.
 */
const ShareCard = forwardRef<HTMLDivElement, { storyId: StoryId; data: DailyStoriesData; meta: StoryMeta }>(
  function ShareCard({ storyId, data, meta }, ref) {
    const { t, i18n } = useTranslation();
    const Slide = STORY_SLIDES[storyId];

    return (
      <div
        ref={ref}
        className="relative overflow-hidden font-body"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        data-testid="story-share-card"
      >
        <StoryFrame mode="card" theme={meta.theme}>
          <Slide data={data} mode="card" />
        </StoryFrame>

        <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 px-5 pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_transparent.png" alt="" className="h-9 w-9" />
          <div className="min-w-0">
            <p className="font-display text-[13px] tracking-[0.2em] text-white">AROHA ASTROLOGY</p>
            <p className="truncate text-[10px] text-white/65">
              {t(`stories.names.${storyId}`)} · {storyDateLabel(data.now, i18n.language)}
            </p>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/40 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{t("stories.card.tagline")}</p>
              <p className="truncate text-[10px] text-white/65">{t("stories.card.getApp")}</p>
            </div>
            <p className="shrink-0 text-xs font-semibold" style={{ color: meta.theme.accent }}>
              arohaastrology.in
            </p>
          </div>
        </div>
      </div>
    );
  },
);

export default ShareCard;
