"use client";

import { useTranslation } from "react-i18next";
import Avatar from "@/components/ui/Avatar";
import StoryRing from "./StoryRing";
import type { StoryPlayer } from "./useStoryPlayer";

/**
 * The Home avatar with its story ring (flag `home.dailyStories`). Tapping it
 * plays today's stories from the first one not yet seen; the ring glows until
 * all four have been opened, and again the next morning. The player itself is
 * owned by the header (useStoryPlayer), which the story pills share.
 */
export default function DailyStoriesAvatar({ name, player }: { name?: string | null; player: StoryPlayer }) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => player.open()}
      aria-label={t("stories.open")}
      data-testid="story-ring-button"
      className="shrink-0 appearance-none rounded-full border-0 bg-transparent p-0"
    >
      <StoryRing unseen={player.anyUnseen}>
        <Avatar name={name} size="md" />
      </StoryRing>
    </button>
  );
}
