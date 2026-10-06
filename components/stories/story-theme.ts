import type { HoraPlanet, StoryId } from "@/lib/stories/types";

/**
 * A story's colours. Stories are always dark, whatever the app theme: they are
 * full-screen pictures (and get shared as pictures), so they carry their own
 * fixed palette instead of the theme's `--background` / `--card` tokens.
 */
export interface StoryTheme {
  /** CSS `background` of the whole frame. */
  background: string;
  /** Headline and highlight colour. */
  accent: string;
  /** The soft light behind the top of the story, an rgba of the accent. */
  glow: string;
  /** Optional full-bleed artwork under public/stories/ (see STORY_ART). */
  art?: string;
}

const GOLD = "#F4D675";

const PANCHANG: StoryTheme = {
  background: "radial-gradient(120% 75% at 50% 0%, #2c2166 0%, #150f38 46%, #07051a 100%)",
  accent: GOLD,
  glow: "rgba(190,170,255,0.28)",
};

const DEITY: StoryTheme = {
  background: "radial-gradient(115% 70% at 50% 12%, #8f3f0d 0%, #421807 48%, #0e0503 100%)",
  accent: "#FFD98A",
  glow: "rgba(255,170,70,0.38)",
};

const GITA: StoryTheme = {
  background: "linear-gradient(180deg, #0c1d38 0%, #091226 52%, #1c1409 100%)",
  accent: "#E8C877",
  glow: "rgba(120,170,255,0.22)",
};

/** One palette per hora ruler, in the planet's own traditional colour. */
const HORA: Record<HoraPlanet, StoryTheme> = {
  Sun: { background: "linear-gradient(165deg, #8a4407 0%, #421e05 55%, #140a03 100%)", accent: "#FFC766", glow: "rgba(255,170,60,0.4)" },
  Moon: { background: "linear-gradient(165deg, #2b4878 0%, #14213f 55%, #070b18 100%)", accent: "#DCE6FF", glow: "rgba(190,210,255,0.32)" },
  Mars: { background: "linear-gradient(165deg, #8a231c 0%, #3f1010 55%, #150606 100%)", accent: "#FF9478", glow: "rgba(255,110,80,0.36)" },
  Mercury: { background: "linear-gradient(165deg, #10634c 0%, #0a3129 55%, #04120f 100%)", accent: "#7CE8BD", glow: "rgba(90,230,170,0.3)" },
  Jupiter: { background: "linear-gradient(165deg, #86630f 0%, #3f2d08 55%, #151003 100%)", accent: "#FFD970", glow: "rgba(255,205,90,0.36)" },
  Venus: { background: "linear-gradient(165deg, #762e63 0%, #381533 55%, #140714 100%)", accent: "#FFBDE4", glow: "rgba(255,150,215,0.32)" },
  Saturn: { background: "linear-gradient(165deg, #2f3478 0%, #15183f 55%, #070818 100%)", accent: "#A9B4FF", glow: "rgba(140,150,255,0.32)" },
};

/**
 * Full-bleed artwork that has been added under public/stories/. Empty until
 * the pictures exist: a story without an entry here uses its gradient. Keys
 * are "panchang", "gita", "deity/<id>" and "hora/<planet>".
 */
export const STORY_ART: Readonly<Record<string, string>> = {};

export function storyTheme(id: StoryId, opts: { planet?: string; deityId?: string } = {}): StoryTheme {
  switch (id) {
    case "panchang":
      return { ...PANCHANG, art: STORY_ART.panchang };
    case "hora": {
      const planet = (opts.planet ?? "") as HoraPlanet;
      return { ...(HORA[planet] ?? HORA.Jupiter), art: STORY_ART[`hora/${planet.toLowerCase()}`] };
    }
    case "deity":
      return { ...DEITY, art: STORY_ART[`deity/${opts.deityId ?? ""}`] };
    case "gita":
      return { ...GITA, art: STORY_ART.gita };
  }
}
