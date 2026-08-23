/**
 * Local practice state for the Shlokas & Japs feature: favorites, recently
 * viewed, and the mala reading position. All localStorage-only, same
 * reasoning JapCounter.ts documented for its per-slug count — this is a
 * private practice record, not account data, and there is no shlokas
 * backend module to sync it to (see lib/shlokas.ts's header comment).
 *
 * Every getter/setter is safe to call from an event handler directly; each
 * write is wrapped so a full or blocked store degrades to "this session
 * only" instead of throwing.
 */

const FAVS_KEY = "aroha:shloka:favs";
const HISTORY_KEY = "aroha:shloka:history";
const JAP_KEY_PREFIX = "aroha:shloka:jap:";
const HISTORY_LIMIT = 50;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — the change still applies for this session.
  }
}

// ---- Favorites ----------------------------------------------------------

export function getFavs(): string[] {
  return readJSON<string[]>(FAVS_KEY, []);
}

export function isFav(slug: string): boolean {
  return getFavs().includes(slug);
}

/** Returns the new state (true = now favorited) so callers can update UI without a re-read. */
export function toggleFav(slug: string): boolean {
  const favs = getFavs();
  const idx = favs.indexOf(slug);
  if (idx === -1) {
    favs.unshift(slug);
    writeJSON(FAVS_KEY, favs);
    return true;
  }
  favs.splice(idx, 1);
  writeJSON(FAVS_KEY, favs);
  return false;
}

// ---- History --------------------------------------------------------------

export function getHistory(): string[] {
  return readJSON<string[]>(HISTORY_KEY, []);
}

/** Moves `slug` to the front, dedup'd, capped at HISTORY_LIMIT. */
export function pushHistory(slug: string) {
  const history = getHistory().filter((s) => s !== slug);
  history.unshift(slug);
  writeJSON(HISTORY_KEY, history.slice(0, HISTORY_LIMIT));
}

// ---- Jap (chant) progress ---------------------------------------------

/** One mala's progress through a single mantra/verse, keyed by that item's
 * own identifier (a shloka slug, or `gita:<verseId>`) — each mantra/verse
 * keeps its own count and target, not one shared global position. */
export interface JapProgress {
  index: number;
  target: number;
}

export function getJapProgress(key: string, defaultTarget: number): JapProgress {
  return readJSON<JapProgress>(`${JAP_KEY_PREFIX}${key}`, { index: 0, target: defaultTarget });
}

export function setJapProgress(key: string, progress: JapProgress) {
  writeJSON(`${JAP_KEY_PREFIX}${key}`, progress);
}

// ---- Shared audio singleton -------------------------------------------

/**
 * One <audio> element for the whole feature, not one per row/card. Without
 * this, tapping play on a list row while the detail page's clip is still
 * running would layer two chants — every play call here first stops
 * whatever else is playing.
 */
let sharedAudio: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

/** Resolves once playback starts, or resolves silently on failure (autoplay policy, missing file) — callers don't need a try/catch. */
export function playShlokaAudio(src: string, onEnded?: () => void): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!sharedAudio) sharedAudio = new Audio();

  if (currentSrc !== src) {
    sharedAudio.src = src;
    currentSrc = src;
  } else {
    sharedAudio.currentTime = 0;
  }
  sharedAudio.onended = onEnded ?? null;
  return sharedAudio.play().catch(() => {});
}

export function pauseShlokaAudio() {
  sharedAudio?.pause();
}

export function isShlokaAudioPlaying(src: string): boolean {
  return !!sharedAudio && currentSrc === src && !sharedAudio.paused;
}
