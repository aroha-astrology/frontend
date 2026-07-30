"use client";

/**
 * Orchestrates the full CV mount-relief pass for one captured front-view frame: detect hand
 * landmarks -> derive the 9 mount regions -> sample pixel variance in each -> normalize.
 * Thin glue over the tested pure functions in mountRegions.ts/mountRelief.ts; not unit-tested
 * itself (needs a real Image/Canvas + WASM model), same posture as handLandmarks.ts.
 *
 * Never throws and never blocks the capture flow — see the module-level rationale in
 * handLandmarks.ts: this is an additive accuracy signal, not a required step.
 */

import { detectHandLandmarks } from "./handLandmarks";
import { deriveMountRegions, MOUNT_KEYS, type MountKey } from "./mountRegions";
import { computeRegionLuminanceStdDev, normalizeReliefScores } from "./mountRelief";

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };
    img.src = url;
  });
}

export async function computeMountRelief(blob: Blob): Promise<Record<MountKey, number> | null> {
  try {
    const img = await loadImage(blob);
    const landmarks = await detectHandLandmarks(img);
    if (!landmarks) return null;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const regions = deriveMountRegions(landmarks);
    const raw = {} as Record<MountKey, number>;
    for (const key of MOUNT_KEYS) {
      raw[key] = computeRegionLuminanceStdDev(data, canvas.width, canvas.height, regions[key]);
    }
    return normalizeReliefScores(raw);
  } catch {
    return null;
  }
}
