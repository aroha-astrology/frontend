import type { TFunction } from "i18next";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import { pick } from "@/lib/shlokas";
import { formatClock } from "@/lib/stories/format";
import { horaGuideKeys } from "@/lib/stories/hora";
import type { StoryId } from "@/lib/stories/types";
import type { LangCode } from "@/providers/language-provider";
import { storyTheme, type StoryTheme } from "./story-theme";

export interface StoryCta {
  label: string;
  href: string;
}

/** What surrounds a story's content: its colours, its one button, and the words that go out when it is shared. */
export interface StoryMeta {
  theme: StoryTheme;
  /** Null when the page it would open is switched off, or the story has nothing to open yet. */
  cta: StoryCta | null;
  shareText: string;
  /** False while the story's data is still loading or missing: nothing worth sharing yet. */
  shareable: boolean;
}

/** Which of the pages a story links to are switched on for this user. */
export interface StoryLinks {
  panchang: boolean;
  shlokas: boolean;
  gita: boolean;
}

export function buildStoryMeta(id: StoryId, data: DailyStoriesData, t: TFunction, lang: string, links: StoryLinks): StoryMeta {
  switch (id) {
    case "panchang": {
      const p = data.panchang;
      return {
        theme: storyTheme("panchang"),
        cta: links.panchang ? { label: t("stories.panchang.cta"), href: "/panchang" } : null,
        shareText: p?.tithi
          ? t("stories.panchang.shareText", {
              paksha: p.tithi.paksha,
              tithi: p.tithi.name,
              nakshatra: p.nakshatra
                ? t(`nakshatraNames.${p.nakshatra.name.toLowerCase()}`, { defaultValue: p.nakshatra.name })
                : "",
            })
          : t("horoscope.panchang.todayTitle"),
        shareable: !!p?.tithi,
      };
    }
    case "hora": {
      const best = data.hora;
      const guide = best ? horaGuideKeys(best.slot.planet) : null;
      return {
        theme: storyTheme("hora", { planet: best?.slot.planet }),
        cta: links.panchang ? { label: t("stories.hora.cta"), href: "/panchang#hora" } : null,
        shareText:
          best && guide
            ? t("stories.hora.shareText", {
                planet: t(`planetNames.${best.slot.planet.toLowerCase()}`, { defaultValue: best.slot.planet }),
                start: formatClock(best.slot.startTime),
                end: formatClock(best.slot.endTime),
                good: guide.good.map((key) => t(key)).join(", "),
              })
            : t("stories.names.hora"),
        shareable: !!best && !!guide,
      };
    }
    case "deity": {
      const { deity, mantra } = data;
      // "Shiva Dhyana Shloka (Karpura Gauram)" → "Shiva Dhyana Shloka": the button has one short line.
      const mantraName = mantra ? pick(mantra.title, lang as LangCode).split(" (")[0] : "";
      return {
        theme: storyTheme("deity", { deityId: deity.id }),
        cta:
          links.shlokas && mantra
            ? { label: t("stories.deity.cta", { mantra: mantraName }), href: `/shlokas/${deity.slug}` }
            : null,
        shareText: t(`stories.deity.list.${deity.id}.line`),
        shareable: true,
      };
    }
    case "gita": {
      const verse = data.verse;
      const ref = verse ? `${verse.chapter}.${verse.verse}` : "";
      return {
        theme: storyTheme("gita"),
        cta: links.gita && verse ? { label: t("stories.gita.cta"), href: `/gita/${verse.id}` } : null,
        shareText: verse ? `${t("stories.gita.shareText", { ref })}\n${verse.sanskrit}` : t("stories.names.gita"),
        shareable: !!verse,
      };
    }
  }
}
