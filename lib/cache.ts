/**
 * Quota-safe localStorage wrapper for caching immutable/slow-changing server
 * content client-side (horoscope/forecast/panchang/kundli/gemstone/house
 * insight — see hooks/usePersonalizedHoroscope.ts, useMoonSignForecasts.ts,
 * useKundli.ts, useGemstone.ts, useHouseInsight.ts and the direct call sites
 * in app/remedies/page.tsx and app/panchang/page.tsx for the read side).
 *
 * Design goals, in priority order:
 *   1. Never throw. A user with storage disabled (private browsing, quota
 *      already exhausted by something else, a corporate policy) must see the
 *      exact same app behavior as one with working storage — every function
 *      here is a silent no-op / null-returning fallback on any failure.
 *   2. Never grow unbounded. `cacheSet` sweeps expired entries and evicts the
 *      oldest one under quota pressure rather than leaving the caller to
 *      handle a thrown QuotaExceededError.
 *   3. Be trivially invalidated wholesale. Every key carries a version
 *      prefix — bump VERSION to abandon every existing entry at once on a
 *      future breaking change to any cached shape, without needing a
 *      migration.
 */

const VERSION = "v1"; // bump to invalidate every cache entry at once on a future breaking change
const PREFIX = `aroha:cache:${VERSION}:`;

interface Entry<T> {
  /** The cached value. */
  v: T;
  /** Epoch ms after which this entry is considered expired (belt-and-suspenders absolute check — see cacheGet). */
  exp: number;
  /** Epoch ms this entry was written — used to pick the oldest entry to evict under quota pressure. */
  at: number;
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/** Every localStorage key this module owns, with the PREFIX stripped. */
function ownKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PREFIX)) out.push(key.slice(PREFIX.length));
    }
  } catch {
    return [];
  }
  return out;
}

/**
 * Reads a cache entry. Returns `null` on a miss, a parse failure, or an
 * expired entry — callers can't tell those apart and shouldn't need to; a
 * miss just means "go fetch it". An expired entry is deleted as a side
 * effect so it doesn't linger and count against quota.
 *
 * This `exp` check is the *second* of the three read-guard layers the
 * hooks/call-sites implement (see the doc comments there): the *first* and
 * primary one is baking the resource's periodKey into the key itself (see
 * `buildKey`/`currentPeriodKey` in period-expiry.ts) so a rolled-over period
 * simply misses outright. This absolute-timestamp check is belt-and-suspenders
 * for a device clock that jumped forward past a period boundary without the
 * key changing (can't happen for period-keyed entries, but SWR entries here
 * are keyed without a periodKey and rely on this check as their primary
 * expiry mechanism).
 */
export function cacheGet<T>(key: string): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (typeof entry?.exp !== "number" || Date.now() > entry.exp) {
      try {
        window.localStorage.removeItem(PREFIX + key);
      } catch {
        // Best-effort cleanup — a failed removeItem here doesn't change the
        // fact that this read is a miss.
      }
      return null;
    }
    return entry.v;
  } catch {
    return null;
  }
}

/** Deletes every cached entry that's already past its `exp`. Returns nothing — best-effort, never throws. */
function sweepExpired(): void {
  const now = Date.now();
  for (const key of ownKeys()) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw == null) continue;
      const entry = JSON.parse(raw) as Entry<unknown>;
      if (typeof entry?.exp !== "number" || now > entry.exp) {
        window.localStorage.removeItem(PREFIX + key);
      }
    } catch {
      // A single corrupt entry shouldn't abort the sweep — best-effort, skip it.
    }
  }
}

/** Deletes the single oldest (by `at`) cache entry, if any exist. Best-effort. */
function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldestAt = Infinity;
  for (const key of ownKeys()) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw == null) continue;
      const entry = JSON.parse(raw) as Entry<unknown>;
      const at = typeof entry?.at === "number" ? entry.at : 0;
      if (at < oldestAt) {
        oldestAt = at;
        oldestKey = key;
      }
    } catch {
      // Corrupt entry — not a candidate we can compare, skip it.
    }
  }
  if (oldestKey != null) {
    try {
      window.localStorage.removeItem(PREFIX + oldestKey);
    } catch {
      // Nothing more we can do.
    }
  }
}

/**
 * Writes a cache entry that expires at `expiresAt` (epoch ms — typically
 * `periodExpiresAt(period)` for hard-cached resources, or `Date.now() + TTL`
 * for stale-while-revalidate ones; see the hooks for which).
 *
 * localStorage has no eviction policy of its own and a small quota (~5-10MB
 * depending on browser) shared with everything else the app stores there, so
 * a write can fail at any time for reasons entirely outside this call's
 * control. On failure this retries in two escalating steps before giving up
 * silently — it never throws and never loops beyond these bounded retries:
 *   1. Sweep every expired entry (cheap, likely to free real space if the
 *      user has been active for a while) and retry the write once.
 *   2. Still failing — evict the single oldest entry by `at` (LRU-ish
 *      approximation; we don't track last-read time, only last-write) and
 *      retry once more.
 *   3. Still failing — give up. The app behaves as if caching is disabled
 *      for this entry, exactly as the "storage unavailable" case does.
 */
export function cacheSet<T>(key: string, value: T, expiresAt: number): void {
  if (!hasWindow()) return;
  const entry: Entry<T> = { v: value, exp: expiresAt, at: Date.now() };
  let serialized: string;
  try {
    serialized = JSON.stringify(entry);
  } catch {
    return; // Value isn't JSON-serializable — nothing we can do.
  }

  const tryWrite = (): boolean => {
    try {
      window.localStorage.setItem(PREFIX + key, serialized);
      return true;
    } catch {
      return false;
    }
  };

  if (tryWrite()) return;
  sweepExpired();
  if (tryWrite()) return;
  evictOldest();
  if (tryWrite()) return;
  // Gave up — silent no-op, matches "storage unavailable" behavior.
}

/**
 * Deletes every cached entry whose (unprefixed) key satisfies `matcher`.
 * Used both directly and as the primitive behind `purgeUserCache` below.
 * Never throws.
 */
export function cachePurge(matcher: (key: string) => boolean): void {
  if (!hasWindow()) return;
  for (const key of ownKeys()) {
    try {
      if (matcher(key)) window.localStorage.removeItem(PREFIX + key);
    } catch {
      // Skip this key, keep purging the rest.
    }
  }
}

/**
 * Rounds a lat/lon coordinate to 2 decimal places (~1.1km precision at the
 * equator) for use in a panchang cache key. Two mounts of the same screen a
 * few seconds apart can report GPS coordinates that differ in the 4th-5th
 * decimal place from ordinary sensor jitter — without rounding, that jitter
 * would mint a brand-new cache key (and a wasted network request) on every
 * single mount even though the panchang data itself only varies meaningfully
 * at city-level granularity.
 */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Joins non-empty key parts with ':', filtering out null/undefined so an
 * absent optional part (e.g. no active profile yet) doesn't leave a
 * double-colon or trailing colon in the key. Every cache key in this app is
 * built through this helper, starting with a `kind` discriminator (e.g.
 * "kundli", "horoscope", "gemstone", "houseInsight", "remedies", "panchang",
 * "panchangMonth", "moonSignForecast") and then `userId` where the resource
 * is user-scoped — see the table in the hooks' doc comments for the exact
 * part lists — so `purgeUserCache` below can match on a `kind:userId:` prefix.
 */
export function buildKey(...parts: (string | number | null | undefined)[]): string {
  return parts.filter((p) => p !== null && p !== undefined).join(":");
}

/**
 * The `kind` discriminator each cache key starts with — must match what each
 * hook passes as the first `buildKey` part. Note this includes "horoscope"
 * even though moon-sign-forecast/panchang (also period-keyed, user-independent
 * or purely geo-keyed content) are deliberately absent: those two never need
 * an explicit purge because nothing about a birth-detail edit invalidates a
 * periodKey that's already baked into their keys (see currentPeriodKey in
 * period-expiry.ts) — "horoscope" IS user-scoped and IS chart-derived, so a
 * birth-detail edit does need to bust it explicitly.
 */
type CacheScope = "kundli" | "horoscope" | "gemstone" | "houseInsight" | "remedies";
const ALL_SCOPES: readonly CacheScope[] = ["kundli", "horoscope", "gemstone", "houseInsight", "remedies"];

/**
 * Purges cached entries for one user, optionally narrowed to one resource
 * kind. Called from mutation sites that invalidate previously-cached content
 * out from under a periodKey/TTL that hasn't naturally expired yet — e.g.
 * birth details changing (kundli/horoscope/gemstone/houseInsight/remedies
 * all go stale at once), a house unlock (that house's insight flips from
 * forbidden to generating), or a gemstone unlock. Moon-sign-forecast/
 * panchang are intentionally NOT part of `opts.scope`'s union: they're
 * either user-independent (moon-sign-forecast) or geo-keyed rather than
 * user-keyed (panchang), and both are already keyed by `currentPeriodKey()`
 * or a fixed TTL, so nothing about a birth-detail edit invalidates a key
 * that's already correct on its own — and profile/language switches are
 * likewise self-invalidating via the key for every cache entry in this file
 * (see Part D of the design doc this mirrors). Matches on a
 * `${kind}:${userId}:` key prefix — every hook that writes a user-scoped
 * cache entry must start its `buildKey(...)` call with exactly
 * `(kind, userId, ...)` for this prefix match to find it.
 */
export function purgeUserCache(
  userId: string,
  opts: { scope?: CacheScope | "all" } = {},
): void {
  const scope = opts.scope ?? "all";
  const scopes = scope === "all" ? ALL_SCOPES : [scope];
  const prefixes = scopes.map((s) => `${s}:${userId}:`);
  cachePurge((key) => prefixes.some((p) => key.startsWith(p)));
}
