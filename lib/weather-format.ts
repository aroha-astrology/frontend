import type { AstroWeather, WeatherAreaKey } from "@/lib/insights-api";

type Translate = (key: string, vars?: Record<string, unknown>) => string;

/** A 0-100 score as the word Astro Weather shows next to it. */
export function scoreWordKey(score: number): "strong" | "good" | "mixed" | "gentle" {
  if (score >= 75) return "strong";
  if (score >= 60) return "good";
  if (score >= 45) return "mixed";
  return "gentle";
}

/**
 * The strongest and weakest area, or null when they're within 10 points —
 * then "X is stronger than Y" would be noise, and the summary says the day is
 * balanced instead.
 */
export function strongestAndWeakest(
  areas: AstroWeather["areas"],
): { strong: WeatherAreaKey; weak: WeatherAreaKey } | null {
  if (areas.length < 2) return null;
  const sorted = [...areas].sort((a, b) => b.score - a.score);
  const top = sorted[0]!;
  const bottom = sorted[sorted.length - 1]!;
  return top.score - bottom.score >= 10 ? { strong: top.key, weak: bottom.key } : null;
}

/** 'HH:mm' (IST) → "6:18 PM" in English, 24-hour elsewhere. */
export function formatClock(hhmm: string, lang: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (h == null || m == null || Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  if (!lang.startsWith("en")) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** The IST clock time as 'HH:mm', the same shape as the day windows' start and end. */
export function istClock(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

/** Is the 'HH:mm'–'HH:mm' (IST) window the one we're in right now? */
export function isNowIn(start: string, end: string, now: Date = new Date()): boolean {
  const ist = istClock(now);
  return start <= ist && ist < end;
}

/** The windows still to come: the ones we're in first (they started earliest), then the rest in time order. */
export function upcomingWindows<W extends { end: string }>(windows: W[], now: Date = new Date()): W[] {
  const ist = istClock(now);
  return windows.filter((w) => w.end > ist);
}

/**
 * The ~10-second spoken summary: a greeting, which area leads and which
 * trails, where tomorrow is heading, and the day's Moon sign change if any.
 * Built from translated templates, so it speaks the app language with no
 * server call.
 */
export function listenScript(t: Translate, weather: AstroWeather, name: string | null, lang: string): string {
  const parts: string[] = [name ? t("weather.script.greeting", { name }) : t("weather.script.greetingNoName")];
  const pair = strongestAndWeakest(weather.areas);
  parts.push(
    pair
      ? t("weather.script.strongest", {
          strong: t(`weather.areas.${pair.strong}`),
          weak: t(`weather.areas.${pair.weak}`),
        })
      : t("weather.script.even"),
  );
  parts.push(t(`weather.script.${weather.overall.trend}`));
  const signChange = weather.moments.find((m) => m.kind === "moonSign");
  if (signChange) {
    parts.push(
      t("weather.script.moment", {
        sign: t(`zodiac.signs.${signChange.to.toLowerCase()}`),
        time: formatClock(signChange.time, lang),
      }),
    );
  }
  return parts.join(" ");
}
