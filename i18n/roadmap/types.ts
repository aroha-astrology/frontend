/** The seven app languages — must match the blocks in i18n/resources.ts. */
export const ROADMAP_LANGS = ["en", "hi", "bn", "mr", "te", "ta", "gu"] as const;
export type RoadmapLang = (typeof ROADMAP_LANGS)[number];

/** A nested translation tree, e.g. `{ why: { title: "…" } }`. */
export type TranslationTree = { [key: string]: string | TranslationTree };

/**
 * One roadmap feature's strings in every language. Kept out of the 16k-line
 * i18n/resources.ts and merged in at startup (see ./index.ts). Every language
 * must carry exactly the same keys — roadmap.test.ts enforces it.
 */
export type RoadmapBundle = Record<RoadmapLang, TranslationTree>;
