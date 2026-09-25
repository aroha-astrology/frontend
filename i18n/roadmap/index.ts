import type { i18n as I18n } from "i18next";
import { ROADMAP_LANGS, type RoadmapBundle } from "./types";
import { whyBundle } from "./why";
import { astroNamesBundle } from "./astro-names";
import { weatherBundle } from "./weather";
import { calendarBundle } from "./calendar";
import { timelineBundle } from "./timeline";
import { askBundle } from "./ask";
import { decideBundle } from "./decide";
import { bondsBundle } from "./bonds";
import { journalBundle } from "./journal";
import { practiceBundle } from "./practice";
import { passBundle } from "./pass";

/** Every roadmap feature's strings. Add a feature's bundle here once. */
export const ROADMAP_BUNDLES: RoadmapBundle[] = [whyBundle, astroNamesBundle, weatherBundle, calendarBundle, timelineBundle, askBundle, decideBundle, bondsBundle, journalBundle, practiceBundle, passBundle];

/** Deep-merges every roadmap bundle into the running i18next instance. */
export function registerRoadmapBundles(i18n: I18n): void {
  for (const bundle of ROADMAP_BUNDLES) {
    for (const lang of ROADMAP_LANGS) {
      i18n.addResourceBundle(lang, "translation", bundle[lang], true, false);
    }
  }
}
