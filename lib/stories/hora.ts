import type { HoraSlot } from "@/lib/api";
import { durationMinutes, isCurrentlyActive } from "@/lib/panchang/time-window";
import { HORA_PLANETS } from "./types";

export interface BestHora {
  slot: HoraSlot;
  /** "live": running now. "upcoming": starts later today. */
  status: "live" | "upcoming";
  /** live: minutes until it ends. upcoming: minutes until it starts. */
  minutes: number;
  /** live: share of the slot already gone, 0 to 1. upcoming: 0. */
  progress: number;
}

/** `now` as the "HH:mm" clock string the panchang engine uses. */
function clock(now: Date): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function live(slot: HoraSlot, nowTime: string): BestHora {
  const minutes = durationMinutes(nowTime, slot.endTime);
  return { slot, status: "live", minutes, progress: 1 - minutes / durationMinutes(slot.startTime, slot.endTime) };
}

/**
 * The hora worth showing right now: the running one when it is auspicious,
 * otherwise the next auspicious one still to come today. With no auspicious
 * hora left, the running one is returned anyway (the story then says "go
 * slow" rather than showing nothing). `slots` are in time order, as the
 * backend sends them.
 */
export function pickBestHora(slots: readonly HoraSlot[], now: Date): BestHora | null {
  const nowTime = clock(now);
  const activeIndex = slots.findIndex((slot) => isCurrentlyActive(slot.startTime, slot.endTime, now));
  const active = activeIndex >= 0 ? slots[activeIndex]! : null;

  if (active?.isAuspicious) return live(active, nowTime);

  const next = slots.slice(activeIndex + 1).find((slot) => slot.isAuspicious);
  if (next) return { slot: next, status: "upcoming", minutes: durationMinutes(nowTime, next.startTime), progress: 0 };

  return active ? live(active, nowTime) : null;
}

export interface HoraGuideKeys {
  about: string;
  good: string[];
  avoid: string[];
}

/** Translation keys for a hora planet's advice (i18n/roadmap/stories.ts); null for a planet with no hora. */
export function horaGuideKeys(planet: string): HoraGuideKeys | null {
  const id = planet.toLowerCase();
  if (!HORA_PLANETS.some((p) => p.toLowerCase() === id)) return null;
  const base = `stories.hora.planets.${id}`;
  return {
    about: `${base}.about`,
    good: [`${base}.good1`, `${base}.good2`, `${base}.good3`],
    avoid: [`${base}.avoid1`, `${base}.avoid2`],
  };
}
