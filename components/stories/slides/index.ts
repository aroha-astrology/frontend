import type { ComponentType } from "react";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import type { StoryId } from "@/lib/stories/types";
import type { StoryMode } from "../StoryFrame";
import PanchangSlide from "./PanchangSlide";
import HoraSlide from "./HoraSlide";
import DeitySlide from "./DeitySlide";
import GitaSlide from "./GitaSlide";

/** A story's content. The same component fills the screen ("view") and the shared picture ("card"). */
export type StorySlide = ComponentType<{ data: DailyStoriesData; mode: StoryMode }>;

export const STORY_SLIDES: Record<StoryId, StorySlide> = {
  panchang: PanchangSlide,
  hora: HoraSlide,
  deity: DeitySlide,
  gita: GitaSlide,
};
