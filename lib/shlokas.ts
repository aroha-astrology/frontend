import type { LangCode } from "@/providers/language-provider";

/**
 * The Shlokas & Japs library is static content — 50 classical verses that
 * never change per user, per profile or per request. It lives as a plain JSON
 * file under `public/shlokas/` rather than in `data/*.ts` (where zodiac.ts and
 * remedies-fallback.ts live) for one reason: at ~200KB across seven languages
 * it would otherwise be bundled into the client on every route, including
 * routes that never mention a shloka. Fetched from `public/` it costs zero
 * bundle weight, is CDN-cached like any other static asset, and content edits
 * ship without a rebuild.
 *
 * There is deliberately no backend module behind this — no table, no route, no
 * service. See the `nav.shlokas` / `home.shlokas` entries in the backend's
 * config/features.ts; those two flags are the only server-side involvement.
 */

/** A field whose text differs per app language. `sanskrit`/`iast` are not among them. */
export type Localized = Record<LangCode, string>;

export interface Shloka {
  id: number;
  slug: string;
  /** Devanagari, newline-separated by pada. Language-independent. */
  sanskrit: string;
  /** IAST romanization. Language-independent. */
  iast: string;
  /** Filename under `public/shlokas/img/`. Several shlokas share one image. */
  img: string;
  /** Filename under `public/shlokas/audio/`. Absent until the chant is rendered. */
  audio?: string;
  /** Traditional repetition count — the jap counter's mala size for this verse. */
  japCount: number;
  /** Stable category slugs, e.g. "peace" | "protection". Labels come from tag-meta.ts + t(). */
  tags: string[];
  title: Localized;
  deity: Localized;
  meaning: Localized;
  whenToChant: Localized;
}

/**
 * Module-level memo, not a localStorage cache. `shlokas.json` is an immutable
 * static asset, so the browser's own HTTP cache already handles persistence
 * across page loads — wrapping it in lib/cache.ts as well would spend ~200KB
 * of the shared localStorage quota to duplicate what the CDN does for free.
 * This only avoids a second in-flight request within a single session.
 */
let pending: Promise<Shloka[]> | null = null;

export function loadShlokas(): Promise<Shloka[]> {
  if (!pending) {
    pending = fetch("/shlokas/shlokas.json")
      .then((res) => {
        if (!res.ok) throw new Error(`shlokas.json: ${res.status}`);
        return res.json() as Promise<Shloka[]>;
      })
      .catch((err) => {
        // Don't memoize a failure — a transient offline blip would otherwise
        // leave the page permanently empty for the rest of the session.
        pending = null;
        throw err;
      });
  }
  return pending;
}

/**
 * Falls back to English rather than rendering an empty string, so a language
 * that's missing a value (shouldn't happen — lib/shlokas.test.ts asserts all
 * seven are present) degrades to readable text instead of a blank card.
 */
export function pick(field: Localized, lang: LangCode): string {
  return field[lang] || field.en;
}

export const IMG_BASE = "/shlokas/img/";
export const AUDIO_BASE = "/shlokas/audio/";

/**
 * Default jap target — the traditional 108-bead count. Used to seed the
 * chant screen's editable target when a mantra has no `japCount` of its own,
 * and always for Gita verses (GitaVerse carries no japCount field at all).
 */
export const MALA_COUNT = 108;
