"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Avatar from "@/components/ui/Avatar";
import { useDailyStories } from "@/hooks/useDailyStories";
import { hasUnseen, localDayIso, markSeen, readSeen } from "@/lib/stories/seen";
import { STORY_IDS, type StoryId } from "@/lib/stories/types";
import StoryRing from "./StoryRing";
import StoryViewer from "./StoryViewer";

/**
 * The Home avatar with its story ring (flag `home.dailyStories`). Tapping it
 * plays today's stories from the first one not yet seen; the ring glows until
 * all four have been opened, and again the next morning.
 */
export default function DailyStoriesAvatar({ name }: { name?: string | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const data = useDailyStories(true, open);
  // Null until localStorage has been read on the client: the server can't know, and guessing "unseen"
  // would flash the glow at someone who has already watched everything.
  const [seen, setSeen] = useState<string[] | null>(null);

  useEffect(() => setSeen(readSeen(data.day)), [data.day]);

  const onSeen = useCallback((id: StoryId) => setSeen(markSeen(localDayIso(new Date()), id)), []);
  const close = useCallback(() => setOpen(false), []);

  const firstUnseen = STORY_IDS.findIndex((id) => !seen?.includes(id));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("stories.open")}
        data-testid="story-ring-button"
        className="shrink-0 appearance-none rounded-full border-0 bg-transparent p-0"
      >
        <StoryRing unseen={seen !== null && hasUnseen(seen, STORY_IDS)}>
          <Avatar name={name} size="md" />
        </StoryRing>
      </button>
      {/* With everything seen, a tap replays from the start. */}
      <StoryViewer open={open} startIndex={Math.max(0, firstUnseen)} data={data} onClose={close} onSeen={onSeen} />
    </>
  );
}
