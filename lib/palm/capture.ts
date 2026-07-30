/**
 * Camera-frame utilities shared by PalmCaptureWizard — no React, no DOM
 * framework dependency beyond the standard Canvas/Video APIs, so these are
 * easy to reason about in isolation.
 */

const LOW_LIGHT_THRESHOLD = 60; // 0-255 average luminance — below this, warn the user to move to better light or use the torch.

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

/** Captures the current video frame to a JPEG Blob, downscaled to a sane long edge so
 * uploads stay fast without meaningfully hurting the vision model's ability to read lines. */
export function captureFrameToJpeg(video: HTMLVideoElement, quality = 0.88, maxLongEdge = 1600): Promise<Blob> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.min(1, maxLongEdge / Math.max(vw, vh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D context unavailable"));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode frame as JPEG"))),
      "image/jpeg",
      quality,
    );
  });
}
