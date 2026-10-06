/**
 * The panchang engine sends 24-hour "HH:mm" clock strings. A story is read at
 * a glance, so it shows them the way people say them: "9:28 AM". Kept in
 * Latin digits with AM/PM in every app language, like the rest of the app's
 * timings; several languages spell AM/PM as a long word that would not fit.
 */
export function formatClock(time: string | undefined | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (h === undefined || m === undefined || !Number.isFinite(h) || !Number.isFinite(m)) return time;
  const hour = ((h % 12) + 12) % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h % 24 < 12 ? "AM" : "PM"}`;
}

/** "9:28 AM – 10:28 AM" */
export function formatClockRange(start: string | undefined | null, end: string | undefined | null): string {
  return `${formatClock(start)} – ${formatClock(end)}`;
}

/**
 * The story header's date, e.g. "Tue, 6 October", in the reader's language.
 * English is formatted the Indian way (day before month); plain "en" would
 * give the American "October 6".
 */
export function storyDateLabel(date: Date, lang: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "long", numberingSystem: "latn" };
  try {
    return new Intl.DateTimeFormat(lang === "en" ? "en-IN" : lang, options).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-IN", options).format(date);
  }
}

/**
 * How much of the Moon is lit on a tithi, and whether it is growing.
 * `tithiNumber` is the panchang's 1–30 count: 1–15 Shukla (waxing, 15 = full
 * moon), 16–30 Krishna (waning, 30 = new moon).
 */
export function moonPhase(tithiNumber: number): { lit: number; waxing: boolean } {
  const n = Math.min(30, Math.max(1, Math.round(tithiNumber)));
  return n <= 15 ? { lit: n / 15, waxing: true } : { lit: 1 - (n - 15) / 15, waxing: false };
}

/**
 * SVG path of the lit part of a moon of radius `r` centred on 0,0, drawn with
 * the lit side on the right (mirror it for a waning moon). The outer edge is
 * half the disc; the inner edge is the terminator, an ellipse that flattens to
 * a straight line at half moon and bulges the other way past it.
 */
export function moonLitPath(lit: number, r: number): string {
  const k = Math.min(1, Math.max(0, lit));
  const rx = Math.abs(1 - 2 * k) * r;
  const sweep = k > 0.5 ? 1 : 0;
  return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx.toFixed(2)} ${r} 0 0 ${sweep} 0 ${-r} Z`;
}
