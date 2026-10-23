import { registerPlugin } from "@capacitor/core";
import { isNativeAndroid } from "./play-billing";

/**
 * Short vibrations for small taps (the Morning Ritual's seal, beads and breaths).
 *
 * Local native plugin registered in mobile/android's MainActivity (AppHapticsPlugin), shipped from
 * build 1.17. Anywhere else (the browser, an older app build) it falls back to navigator.vibrate,
 * and where that is missing too it does nothing: a missing tick must never break a screen.
 */
const AppHaptics = registerPlugin<{
  pulse(opts: { ms: number }): Promise<void>;
  pattern(opts: { pattern: number[] }): Promise<void>;
}>("AppHaptics");

let nativeChecked: Promise<boolean> | null = null;

function native(): Promise<boolean> {
  nativeChecked ??= isNativeAndroid().catch(() => false);
  return nativeChecked;
}

function browserVibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    // some embedded browsers throw instead of returning false
  }
}

/** One tick of `ms` milliseconds. */
export async function tick(ms: number): Promise<void> {
  try {
    if (await native()) {
      await AppHaptics.pulse({ ms });
      return;
    }
  } catch {
    // an older app build has no AppHaptics: fall through to the browser call
  }
  browserVibrate(ms);
}

/**
 * Alternating wait and buzz lengths in milliseconds, starting with a wait (the shape of
 * navigator.vibrate). A pattern given as a plain number is one tick.
 */
export async function haptic(pattern: number | readonly number[]): Promise<void> {
  if (typeof pattern === "number") return tick(pattern);
  const list = [...pattern];
  try {
    if (await native()) {
      await AppHaptics.pattern({ pattern: list });
      return;
    }
  } catch {
    // fall through
  }
  browserVibrate(list);
}
