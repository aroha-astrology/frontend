/**
 * Which of today's stories this device has already opened. Kept in
 * localStorage (not on the server): the ring on the Home avatar glows until
 * every story of the day has been seen, and a new day starts from nothing.
 */
export const SEEN_STORAGE_KEY = "aroha:stories:seen:v1";

/** Local calendar day of `date` as "YYYY-MM-DD" (device time zone, zero padded). */
export function localDayIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function stored(raw: string | null): { date: string; ids: string[] } | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { date, ids } = parsed as { date?: unknown; ids?: unknown };
    if (typeof date !== "string" || !Array.isArray(ids)) return null;
    return { date, ids: ids.filter((x): x is string => typeof x === "string") };
  } catch {
    return null;
  }
}

/**
 * Story ids seen on `today`. `raw` is the stored JSON `{"date":"YYYY-MM-DD","ids":["panchang"]}`.
 * Returns [] when raw is null, is not valid JSON, has the wrong shape, or its date is not `today`.
 */
export function parseSeen(raw: string | null, today: string): string[] {
  const state = stored(raw);
  return state && state.date === today ? state.ids : [];
}

/** The JSON to store after `id` was seen on `today`: keeps today's other ids, never repeats one, drops another day's. */
export function addSeen(raw: string | null, today: string, id: string): string {
  const ids = parseSeen(raw, today);
  return JSON.stringify({ date: today, ids: ids.includes(id) ? ids : [...ids, id] });
}

/** True when at least one of `storyIds` is not in `seenIds`. */
export function hasUnseen(seenIds: readonly string[], storyIds: readonly string[]): boolean {
  return storyIds.some((id) => !seenIds.includes(id));
}

/** Today's seen ids from localStorage; [] when storage is missing or blocked. */
export function readSeen(today: string): string[] {
  try {
    return parseSeen(window.localStorage.getItem(SEEN_STORAGE_KEY), today);
  } catch {
    return [];
  }
}

/** Records `id` as seen today and returns the new list. Never throws: with storage blocked the ring just glows again next visit. */
export function markSeen(today: string, id: string): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
  } catch {
    // storage blocked — fall through with nothing stored.
  }
  const next = addSeen(raw, today, id);
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  return parseSeen(next, today);
}
