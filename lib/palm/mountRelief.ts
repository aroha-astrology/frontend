/**
 * Deterministic image-analysis pass over a mount's pixel region — the CV half of the
 * cross-validation design. A raised, fleshy mount catches more directional-light variation
 * (highlights + shadow gradients) under ordinary indoor lighting than a flat area, so local
 * luminance variance is a reasonable, defensible proxy for physical relief on a single 2D
 * photo (no depth sensor required). This is a RELATIVE signal — it says "more/less textured
 * than this hand's other mounts", not an absolute physical measurement — see
 * normalizeReliefScores below.
 */

import type { MountKey, MountRegion } from "./mountRegions";

/** Standard luminance weighting (same formula used by lib/palm/capture.ts's low-light
 * brightness sampler, for consistency across this feature's image-analysis code). */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Samples every pixel within the circular region (normalized center + radius, against an
 * image of the given pixel dimensions) and returns the standard deviation of luminance across
 * those pixels. `pixels` is an RGBA buffer (e.g. ImageData.data) in row-major order.
 */
export function computeRegionLuminanceStdDev(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  region: MountRegion,
): number {
  const cx = region.cx * imageWidth;
  const cy = region.cy * imageHeight;
  const r = region.radius * Math.min(imageWidth, imageHeight);
  const r2 = r * r;

  const minX = Math.max(0, Math.floor(cx - r));
  const maxX = Math.min(imageWidth - 1, Math.ceil(cx + r));
  const minY = Math.max(0, Math.floor(cy - r));
  const maxY = Math.min(imageHeight - 1, Math.ceil(cy + r));

  const samples: number[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * imageWidth + x) * 4;
      samples.push(luminance(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!));
    }
  }
  if (samples.length === 0) return 0;

  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length;
  return Math.sqrt(variance);
}

/**
 * Min-max normalizes raw per-mount relief scores (from computeRegionLuminanceStdDev, one call
 * per mount on the SAME photo) to [0, 1] so they're comparable to each other regardless of
 * this photo's overall lighting/exposure — a mount can only be "more prominent than the other
 * 8 on this hand", never compared across different people's photos. All-identical input (a
 * degenerate/flat image) returns 0.5 everywhere rather than dividing by zero.
 */
export function normalizeReliefScores(
  raw: Record<MountKey, number>,
): Record<MountKey, number> {
  const values = Object.values(raw);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const normalized = {} as Record<MountKey, number>;
  for (const key of Object.keys(raw) as MountKey[]) {
    normalized[key] = range === 0 ? 0.5 : (raw[key] - min) / range;
  }
  return normalized;
}
