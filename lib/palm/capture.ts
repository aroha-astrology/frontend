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

/**
 * Long edge of a saved photo. The server cuts the front photo to 1600 px for the model
 * (backend lib/palm/image-prep.ts), so anything beyond about 2048 only made the shutter slower: a
 * 2560x1440 JPEG took over 3 s to encode at 6x CPU slowdown, and its extra pixels never reached the
 * model. 2048 keeps the original sharp enough to downscale well.
 */
export const CAPTURE_LONG_EDGE = 2048;

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
 * Captures the current video frame. The long edge was 1600 px at quality 0.88; it is now 2048 px at
 * 0.9 (2026-10-24, "quality is not good", then "it takes some time to capture"): sharper than before
 * but not past what the server uses. `crop` cuts the frame to a part
 * of it before scaling (the fingertips box).
 *
 * Returns the scaled canvas too: the blur check reads it directly instead of decoding the JPEG
 * again, which kept the review screen waiting (2026-10-24, "it takes some time to capture").
 */
export function captureFrame(
  video: HTMLVideoElement,
  quality = 0.9,
  maxLongEdge = CAPTURE_LONG_EDGE,
  crop?: FrameCrop,
): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
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
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, canvas }) : reject(new Error("Failed to encode frame as JPEG"))),
      "image/jpeg",
      quality,
    );
  });
}

/** Same as captureFrame, for callers that only want the JPEG. */
export async function captureFrameToJpeg(
  video: HTMLVideoElement,
  quality = 0.9,
  maxLongEdge = CAPTURE_LONG_EDGE,
  crop?: FrameCrop,
): Promise<Blob> {
  return (await captureFrame(video, quality, maxLongEdge, crop)).blob;
}

/** Below this Laplacian variance (measured on a 640 px copy) a photo is called blurry. Not yet
 * calibrated on real palm photos: it only raises a "retake?" hint, it never blocks a photo. */
const BLUR_THRESHOLD = 25;

/** Whether an already-drawn canvas looks out of focus: a 640 px copy is scored, a few milliseconds. */
export function canvasLooksBlurry(source: HTMLCanvasElement): boolean | null {
  try {
    const scale = Math.min(1, 640 / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(3, Math.round(source.width * scale));
    canvas.height = Math.max(3, Math.round(source.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return computeLaplacianVariance(canvas) < BLUR_THRESHOLD;
  } catch {
    return null;
  }
}

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

/** The server refuses any request over 6 MB; stay clear of it with room for the headers. */
export const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    // 'from-image' applies the phone's rotation flag, so a portrait gallery photo is not sideways.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Makes a photo from the gallery safe to upload (2026-10-24: "if user uploads an image it's
 * failing"). Phone photos are 4-12 MB, sometimes HEIC or PNG, and the server rejects anything over
 * 6 MB, so the photo is decoded, cut down to `maxLongEdge` pixels on its long side and re-encoded
 * as JPEG, trying lower qualities and then a smaller size until it fits `MAX_UPLOAD_BYTES`.
 * Throws when the browser cannot read the file at all, so the caller can say so.
 */
export async function optimizePhoto(file: Blob, maxLongEdge = CAPTURE_LONG_EDGE): Promise<Blob> {
  const img = await decode(file);
  try {
    if (!img.width || !img.height) throw new Error("Unreadable image");
    let edge = maxLongEdge;
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, edge / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.92, 0.84, 0.76]) {
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
      }
      edge = Math.round(edge * 0.75); // still too heavy (a very noisy photo): fewer pixels
    }
    throw new Error("Photo still too large after shrinking");
  } finally {
    img.close();
  }
}
