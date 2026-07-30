import { describe, it, expect } from "vitest";
import { deriveMountRegions, MOUNT_KEYS } from "./mountRegions";
import type { NormalizedLandmark } from "./mountRegions";

/**
 * A plausible open right hand, fingers spread, held upright in frame — fingertips near the
 * top of the image (small y), wrist near the bottom (large y), matching the capture wizard's
 * "primaryFront" instruction. Coordinates are illustrative, not derived from a real photo.
 * Index order matches MediaPipe's 21-point hand landmark convention.
 */
function sampleLandmarks(): NormalizedLandmark[] {
  const l: NormalizedLandmark[] = new Array(21);
  l[0] = { x: 0.5, y: 0.85 }; // WRIST
  l[1] = { x: 0.35, y: 0.68 }; // THUMB_CMC
  l[2] = { x: 0.28, y: 0.58 }; // THUMB_MCP
  l[3] = { x: 0.24, y: 0.48 }; // THUMB_IP
  l[4] = { x: 0.2, y: 0.4 }; // THUMB_TIP
  l[5] = { x: 0.38, y: 0.42 }; // INDEX_MCP
  l[6] = { x: 0.37, y: 0.3 };
  l[7] = { x: 0.36, y: 0.2 };
  l[8] = { x: 0.35, y: 0.12 }; // INDEX_TIP
  l[9] = { x: 0.5, y: 0.4 }; // MIDDLE_MCP
  l[10] = { x: 0.5, y: 0.26 };
  l[11] = { x: 0.5, y: 0.15 };
  l[12] = { x: 0.5, y: 0.06 }; // MIDDLE_TIP
  l[13] = { x: 0.62, y: 0.42 }; // RING_MCP
  l[14] = { x: 0.63, y: 0.3 };
  l[15] = { x: 0.64, y: 0.2 };
  l[16] = { x: 0.65, y: 0.13 }; // RING_TIP
  l[17] = { x: 0.72, y: 0.48 }; // PINKY_MCP
  l[18] = { x: 0.74, y: 0.38 };
  l[19] = { x: 0.75, y: 0.3 };
  l[20] = { x: 0.76, y: 0.24 }; // PINKY_TIP
  return l;
}

describe("deriveMountRegions", () => {
  it("returns a region for every one of the 9 Hasta Samudrika mounts", () => {
    const regions = deriveMountRegions(sampleLandmarks());
    expect(Object.keys(regions).sort()).toEqual([...MOUNT_KEYS].sort());
  });

  it("places jupiter between the index MCP and the wrist, closer to the MCP", () => {
    const landmarks = sampleLandmarks();
    const regions = deriveMountRegions(landmarks);
    const indexMcp = landmarks[5]!;
    const wrist = landmarks[0]!;
    const jupiter = regions.jupiter;

    // y strictly between MCP.y and wrist.y (mount sits toward the palm, not at the knuckle itself).
    expect(jupiter.cy).toBeGreaterThan(indexMcp.y);
    expect(jupiter.cy).toBeLessThan(wrist.y);
    // Closer to the MCP than to the wrist (mounts sit just below the finger base).
    const distToMcp = Math.abs(jupiter.cy - indexMcp.y);
    const distToWrist = Math.abs(jupiter.cy - wrist.y);
    expect(distToMcp).toBeLessThan(distToWrist);
  });

  it("places the four finger-base mounts in index -> pinky x order (jupiter, saturn, apollo, mercury)", () => {
    const regions = deriveMountRegions(sampleLandmarks());
    expect(regions.jupiter.cx).toBeLessThan(regions.saturn.cx);
    expect(regions.saturn.cx).toBeLessThan(regions.apollo.cx);
    expect(regions.apollo.cx).toBeLessThan(regions.mercury.cx);
  });

  it("places rahuPlain near the centroid of the wrist and the four MCP joints", () => {
    const landmarks = sampleLandmarks();
    const regions = deriveMountRegions(landmarks);
    const pts = [landmarks[0]!, landmarks[5]!, landmarks[9]!, landmarks[13]!, landmarks[17]!];
    const expectedCx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const expectedCy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    expect(regions.rahuPlain.cx).toBeCloseTo(expectedCx, 2);
    expect(regions.rahuPlain.cy).toBeCloseTo(expectedCy, 2);
  });

  it("scales the region radius with the hand's own size (palm length), not a fixed pixel constant", () => {
    const small = sampleLandmarks();
    const big = small.map((p) => ({ x: 0.5 + (p.x - 0.5) * 2, y: 0.5 + (p.y - 0.5) * 2 }));
    const smallRegions = deriveMountRegions(small);
    const bigRegions = deriveMountRegions(big);
    expect(bigRegions.jupiter.radius).toBeGreaterThan(smallRegions.jupiter.radius * 1.5);
  });

  it("keeps every region's center within the normalized [0,1] image bounds for a normal hand pose", () => {
    const regions = deriveMountRegions(sampleLandmarks());
    for (const key of MOUNT_KEYS) {
      expect(regions[key].cx).toBeGreaterThanOrEqual(0);
      expect(regions[key].cx).toBeLessThanOrEqual(1);
      expect(regions[key].cy).toBeGreaterThanOrEqual(0);
      expect(regions[key].cy).toBeLessThanOrEqual(1);
    }
  });
});
