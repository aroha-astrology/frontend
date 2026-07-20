/**
 * Delay before the next poll attempt: exponential backoff (base doubling each
 * attempt, capped) plus up to +20% jitter so many clients polling the same
 * endpoint don't all retry in lockstep.
 */
export function nextPollDelay(
  attempt: number,
  opts: { baseMs?: number; capMs?: number } = {},
): number {
  const base = opts.baseMs ?? 2000;
  const cap = opts.capMs ?? 15000;
  const exp = Math.min(base * 2 ** attempt, cap);
  return Math.round(exp + exp * 0.2 * Math.random());
}
