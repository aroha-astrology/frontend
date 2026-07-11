/**
 * In-memory per-IP sliding-window limiter for public, unauthenticated API
 * routes that proxy to rate-limited/free third-party services (Nominatim
 * caps abusive clients at 1 req/sec and IP-bans violators — a ban would
 * break geocoding for every real user, not just the abuser). Per-instance
 * only (resets on cold start, not shared across Vercel regions) — good
 * enough to blunt casual scripted abuse, not a substitute for a shared
 * store if this ever needs to be airtight.
 */

const windows = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (windows.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    windows.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  windows.set(key, timestamps);
  return false;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? 'unknown';
}
