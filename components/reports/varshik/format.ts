/** Short month names in the reader's language (Intl, so Hindi / Tamil etc. come for free). */
export function monthShort(monthIndex: number, lang: string, year = 2027): string {
  try {
    return new Intl.DateTimeFormat(lang, { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, monthIndex, 15)),
    );
  } catch {
    return new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, monthIndex, 15)),
    );
  }
}

/** 'YYYY-MM-DD' -> day of year (0-based) inside `year`, clamped to 0-364. */
export function dayOfYear(iso: string, year = 2027): number {
  const t = Date.parse(`${iso}T00:00:00Z`);
  const s = Date.UTC(year, 0, 1);
  return Math.max(0, Math.min(364, Math.round((t - s) / 86_400_000)));
}
