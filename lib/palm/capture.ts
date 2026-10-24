/**
 * Camera-frame utilities shared by PalmCaptureWizard — no React, no DOM
 * framework dependency beyond the standard Canvas/Video APIs, so these are
 * easy to reason about in isolation.
 */

import { computeLaplacianVariance } from "./liveHandCheck";

const LOW_LIGHT_THRESHOLD = 60; // 0-255 average luminance — below this, warn the user to move to better light or use the torch.

/** A part of the frame as fractions of its width/height (0-1). */
export interface FrameCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where the four fingertips go (owner, 2026-10-24: "we don't need the full hand, draw a box").
 * The wizard draws this box over the live preview and the saved photo is cut to exactly it, so
 * the vision model gets the swirls at several times the pixels it got from a full-hand frame.
 * Fractions of the frame, so the box and the crop always agree whatever the camera resolution.
 */
export const FINGERTIP_BOX: FrameCrop = { x: 0.08, y: 0.32, w: 0.84, h: 0.36 };

/** Samples average luminance of the current video frame via a small downscaled canvas —
 * cheap enough to run on every animation frame. Returns null if the video has no data yet. */
export function sampleFrameBrightness(video: HTMLVideoElement, canvas: HTMLCanvasElement): number | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;
  const SAMPLE_SIZE = 32;
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  let sum = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
  }
  return sum / pixelCount;
}

export function isLowLight(brightness: number | null): boolean {
  return brightness !== null && brightness < LOW_LIGHT_THRESHOLD;
}

/**
 * Captures the current video frame to a JPEG Blob. The long edge was 1600 px at quality 0.88;
 * it is now 2560 px at 0.92 (2026-10-24, "quality is not good"): palm creases are a few pixels
 * wide, and the server downsizes for the model itself, so the app sends the most it can.
 * `crop` cuts the frame to a part of it before scaling (the fingertips box).
 */
export function captureFrameToJpeg(
  video: HTMLVideoElement,
  quality = 0.92,
  maxLongEdge = 2560,
  crop?: FrameCrop,
): Promise<Blob> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const sx = crop ? Math.round(crop.x * vw) : 0;
  const sy = crop ? Math.round(crop.y * vh) : 0;
  const sw = crop ? Math.round(crop.w * vw) : vw;
  const sh = crop ? Math.round(crop.h * vh) : vh;
  const scale = Math.min(1, maxLongEdge / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D context unavailable"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode frame as JPEG"))),
      "image/jpeg",
      quality,
    );
  });
}

/** Below this Laplacian variance (measured on a 640 px copy) a photo is called blurry. Not yet
 * calibrated on real palm photos: it only raises a "retake?" hint, it never blocks a photo. */
const BLUR_THRESHOLD = 25;

/** True when a captured photo looks out of focus. Null when it cannot be decoded here. */
export async function looksBlurry(blob: Blob): Promise<boolean | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(3, Math.round(bitmap.width * scale));
    canvas.height = Math.max(3, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return computeLaplacianVariance(canvas) < BLUR_THRESHOLD;
  } catch {
    return null;
  }
}
