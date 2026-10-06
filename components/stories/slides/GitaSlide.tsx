"use client";

import { useTranslation } from "react-i18next";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import { CATEGORY_GLOSS, TAG_GLOSS } from "@/lib/gita";
import { STORY_CAPS, StorySkeleton, StoryUnavailable, type StoryMode } from "../StoryFrame";

/**
 * The Gita verse of the day. The Gita content is Sanskrit only (see
 * lib/gita.ts), so the story shows the verse, the yoga it belongs to and the
 * needs it speaks to, the same way the Gita page does; there is no
 * translation to show.
 */
export default function GitaSlide({ data }: { data: DailyStoriesData; mode: StoryMode }) {
  const { t } = useTranslation();

  if (data.verseState === "loading") return <StorySkeleton />;
  const verse = data.verse;
  if (!verse) return <StoryUnavailable message={t("stories.unavailable")} />;

  const gloss = CATEGORY_GLOSS[verse.mainCategory];
  // The source separates the padas with blank lines; one line each reads better at this size.
  const lines = verse.sanskrit
    .split("\n")
    .filter((line) => line.trim())
    .join("\n");

  return (
    <div className="flex flex-col items-center text-center" data-testid="story-gita">
      <p className="flex items-center gap-2.5">
        <span className={`font-display text-sm ${STORY_CAPS}`} style={{ color: "var(--story-accent)" }}>
          {t("stories.names.gita")}
        </span>
        <span
          className="rounded-full border px-2.5 py-0.5 font-display text-sm"
          style={{ color: "var(--story-accent)", borderColor: "var(--story-accent)" }}
        >
          {verse.chapter}.{verse.verse}
        </span>
      </p>
      <p className="mt-2 text-xs text-white/60">
        <span className="font-devanagari">{verse.mainCategory}</span>
        {gloss && ` · ${gloss}`}
      </p>

      <div className="mt-6 flex w-full items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-white/15" />
        <span className="font-devanagari text-lg" style={{ color: "var(--story-accent)" }}>
          ॐ
        </span>
        <span className="h-px flex-1 bg-white/15" />
      </div>

      <p className="mt-6 whitespace-pre-line font-devanagari text-[1.35rem] leading-[2.1] text-white">{lines}</p>

      <div className="mt-6 flex w-full items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-white/15" />
        <span className="h-1.5 w-1.5 rotate-45" style={{ background: "var(--story-accent)" }} />
        <span className="h-px flex-1 bg-white/15" />
      </div>

      {verse.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          <span className={`text-[10px] font-semibold text-white/55 ${STORY_CAPS}`}>{t("stories.gita.forNeeds")}</span>
          {verse.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white">
              <span className="font-devanagari">{TAG_GLOSS[tag] ?? tag}</span>
              <span className="text-white/55"> · {tag}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
