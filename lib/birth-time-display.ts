import { BIRTH_TIME_WINDOWS, birthTimeWindowFor, type BirthTimeWindow } from "@/lib/birth-time-window";

/**
 * What to show for a saved birth time. The saved value is not always a time the reader gave:
 * a reader who only knew the part of the day has that window's midpoint saved with accuracy
 * "unknown". Printing "09:00" back would read as the app inventing a time, so this says what is
 * true instead. Display only: the stored value is never changed.
 *
 *  - unknown + one of the six stand-in midpoints -> the part of the day
 *  - unknown + exactly 12:00 (the stand-in for a skipped time) -> no time given
 *  - any other time, including an older unknown-rated time the reader typed -> the clock time
 *
 * Keep in step with the backend `isStandInMidpoint` in `src/lib/birth-time-window.ts`.
 */
export type BirthTimeDisplay =
  | { kind: "clock"; hhmm: string }
  | { kind: "window"; key: BirthTimeWindow["key"]; range: string }
  | { kind: "none" };

const hhmmOf = (time: string) => time.slice(0, 5);

export function isStandInMidpoint(time: string | null | undefined): boolean {
  if (!time) return false;
  return BIRTH_TIME_WINDOWS.some((w) => w.mid === hhmmOf(time));
}

/** The time box and part-of-day picker values of a birth-detail form, filled from a saved time. */
export function timeFieldsFor(
  time: string | null | undefined,
  accuracy: "exact" | "approximate" | "unknown" | null | undefined,
): { time: string; timeWindow: string } {
  const shown = describeBirthTime({ time, accuracy });
  if (shown.kind === "clock") return { time: shown.hhmm, timeWindow: "" };
  if (shown.kind === "window") return { time: "", timeWindow: shown.key };
  return { time: "", timeWindow: "" };
}

export function describeBirthTime(input: {
  time: string | null | undefined;
  accuracy: "exact" | "approximate" | "unknown" | null | undefined;
}): BirthTimeDisplay {
  const { time, accuracy } = input;
  if (!time) return { kind: "none" };
  if (accuracy === "unknown") {
    if (hhmmOf(time) === "12:00") return { kind: "none" };
    if (isStandInMidpoint(time)) {
      const w = birthTimeWindowFor(time);
      if (w) return { kind: "window", key: w.key, range: w.range };
    }
  }
  return { kind: "clock", hhmm: hhmmOf(time) };
}
