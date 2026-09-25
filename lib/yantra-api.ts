import { registerPlugin } from "@capacitor/core";
import { request } from "@/lib/api";
import type { WhyFactor } from "@/lib/insights-api";

export type DigitalKind = "yantra" | "wallpaper";

/** Mirrors backend lib/astro-tools/yantra.ts YantraSpec. */
export interface YantraSpec {
  planet: string;
  grid: number[][];
  magicSum: number;
  mantra: { devanagari: string; iast: string };
  colours: { primary: string; accent: string; background: string };
  nakshatra: string;
  affirmationKey: string;
  why: WhyFactor[];
}

export interface YantraView {
  preview: Pick<YantraSpec, "planet" | "colours" | "nakshatra" | "why" | "magicSum">;
  owned: Record<DigitalKind, boolean>;
  spec: YantraSpec | null;
  prices: Record<DigitalKind, number | null>;
}

export const yantraApi = {
  get: () => request<YantraView>("/v1/yantra", { auth: true }),
  buy: (kind: DigitalKind) => request<YantraView>(`/v1/yantra/${kind}/buy`, { method: "POST", auth: true }),
};

interface ImageSaverPlugin {
  /** Needs Android 10+; older phones reject with code "unsupported". App 1.13+. */
  savePng(options: { base64: string; fileName: string }): Promise<{ uri: string }>;
}

/** Local native plugin (mobile/android ImageSaverPlugin.java) — only on the Android app. */
export const ImageSaver = registerPlugin<ImageSaverPlugin>("ImageSaver");
