"use client";

import { BookOpen, CalendarDays, Clock, Flower2, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { STORY_IDS, type StoryId } from "@/lib/stories/types";
import type { StoryPlayer } from "./useStoryPlayer";

const ICONS: Record<StoryId, LucideIcon> = {
  panchang: CalendarDays,
  hora: Clock,
  deity: Flower2,
  gita: BookOpen,
};

/** The same saffron-gold-rose sweep as the avatar ring, drawn once as a pill border (no motion: these are small). */
const UNSEEN_BORDER = "linear-gradient(120deg, #FF8A3D, #F4D675, #FF5E8A)";

/**
 * Today's stories as a row of small pills under the greeting. One tap plays that
 * story; a pill has a bright border until it has been opened today and a quiet gold one after.
 */
export default function DailyStoryPills({ player }: { player: StoryPlayer }) {
  const { t } = useTranslation();

  return (
    <ul className="mt-1 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={t("stories.open")} data-testid="story-pills">
      {STORY_IDS.map((id) => {
        const Icon = ICONS[id];
        const fresh = player.seen !== null && !player.seen.includes(id);
        return (
          <li key={id} className="shrink-0">
            <button
              type="button"
              onClick={() => player.open(id)}
              data-testid={`story-pill-${id}`}
              data-unseen={fresh ? "true" : "false"}
              className="appearance-none rounded-full border-0 p-[1.5px]"
              style={{ background: fresh ? UNSEEN_BORDER : "rgba(212,175,55,0.35)" }}
            >
              <span className="flex items-center gap-0.5 whitespace-nowrap rounded-full bg-background px-1.5 py-px text-[10px] font-medium leading-4 text-foreground">
                <Icon size={10} className="text-gold" aria-hidden />
                {t(`stories.names.${id}`)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
