import { formatCoins } from "./money";
import type { HookKey } from "./hooks-types";

/**
 * Names and short lines for the eight daily-return hooks. English only for now: the numbers, dates and
 * signs inside every hook screen come from the server already worked out, and only these labels remain
 * to be translated. Keeping them in one place means that pass is one file.
 */
export interface HookMeta {
  key: HookKey;
  /** The admin switch. */
  feature: string;
  /** Route under /hooks/. */
  slug: string;
  /** API path under /v1/hooks/. */
  path: string;
  title: string;
  tagline: string;
  /** The look the hook was built for (the owner can open it to the other on the admin board). */
  look: "vedic" | "cosmic";
  /** Where it sits on Home and the id the Home card registry uses. */
  homeId: string;
}

export const HOOKS: readonly HookMeta[] = [
  { key: "kundliRahasya", feature: "hooks.kundliRahasya", slug: "rahasya", path: "rahasya", title: "Kundli Rahasya", tagline: "17 scrolls about your own chart", look: "vedic", homeId: "hookRahasya" },
  { key: "shubhLabh", feature: "hooks.shubhLabh", slug: "shubh-labh", path: "shubh-labh", title: "Shubh-Labh radar", tagline: "The best windows today for money matters", look: "vedic", homeId: "hookShubhLabh" },
  { key: "gharKavach", feature: "hooks.gharKavach", slug: "ghar-kavach", path: "ghar-kavach", title: "Ghar Ka Kavach", tagline: "Who in the family could use some care today", look: "vedic", homeId: "hookKavach" },
  { key: "sankalpDiya", feature: "hooks.sankalpDiya", slug: "sankalp-diya", path: "sankalp-diya", title: "Sankalp Diya", tagline: "Light today's diya in its best window", look: "vedic", homeId: "hookDiya" },
  { key: "cosmicReceipts", feature: "hooks.cosmicReceipts", slug: "cosmic-receipts", path: "cosmic-receipts", title: "Cosmic Receipts", tagline: "Three timed cards for your day", look: "cosmic", homeId: "hookReceipts" },
  { key: "textTiming", feature: "hooks.textTiming", slug: "text-timing", path: "text-timing", title: "Text them now?", tagline: "A timing suggestion for getting in touch", look: "cosmic", homeId: "hookText" },
  { key: "sleepSync", feature: "hooks.sleepSync", slug: "sleep-sync", path: "sleep-sync", title: "Sleep Sync", tagline: "Your nights beside the Moon", look: "cosmic", homeId: "hookSleep" },
  { key: "mysteryDrop", feature: "hooks.mysteryDrop", slug: "mystery", path: "mystery", title: "Mystery Synastry", tagline: "Scratch tonight's card", look: "cosmic", homeId: "hookMystery" },
];

export const hookMeta = (key: HookKey): HookMeta => HOOKS.find((h) => h.key === key)!;

/** "15 coins" / "₹15" per the reader's money mode, from paise. */
export const price = (paise: number): string => formatCoins(paise);

/** Minutes on the strip's axis (past 1440 = the next morning) as a clock. */
export function clockOf(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "in 2 h 14 min" / "in 14 min". */
export function inMinutes(min: number): string {
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `in ${h} h ${m} min` : `in ${h} h`;
}

export const COLOR_CLASS = {
  green: "bg-emerald-500/80",
  amber: "bg-amber-400/80",
  red: "bg-red-500/70",
} as const;

/** The error codes the server uses, as a sentence for the reader. */
export function codeMessage(code: string | null): string {
  switch (code) {
    case "INSUFFICIENT_CREDITS":
      return "You do not have enough coins for this.";
    case "NOT_YET":
      return "It is not time yet.";
    case "WINDOW_PASSED":
      return "Today's window has passed. Tomorrow's opens in the morning.";
    case "NO_CHART":
      return "Your birth chart is not ready yet. Check your birth details in Settings.";
    case "NO_FAMILY":
      return "Add a family member to your Circle first.";
    case "ALREADY_MARKED":
      return "You already marked this card.";
    case "WEEK_LOCKED":
      return "Open the 7-day view first.";
    default:
      return "Something went wrong. Please try again.";
  }
}
