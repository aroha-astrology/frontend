"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { Tier } from "./types";

/**
 * Tier colours for the four score bands (Dark Green >= 75, Light Green 60-74, Amber 45-59,
 * Rust < 45). A status palette, not a ramp: a tier is always ALSO written as a word or glyph next
 * to the mark, so colour is never the only carrier (colour-blind safe). Rust is rest and
 * patience, not danger, so it stays a warm clay and is never a saturated red.
 */
export const TIER_COLOR: Record<"light" | "dark", Record<Tier, string>> = {
  light: { dark_green: "#1b7f54", light_green: "#5fa04e", amber: "#b87d0c", rust: "#a8502f" },
  dark: { dark_green: "#34d399", light_green: "#a3d977", amber: "#fbbf24", rust: "#e0775a" },
};

/** Single-glyph tier marker used beside a colour mark: filled circle = strongest, hollow = rest. */
export const TIER_GLYPH: Record<Tier, string> = {
  dark_green: "●",
  light_green: "◕",
  amber: "◑",
  rust: "○",
};

/** i18n key + English default for a tier's one-word reading. */
export const TIER_WORD: Record<Tier, { key: string; en: string }> = {
  dark_green: { key: "varshik.tier.go", en: "Go" },
  light_green: { key: "varshik.tier.steady", en: "Steady" },
  amber: { key: "varshik.tier.weigh", en: "Weigh" },
  rust: { key: "varshik.tier.hold", en: "Rest" },
};

export function tierOf(score: number): Tier {
  if (score >= 75) return "dark_green";
  if (score >= 60) return "light_green";
  if (score >= 45) return "amber";
  return "rust";
}

/** "light" | "dark", gated until mounted so server and first client render agree. */
export function useChartMode(): "light" | "dark" {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && resolvedTheme === "light" ? "light" : "dark";
}
