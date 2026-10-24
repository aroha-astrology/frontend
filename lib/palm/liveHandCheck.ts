"use client";

/**
 * Live framing feedback for the capture screen, replacing the hand-silhouette overlay that used
 * to be drawn over the preview. That overlay claimed an anatomy — a fixed gold outline every
 * hand was supposed to fit — which was wrong for most hands and told the user nothing about
 * whether the shot would actually be usable.
 *
 * This checks the real frame instead: is a hand detected, and does it fill enough of the frame
 * for the creases to be traceable? Reuses the same MediaPipe detector and the same palm-length
 * measure the mount-relief pass already relies on (handLandmarks.ts / mountRegions.ts), so it
 * adds a check, not a second vision stack.
 */

import { detectHandLandmarks } from "./handLandmarks";
import type { NormalizedLandmark } from "./mountRegions";

export type HandFraming = "none" | "tooFar" | "tooClose" | "good";

const WRIST = 0;
const MIDDLE_MCP = 9;

/** Wrist-to-middle-knuckle distance as a fraction of the frame — the same "palm length" measure
 * mountRegions.ts scales its sampling radius by, so the two agree on how big a hand is. Bands
 * are deliberately generous: this guides the shot, it must never block a usable one. */
const TOO_FAR_BELOW = 0.18;
const TOO_CLOSE_ABOVE = 0.62;

export function classifyFraming(landmarks: NormalizedLandmark[] | null): HandFraming {
  if (!landmarks || landmarks.length < 21) return "none";
  const wrist = landmarks[WRIST]!;
  const middle = landmarks[MIDDLE_MCP]!;
  const palmLength = Math.hypot(wrist.x - middle.x, wrist.y - middle.y);
  if (palmLength < TOO_FAR_BELOW) return "tooFar";
  if (palmLength > TOO_CLOSE_ABOVE) return "tooClose";
  return "good";
}

/**
 * Draws the current video frame into `canvas` and classifies the hand's framing.
 *
 * Never throws and never returns a hard failure: detection can be unavailable (CDN blocked,
 * unsupported browser, model still loading) and the capture flow has to keep working anyway,
 * so an unavailable detector reads as "none" — a hint that goes unshown, not an error.
 *
 * ponytail: polls a still frame through the IMAGE-mode detector rather than running MediaPipe's
 * VIDEO running mode. One detect every INTERVAL_MS is cheap and reuses the existing wrapper
 * unchanged; switch to VIDEO/LIVE_STREAM mode if the hint ever feels laggy on low-end devices.
 */
/** Long edge of the copy the hand detector looks at. */
const DETECT_LONG_EDGE = 960;

export interface FrameHandCheckResult {
  framing: HandFraming;
  landmarks: NormalizedLandmark[] | null;
  sharpness: number;
}

/** `withSharpness`: also score focus (a full-frame pass), only needed for auto-capture. */
export async function checkFrameForHandDetailed(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  withSharpness = false,
): Promise<FrameHandCheckResult> {
  try {
    if (!video.videoWidth || !video.videoHeight) {
      return { framing: "none", landmarks: null, sharpness: 0 };
    }
    // Detection does not need 4K: landmarks come back as fractions of the frame, so a 960 px copy
    // gives the same answer in a fraction of the time (a 4K canvas made every check a long task).
    const scale = Math.min(1, DETECT_LONG_EDGE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { framing: "none", landmarks: null, sharpness: 0 };
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const landmarks = await detectHandLandmarks(canvas);
    const framing = classifyFraming(landmarks);
    const sharpness = withSharpness && framing === "good" ? computeLaplacianVariance(canvas) : 0;
    return { framing, landmarks, sharpness };
  } catch {
    return { framing: "none", landmarks: null, sharpness: 0 };
  }
}

export async function checkFrameForHand(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<HandFraming> {
  return (await checkFrameForHandDetailed(video, canvas)).framing;
}

/** How often to run the check. Each tick is a WASM inference on the main thread while a camera
 * preview is running, so this is deliberately unhurried — the hint being a beat late costs
 * nothing, a stuttering preview costs the shot. */
export const HAND_CHECK_INTERVAL_MS = 1000;

/** Mean landmark movement as a fraction of the frame between consecutive frames. */
export function computeLandmarkMovement(
  prev: NormalizedLandmark[] | null,
  curr: NormalizedLandmark[] | null,
): number {
  if (!prev || !curr || prev.length !== curr.length || prev.length === 0) return 1.0;
  let totalDist = 0;
  for (let i = 0; i < prev.length; i++) {
    totalDist += Math.hypot(prev[i]!.x - curr[i]!.x, prev[i]!.y - curr[i]!.y);
  }
  return totalDist / prev.length;
}

/** Standard sharpness score via Laplacian variance over the downscaled canvas. */
export function computeLaplacianVariance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  const { width, height } = canvas;
  if (width < 3 || height < 3) return 0;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const c = 0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;

      const topIdx = ((y - 1) * width + x) * 4;
      const top = 0.299 * data[topIdx]! + 0.587 * data[topIdx + 1]! + 0.114 * data[topIdx + 2]!;

      const bottomIdx = ((y + 1) * width + x) * 4;
      const bottom = 0.299 * data[bottomIdx]! + 0.587 * data[bottomIdx + 1]! + 0.114 * data[bottomIdx + 2]!;

      const leftIdx = (y * width + (x - 1)) * 4;
      const left = 0.299 * data[leftIdx]! + 0.587 * data[leftIdx + 1]! + 0.114 * data[leftIdx + 2]!;

      const rightIdx = (y * width + (x + 1)) * 4;
      const right = 0.299 * data[rightIdx]! + 0.587 * data[rightIdx + 1]! + 0.114 * data[rightIdx + 2]!;

      const lap = top + bottom + left + right - 4 * c;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

