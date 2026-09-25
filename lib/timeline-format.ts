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

/** Age ticks (every `step` years) that fall inside [from, to], with the calendar year and position. */
export function ageTicks(
  birthDate: string,
  from: string,
  to: string,
  step: number,
): Array<{ age: number; year: number; pct: number }> {
  const out: Array<{ age: number; year: number; pct: number }> = [];
  const firstAge = Math.ceil(ageOn(birthDate, from) / step) * step;
  for (let age = Math.max(0, firstAge); ; age += step) {
    const at = new Date(ms(birthDate) + age * MS_PER_YEAR).toISOString().slice(0, 10);
    if (at > to) break;
    if (at >= from) out.push({ age, year: Number(at.slice(0, 4)), pct: positionPct(at, from, to) });
  }
  return out;
}

/** A band's years for its bar: "2027", or "2027–29" across years. */
export function barYears(start: string, end: string): string {
  const [a, b] = [start.slice(0, 4), end.slice(0, 4)];
  return a === b ? a : `${a}–${b.slice(2)}`;
}

/** A band's years for its sheet heading: "2027", or "2027 – 2029". */
export function yearSpan(start: string, end: string): string {
  const [a, b] = [start.slice(0, 4), end.slice(0, 4)];
  return a === b ? a : `${a} – ${b}`;
}

/** Whether [start, end) is behind, around or ahead of `today`. */
export function bandTense(start: string, end: string, today: string): "past" | "now" | "future" {
  if (end <= today) return "past";
  return start > today ? "future" : "now";
}

/** Whole calendar months from `from` to `to`, negative when `to` is earlier. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = to.split("-").map(Number) as [number, number, number];
  const months = (ty - fy) * 12 + (tm - fm);
  if (months > 0 && td < fd) return months - 1;
  if (months < 0 && td > fd) return months + 1;
  return months;
}

/** "in 6 months", "2 years ago", "this month": how far `date` is from `today`, in the user's language. */
export function relativeFromToday(date: string, today: string, lang: string): string {
  const months = monthsBetween(today, date);
  try {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    return Math.abs(months) >= 12 ? rtf.format(Math.round(months / 12), "year") : rtf.format(months, "month");
  } catch {
    return "";
  }
}

/** '2027-03-01' → "Mar 1, 2027" in the user's language. */
export function fullDate(date: string, lang: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return date;
  }
}

/** How many pixels wide the chart should be: ~36px a year, never narrower than the screen. */
export function chartWidthPx(from: string, to: string, minPx: number): number {
  const years = (ms(to) - ms(from)) / MS_PER_YEAR;
  return Math.max(minPx, Math.round(years * 36));
}
