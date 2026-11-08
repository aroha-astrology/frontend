/**
 * The artwork, by the codes in docs/varshik-2027-image-prompts.md. The owner's finished files are
 * added at the very end of the build; until a code is listed in READY it has no file, `art()`
 * returns undefined and <ArtSlot> draws its labelled frame, so nothing 404s and nothing stretches.
 *
 * To add art: convert the file to WebP in public/varshphal/<code>.webp (backgrounds removed from
 * the medallions, icons and A46) and add its code to READY. The slot keeps its ratio, so no layout moves.
 */
import type { ArtKind } from "./ArtSlot";

export const READY: ReadonlySet<string> = new Set<string>([
  // chapter art, planet medallions, area headers and the twelve month banners (the best of each pair, 2026-11-07)
  "A1", "A2", "A3", "A4", "A5", "A6",
  "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15", "A16",
  "A17", "A18", "A19", "A20", "A21", "A22",
  "A24", "A25", "A26", "A27", "A28", "A29", "A30", "A31", "A32", "A33", "A34", "A35",
  "A23", "A40", "A41", "A42", "A43", "A44", "A45", "A49", "A51", "A52", "A53",
  // made from the cover and in code
  "A36", "A46", "A47",
]);

/** Every code the report uses has its image now (2026-11-07). A code missing from READY still draws the labelled frame. */

export const ART_KIND: Record<string, ArtKind> = {
  A1: "cover", A2: "opener", A3: "opener", A4: "opener", A5: "opener",
  A6: "banner",
  // A7 spare. A8-A16 planet medallions, A17-A23 area headers, A24-A35 month banners.
  A36: "banner", A37: "opener", A38: "opener", A39: "banner",
  A40: "medallion", A41: "medallion", A42: "medallion", A43: "medallion", A44: "medallion", A45: "medallion",
  A46: "medallion", A47: "divider", A49: "medallion", A50: "banner", A51: "opener", A52: "banner", A53: "banner",
};
for (let i = 8; i <= 16; i++) ART_KIND[`A${i}`] = "medallion";
for (let i = 17; i <= 35; i++) ART_KIND[`A${i}`] = "banner";

export const PLANET_ART: Record<string, string> = {
  Sun: "A8", Moon: "A9", Mars: "A10", Mercury: "A11", Jupiter: "A12", Venus: "A13", Saturn: "A14", Rahu: "A15", Ketu: "A16",
};
export const AREA_ART: Record<string, string> = {
  love: "A17", career: "A18", money: "A19", health: "A20", family: "A21", growth: "A22", travel: "A23",
};
export const monthArt = (m: number) => `A${24 + m}`;
export const CHAPTER_ART = ["A1", "A2", "A3", "A4", "A5", "A6"];

/** The file for a code, or undefined while the art has not been added. */
/** The sharpened 2x file for the PDF (Real-ESRGAN x4plus-anime, 4x then down to 2x), where one exists. */
export function artHd(code: string): string | undefined {
  if (!READY.has(code) || code === "A47") return undefined;
  return `/varshphal/hd/${code}.webp`;
}

export function art(code: string): string | undefined {
  if (!READY.has(code)) return undefined;
  return code === "A47" ? "/varshphal/A47.svg" : `/varshphal/${code}.webp`;
}
