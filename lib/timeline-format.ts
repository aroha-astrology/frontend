const MS_PER_YEAR = 365.25 * 86_400_000;

const ms = (date: string) => new Date(`${date}T00:00:00Z`).getTime();

/** A date's position along [from, to] as 0-100 (%), clamped. */
export function positionPct(date: string, from: string, to: string): number {
  const span = ms(to) - ms(from);
  if (span <= 0) return 0;
  return Math.min(100, Math.max(0, ((ms(date) - ms(from)) / span) * 100));
}

/** Width of [start, end] along [from, to] as %, at least a sliver so short bands stay tappable. */
export function widthPct(start: string, end: string, from: string, to: string): number {
  return Math.max(0.6, positionPct(end, from, to) - positionPct(start, from, to));
}

/** Whole years of age on `date`. */
export function ageOn(birthDate: string, date: string): number {
  return Math.floor((ms(date) - ms(birthDate)) / MS_PER_YEAR);
}

/** Age ticks (every `step` years) that fall inside [from, to], with their position. */
export function ageTicks(birthDate: string, from: string, to: string, step: number): Array<{ age: number; pct: number }> {
  const out: Array<{ age: number; pct: number }> = [];
  const firstAge = Math.ceil(ageOn(birthDate, from) / step) * step;
  for (let age = Math.max(0, firstAge); ; age += step) {
    const at = new Date(ms(birthDate) + age * MS_PER_YEAR).toISOString().slice(0, 10);
    if (at > to) break;
    if (at >= from) out.push({ age, pct: positionPct(at, from, to) });
  }
  return out;
}

/** How many pixels wide the chart should be: ~36px a year, never narrower than the screen. */
export function chartWidthPx(from: string, to: string, minPx: number): number {
  const years = (ms(to) - ms(from)) / MS_PER_YEAR;
  return Math.max(minPx, Math.round(years * 36));
}
