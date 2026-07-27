"use client";

/**
 * Thin, lazy-loaded wrapper around MediaPipe's Hand Landmarker — used once per captured
 * front-view frame (primaryFront / secondaryFront) to locate the 21 hand joints, which
 * mountRegions.ts then anchors the 9 Hasta Samudrika mount regions to for the CV relief pass
 * (mountRelief.ts). Not unit-tested directly — it's a real WASM/model-loading integration with
 * no meaningful way to fake a hand in a photo; the pure geometry/pixel-analysis math it feeds
 * (mountRegions.ts, mountRelief.ts) IS unit-tested.
 *
 * IMAGE running mode (not VIDEO/LIVE_STREAM): this runs once against an already-captured
 * still frame after the user taps "Use This Photo", not against the live camera preview — no
 * real-time auto-shutter alignment is implemented in this pass (see the plan's note on that
 * being a deliberately scoped-down v1).
 */

import type { NormalizedLandmark } from "./mountRegions";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let landmarkerPromise: Promise<any> | null = null;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      return HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "IMAGE",
        numHands: 1,
      });
    })().catch((err) => {
      landmarkerPromise = null; // allow a retry on the next call rather than caching a permanent failure
      throw err;
    });
  }
  return landmarkerPromise;
}

/**
 * Detects the 21 hand landmarks in a captured frame. Returns null (never throws) on any
 * failure — a CDN blip, an unsupported browser, no hand actually found in frame — since this
 * whole feature is an additive accuracy signal, not a required step; the vision-model-only
 * reading still works fine without it (see palm-rules.ts's cross-validation, which treats
 * missing CV data as "no additional signal", not an error).
 */
export async function detectHandLandmarks(image: HTMLImageElement | HTMLCanvasElement): Promise<NormalizedLandmark[] | null> {
  try {
    const landmarker = await getLandmarker();
    const result = landmarker.detect(image);
    const hand = result?.landmarks?.[0];
    if (!hand || hand.length !== 21) return null;
    return hand.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
  } catch {
    return null;
  }
}
