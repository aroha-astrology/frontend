"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useDailyStories } from "@/hooks/useDailyStories";
import { reportStoryEvent } from "@/lib/stories/report";
import { hasUnseen, localDayIso, markSeen, readSeen } from "@/lib/stories/seen";
import { STORY_IDS, type StoryId } from "@/lib/stories/types";
import StoryViewer from "./StoryViewer";

export interface StoryPlayer {
  /** Null until localStorage has been read on the client. */
  seen: string[] | null;
  /** True once the client knows at least one of today's stories is unopened. */
  anyUnseen: boolean;
  /** Plays the stories: from `id` when given, otherwise from the first one not yet seen. */
  open: (id?: StoryId) => void;
  /** The full-screen player. Render it once, anywhere. */
  viewer: ReactNode;
}

/**
 * Owns the Daily Stories player for the Home header: the avatar ring and the small
 * story pills both open it, so they share one viewer and one "seen today" list.
 * `enabled` is the feature flag: with it off nothing is requested. `onOpen` tells the header a tap happened, so it can put the one-time hint away.
 */
export function useStoryPlayer(enabled: boolean, onOpen?: () => void): StoryPlayer {
  const [isOpen, setOpen] = useState(false);
  const [from, setFrom] = useState<StoryId | null>(null);
  const data = useDailyStories(enabled, isOpen);
  // Null until localStorage has been read on the client: the server can't know, and guessing "unseen"
  // would flash the glow at someone who has already watched everything.
  const [seen, setSeen] = useState<string[] | null>(null);

  useEffect(() => setSeen(readSeen(data.day)), [data.day]);

  const onSeen = useCallback((id: StoryId) => {
    const day = localDayIso(new Date());
    // The admin dashboard counts a story once per person per day: report the first opening only.
    if (!readSeen(day).includes(id)) reportStoryEvent("view", id);
    setSeen(markSeen(day, id));
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    setFrom(null);
  }, []);
  const open = useCallback(
    (id?: StoryId) => {
      setFrom(id ?? null);
      setOpen(true);
      onOpen?.();
    },
    [onOpen],
  );

  // With everything seen, a tap on the avatar replays from the start.
  const firstUnseen = STORY_IDS.findIndex((id) => !seen?.includes(id));
  const startIndex = from ? STORY_IDS.indexOf(from) : Math.max(0, firstUnseen);

  return {
    seen,
    anyUnseen: seen !== null && hasUnseen(seen, STORY_IDS),
    open,
    viewer: <StoryViewer open={isOpen} startIndex={startIndex} data={data} onClose={close} onSeen={onSeen} />,
  };
}
