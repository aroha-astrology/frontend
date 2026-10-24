/**
 * Shapes of the eight daily-return hooks (v7 Sprint 6), as the server sends them. Every number, time,
 * sign and degree in them was calculated on the server; the app only lays them out.
 */

export type HookKey =
  | "kundliRahasya"
  | "shubhLabh"
  | "gharKavach"
  | "sankalpDiya"
  | "cosmicReceipts"
  | "textTiming"
  | "sleepSync"
  | "mysteryDrop";

export interface SkyPlaceInfo {
  name: string | null;
  assumed: boolean;
  tz: string;
}

/* Kundli Rahasya */
export interface ScrollFact {
  label: string;
  value: string;
}
export interface Scroll {
  n: number;
  id: string;
  title: string;
  headline: string;
  facts: ScrollFact[];
  why: string[];
  badge: "moon-chart" | null;
}
export interface ScrollSlot {
  n: number;
  title: string;
  status: "open" | "locked";
  via: "first" | "daily" | "paid" | null;
}
export interface RahasyaView {
  date: string;
  profileId: string | null;
  slots: ScrollSlot[];
  openCount: number;
  next: { n: number; needs: "ritual" | "visit"; ritualDoneToday: boolean; opensAtLocal: string } | null;
  unlockPricePaise: number;
  scroll: Scroll | null;
  chargedPaise?: number;
}

/* Shubh-Labh */
export type StripColor = "green" | "amber" | "red";
export interface StripWindow {
  start: string;
  end: string;
  startMin: number;
  endMin: number;
  color: StripColor;
  score: number;
  why: string[];
}
export interface ShubhLabhView {
  date: string;
  place: SkyPlaceInfo;
  basis: "personal" | "general";
  sunrise: string;
  windows: StripWindow[];
  best: { start: string; end: string; score: number; why: string[] } | null;
  now: {
    minute: number;
    clock: string;
    window: { color: StripColor; score: number; start: string; end: string } | null;
    nextGreen: { start: string; end: string; score: number; inMin: number } | null;
  } | null;
  scoreNote: string;
  week: {
    unlocked: boolean;
    until: string | null;
    pricePaise: number;
    days: { date: string; best: { start: string; end: string; score: number } | null; green: number }[] | null;
    alarms: { date: string; at: string; start: string }[];
  };
}

/* Sankalp Diya */
export interface DiyaView {
  date: string;
  place: SkyPlaceInfo;
  window: { start: string; end: string; startMin: number; endMin: number; kind: "abhijit" | "amrit" | "shubh"; why: string };
  state: "before" | "open" | "closed";
  opensInMin: number | null;
  lit: boolean;
  litAt: string | null;
  streak: number;
  occasion: "ekadashi" | "pradosh" | "purnima" | "amavasya" | null;
  giftPaise: number;
  giftPaid: boolean;
  litToday: number | null;
  alreadyLit?: boolean;
  earnedGiftPaise?: number;
}

/* Ghar Ka Kavach */
export interface KavachDay {
  memberId: string;
  name: string;
  quality: string;
  taraName: string;
  taraNumber: number;
  chandraHouse: number;
  planet: string;
  planetHindi: string;
  mantra: string;
  beads: number;
  beadsTarget: number;
  done: boolean;
}
export interface KavachView {
  date: string;
  state: "empty" | "ready" | "done";
  today: KavachDay | null;
  streak: number;
  kalash: number;
  weekDays: number;
  summary: { unlocked: boolean; days: { date: string; name: string; taraName: string; done: boolean }[] } | null;
  blessing: { name: string; text: string } | null;
  justFilled?: boolean;
}

/* Cosmic Receipts */
export type ReceiptPart = "morning" | "afternoon" | "evening";
export type Verdict = "nailed" | "partly" | "missed";
export interface ReceiptCard {
  part: ReceiptPart;
  startMin: number;
  endMin: number;
  moonSign: string;
  aspect: { name: string; tone: "easy" | "friction" | "intense"; natalPlanet: string; orbDeg: number; peakMin: number } | null;
  headline: string;
  text: string;
  proof: string;
}
export interface ReceiptsView {
  date: string;
  cards: (ReceiptCard & { status: "upcoming" | "live" | "past"; verdict: Verdict | null })[];
  share: { rated: number; nailed: number; partly: number; missed: number };
  yesterdayCheck: { date: string; parts: ReceiptPart[] } | null;
  tomorrow: { unlocked: boolean; pricePaise: number; cards: ReceiptCard[] | null };
  chargedPaise?: number;
}

/* Text them now? */
export interface TextPerson {
  profileId: string;
  name: string;
  relationship: string | null;
  readable: boolean;
}
export interface DecoderCard {
  id: "now" | "window" | "moon" | "tone";
  title: string;
  text: string;
  proof: string;
}
export interface TextVariant {
  label: string | null;
  now: { color: StripColor; score: number } | null;
  best: { start: string; end: string; score: number } | null;
  bestUntil: string | null;
  nextGreen: string | null;
  runs: { start: string; end: string; color: StripColor; score: number }[];
  cards: DecoderCard[];
}
export interface TextTimingView {
  date: string;
  person: { profileId: string; name: string };
  variants: TextVariant[];
  precision: "exact" | "moon-sign-options" | "approximate";
  alert: { pricePaise: number; armed: boolean; at: string | null };
  note: string;
}

/* Sleep Sync */
export interface SleepRanked {
  nakshatraIndex: number;
  average: number;
  nights: number;
}
export interface SleepView {
  date: string;
  lastNight: { nakshatraIndex: number; nakshatra: string; signIndex: number; sign: string; bindus: number | null };
  logged: number | null;
  recent: { localDate: string; score: number; nakshatra: string; sign: string }[];
  pattern: {
    nights: number;
    needed: number;
    ready: boolean;
    average: number | null;
    top: SleepRanked[];
    bottom: SleepRanked[];
    topNames: string[];
    bottomNames: string[];
    confidence: "early" | "firming";
  };
  report: {
    unlocked: boolean;
    pricePaise: number;
    data: {
      windowDays: number;
      nights: number;
      average: number | null;
      longestGoodRun: number;
      bestNights: { localDate: string; score: number }[];
      lowestNights: { localDate: string; score: number }[];
      bySign: { signIndex: number; average: number; nights: number }[];
      byNakshatra: SleepRanked[];
    } | null;
  };
  note: string;
}

/* Mystery Synastry */
export interface MysteryView {
  date: string;
  state: "waiting" | "ready" | "empty";
  opensInMin: number | null;
  allowed: number;
  cards: { index: number; scratched: boolean; kind: "circle" | "public" | null; name: string | null; score: number | null; why: string[] | null }[];
  addFriendHint: boolean;
}

export interface HookPrefs {
  off: HookKey[];
}
