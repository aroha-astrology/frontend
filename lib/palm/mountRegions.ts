/**
 * Derives the approximate image-space region of each of the 9 Hasta Samudrika mounts from
 * MediaPipe's 21-point hand landmarks, so the CV relief pass (mountRelief.ts) knows exactly
 * where on the actual photo to sample — far more precise than the frontend overlay's fixed,
 * anatomically-average positions (PalmAnnotatedView.tsx), which don't know this specific
 * hand's proportions or how it's framed in the shot.
 *
 * These boundaries are necessarily approximate — classical palmistry doesn't define mount
 * extents to pixel precision even between human readers — but anchoring them to real detected
 * joints (rather than a fixed image-fraction guess) is a meaningful accuracy improvement over
 * guessing blind.
 */

export interface NormalizedLandmark {
  x: number;
  y: number;
}

export const MOUNT_KEYS = [
  "jupiter",
  "saturn",
  "apollo",
  "mercury",
  "venus",
  "luna",
  "marsUpper",
  "marsLower",
  "rahuPlain",
] as const;

export type MountKey = (typeof MOUNT_KEYS)[number];

export interface MountRegion {
  cx: number;
  cy: number;
  radius: number;
}

// MediaPipe Hand Landmarker's standard 21-point indexing.
const WRIST = 0;
const THUMB_MCP = 2;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

function lerp(a: NormalizedLandmark, b: NormalizedLandmark, t: number): NormalizedLandmark {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** A finger-base mount sits just below (palm-ward of) that finger's MCP joint — 35% of the
 * way from the MCP toward the wrist, closer to the knuckle than to the wrist. */
function fingerBaseMount(mcp: NormalizedLandmark, wrist: NormalizedLandmark): NormalizedLandmark {
  return lerp(mcp, wrist, 0.35);
}

export function deriveMountRegions(landmarks: NormalizedLandmark[]): Record<MountKey, MountRegion> {
  const wrist = landmarks[WRIST]!;
  const thumbMcp = landmarks[THUMB_MCP]!;
  const indexMcp = landmarks[INDEX_MCP]!;
  const middleMcp = landmarks[MIDDLE_MCP]!;
  const ringMcp = landmarks[RING_MCP]!;
  const pinkyMcp = landmarks[PINKY_MCP]!;

  // "Palm length" (wrist to middle-finger MCP) is the one hand-relative distance that stays
  // stable regardless of finger spread — used to scale every region's radius so mount sampling
  // works the same whether the hand fills the frame or sits further from the camera.
  const palmLength = dist(wrist, middleMcp);
  const radius = palmLength * 0.22;

  const jupiter = fingerBaseMount(indexMcp, wrist);
  const saturn = fingerBaseMount(middleMcp, wrist);
  const apollo = fingerBaseMount(ringMcp, wrist);
  const mercury = fingerBaseMount(pinkyMcp, wrist);

  // Venus: the thenar pad between the thumb base and the wrist.
  const venus = lerp(thumbMcp, wrist, 0.5);
  // Luna: the hypothenar pad, opposite Venus — along the pinky-to-wrist line, biased toward
  // the wrist, then nudged further to the ulnar (outer) side away from the palm center.
  const lunaBase = lerp(pinkyMcp, wrist, 0.6);
  const palmCenter = lerp(indexMcp, pinkyMcp, 0.5);
  const luna = lerp(lunaBase, { x: lunaBase.x + (lunaBase.x - palmCenter.x), y: lunaBase.y }, 0.3);

  // Mars Upper: mid-palm on the ulnar (pinky) edge, between the mercury/luna line.
  const marsUpper = lerp(mercury, luna, 0.5);
  // Mars Lower: near the thumb-index web, between Jupiter and Venus.
  const marsLower = lerp(jupiter, venus, 0.5);
  // Rahu / Plain of Mars: the palm's geometric center.
  const rahuPlain = {
    x: (wrist.x + indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 5,
    y: (wrist.y + indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 5,
  };

  const centers: Record<MountKey, NormalizedLandmark> = {
    jupiter,
    saturn,
    apollo,
    mercury,
    venus,
    luna,
    marsUpper,
    marsLower,
    rahuPlain,
  };

  const regions = {} as Record<MountKey, MountRegion>;
  for (const key of MOUNT_KEYS) {
    regions[key] = { cx: centers[key].x, cy: centers[key].y, radius };
  }
  return regions;
}
