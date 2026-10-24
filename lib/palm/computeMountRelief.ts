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

import { detectHand, type HandLandmarkPoint } from "./handLandmarks";
import { deriveMountRegions, MOUNT_KEYS, type MountKey, type MountRegion } from "./mountRegions";
import {
  computeRegionLuminanceStdDev,
  normalizeReliefScores,
  computeRegionDomeConvexity,
  normalizeDomeReliefScores,
} from "./mountRelief";

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

export interface MountReliefResult {
  /** Per-mount 0-1 relief score — the CV cross-check palm-rules.ts reads. */
  scores: Record<MountKey, number>;
  /** Where each mount actually sits on THIS photograph. Derived here anyway to know where to
   * sample; returning it lets the annotated overlay draw its dots on the real hand in the real
   * framing instead of at fixed anatomical averages. */
  regions: Record<MountKey, MountRegion>;
  /** 21 3D landmarks in normalized frame coordinates. */
  landmarks?: HandLandmarkPoint[];
  handedness?: "Left" | "Right";
  handednessScore?: number;
  imageWidth?: number;
  imageHeight?: number;
}

export async function computeMountRelief(
  blob: Blob,
  options?: { useDomeConvexity?: boolean },
): Promise<MountReliefResult | null> {
  try {
    const img = await loadImage(blob);
    const handResult = await detectHand(img);
    if (!handResult) return null;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const regions = deriveMountRegions(handResult.landmarks);
    const raw = {} as Record<MountKey, number>;

    const useDome =
      options?.useDomeConvexity ??
      (typeof process !== "undefined" &&
        process.env.NEXT_PUBLIC_PALM_DOME_RELIEF === "true");

    if (useDome) {
      const rahuRegion = regions.rahuPlain;
      for (const key of MOUNT_KEYS) {
        raw[key] = computeRegionDomeConvexity(
          data,
          canvas.width,
          canvas.height,
          regions[key],
          rahuRegion,
        );
      }
      return {
        scores: normalizeDomeReliefScores(raw),
        regions,
        landmarks: handResult.landmarks,
        handedness: handResult.handedness,
        handednessScore: handResult.handednessScore,
        imageWidth: handResult.imageWidth,
        imageHeight: handResult.imageHeight,
      };
    } else {
      for (const key of MOUNT_KEYS) {
        raw[key] = computeRegionLuminanceStdDev(
          data,
          canvas.width,
          canvas.height,
          regions[key],
        );
      }
      return {
        scores: normalizeReliefScores(raw),
        regions,
        landmarks: handResult.landmarks,
        handedness: handResult.handedness,
        handednessScore: handResult.handednessScore,
        imageWidth: handResult.imageWidth,
        imageHeight: handResult.imageHeight,
      };
    }
  } catch {
    return null;
  }
}
