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
export async function checkFrameForHand(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<HandFraming> {
  try {
    if (!video.videoWidth || !video.videoHeight) return "none";
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "none";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return classifyFraming(await detectHandLandmarks(canvas));
  } catch {
    return "none";
  }
}

/** How often to run the check. Fast enough to feel live while the user is positioning, slow
 * enough that a WASM inference per tick stays unnoticeable. */
export const HAND_CHECK_INTERVAL_MS = 600;
