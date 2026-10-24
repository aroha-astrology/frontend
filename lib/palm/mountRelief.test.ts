import { describe, it, expect } from "vitest";
import {
  computeRegionLuminanceStdDev,
  normalizeReliefScores,
  computeRegionDomeConvexity,
  normalizeDomeReliefScores,
} from "./mountRelief";
import type { MountRegion } from "./mountRegions";

/** Builds a synthetic RGBA buffer of the given size, filled by a per-pixel luminance callback
 * (0-255). Alpha is always opaque — irrelevant to luminance. */
function buildImage(width: number, height: number, luminanceAt: (x: number, y: number) => number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const v = luminanceAt(x, y);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return data;
}

const CENTERED_REGION: MountRegion = { cx: 0.5, cy: 0.5, radius: 0.3 };

describe("computeRegionLuminanceStdDev", () => {
  it("returns ~0 for a perfectly flat (uniform luminance) region", () => {
    const size = 40;
    const pixels = buildImage(size, size, () => 128);
    const stdDev = computeRegionLuminanceStdDev(pixels, size, size, CENTERED_REGION);
    expect(stdDev).toBeCloseTo(0, 1);
  });

  it("returns a high value for a high-contrast checkerboard region (proxy for relief/shading variation)", () => {
    const size = 40;
    const pixels = buildImage(size, size, (x, y) => ((x + y) % 2 === 0 ? 40 : 220));
    const stdDev = computeRegionLuminanceStdDev(pixels, size, size, CENTERED_REGION);
    expect(stdDev).toBeGreaterThan(50);
  });

  it("a textured region scores higher than a flat region on the same image", () => {
    const size = 60;
    // Left half flat, right half checkerboard.
    const pixels = buildImage(size, size, (x, y) => (x < size / 2 ? 128 : (x + y) % 2 === 0 ? 40 : 220));
    const flatRegion: MountRegion = { cx: 0.2, cy: 0.5, radius: 0.15 };
    const texturedRegion: MountRegion = { cx: 0.8, cy: 0.5, radius: 0.15 };
    const flatScore = computeRegionLuminanceStdDev(pixels, size, size, flatRegion);
    const texturedScore = computeRegionLuminanceStdDev(pixels, size, size, texturedRegion);
    expect(texturedScore).toBeGreaterThan(flatScore);
  });

  it("only samples pixels within the circular region, not the whole image", () => {
    const size = 60;
    // Checkerboard only in a small corner far from the sampled region — a bug that samples the
    // whole image (or the wrong area) would pick this up; a correct implementation ignores it.
    const pixels = buildImage(size, size, (x, y) => (x < 10 && y < 10 ? (x + y % 2 === 0 ? 40 : 220) : 128));
    const stdDev = computeRegionLuminanceStdDev(pixels, size, size, CENTERED_REGION);
    expect(stdDev).toBeCloseTo(0, 1);
  });
});

describe("normalizeReliefScores", () => {
  it("min-max normalizes to [0, 1], preserving relative order", () => {
    const raw = { jupiter: 10, saturn: 30, apollo: 20, mercury: 40, venus: 15, luna: 25, marsUpper: 35, marsLower: 12, rahuPlain: 18 };
    const normalized = normalizeReliefScores(raw as never);
    expect(Math.min(...Object.values(normalized))).toBeCloseTo(0, 5);
    expect(Math.max(...Object.values(normalized))).toBeCloseTo(1, 5);
    expect(normalized.mercury).toBeGreaterThan(normalized.jupiter);
    expect(normalized.saturn).toBeGreaterThan(normalized.apollo);
  });

  it("returns a flat 0.5 for every mount when all raw scores are identical (no division by zero)", () => {
    const raw = { jupiter: 20, saturn: 20, apollo: 20, mercury: 20, venus: 20, luna: 20, marsUpper: 20, marsLower: 20, rahuPlain: 20 };
    const normalized = normalizeReliefScores(raw as never);
    for (const v of Object.values(normalized)) {
      expect(v).toBeCloseTo(0.5, 5);
    }
  });
});

describe("computeRegionDomeConvexity", () => {
  it("returns ~0 for a flat region", () => {
    const size = 60;
    const pixels = buildImage(size, size, () => 140);
    const score = computeRegionDomeConvexity(pixels, size, size, CENTERED_REGION);
    expect(score).toBeCloseTo(0, 1);
  });

  it("scores positively when center is brighter than the annulus (dome convexity)", () => {
    const size = 80;
    const cx = 40;
    const cy = 40;
    // Bright center dome sloping down to darker annulus
    const pixels = buildImage(size, size, (x, y) => {
      const dist = Math.hypot(x - cx, y - cy);
      return Math.max(50, 200 - dist * 4);
    });
    const score = computeRegionDomeConvexity(pixels, size, size, CENTERED_REGION);
    expect(score).toBeGreaterThan(15);
  });

  it("compares against Rahu plain reference when provided", () => {
    const size = 100;
    const rahuRegion: MountRegion = { cx: 0.5, cy: 0.8, radius: 0.15 };
    const mountRegion: MountRegion = { cx: 0.5, cy: 0.3, radius: 0.15 };
    // Mount is bright, Rahu plain is dim flat
    const pixels = buildImage(size, size, (_x, y) => {
      if (y > 60) return 80; // Rahu plain area
      return 180; // Mount area
    });
    const score = computeRegionDomeConvexity(pixels, size, size, mountRegion, rahuRegion);
    expect(score).toBeGreaterThan(20);
  });
});

describe("normalizeDomeReliefScores", () => {
  it("normalizes the 8 non-Rahu mounts to [0, 1] and fixes Rahu at 0.5", () => {
    const raw = {
      jupiter: 10,
      saturn: 30,
      apollo: 20,
      mercury: 50,
      venus: 15,
      luna: 25,
      marsUpper: 35,
      marsLower: 12,
      rahuPlain: 999, // should be ignored in min/max and pinned to 0.5
    };
    const normalized = normalizeDomeReliefScores(raw as never);
    expect(normalized.rahuPlain).toBe(0.5);
    expect(normalized.jupiter).toBeCloseTo(0, 5);
    expect(normalized.mercury).toBeCloseTo(1, 5);
    expect(normalized.saturn).toBeGreaterThan(normalized.apollo);
  });
});
