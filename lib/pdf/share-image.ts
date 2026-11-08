import { registerPlugin } from "@capacitor/core";

/**
 * Saving or sharing one picture of the screen (the Varshik share cards).
 *  - Android app: the native FileSaver plugin (saveImage, in app builds from 1.19), which keeps the file in
 *    Pictures/Aroha and opens the phone's share sheet.
 *  - Browsers and phones with the Web Share API: the share sheet, with the picture as a file.
 *  - Everything else: an ordinary download.
 */
interface ImageSaverPlugin {
  saveImage(options: { base64: string; fileName: string }): Promise<{ uri: string; saved: boolean }>;
}
const FileSaver = registerPlugin<ImageSaverPlugin>("FileSaver");

/** "shared": the share sheet took it. "saved": kept on the phone. "downloaded": handed to the browser. "cancelled": the reader closed the share sheet. */
export type ImageShareResult = "shared" | "saved" | "downloaded" | "cancelled";

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function isNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** A file name of plain letters, so the phone never has to change it. */
export function imageFileName(...parts: string[]): string {
  const slug = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "aroha-card"}.jpg`;
}

export async function shareOrSaveImage(blob: Blob, fileName: string, title: string): Promise<ImageShareResult> {
  if (await isNativeApp()) {
    try {
      const { saved } = await FileSaver.saveImage({ base64: await toDataUrl(blob), fileName });
      return saved ? "saved" : "shared";
    } catch {
      // An app build from before saveImage existed: fall through to the Web Share API.
    }
  }

  const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
  if (typeof navigator !== "undefined" && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // Any other refusal: fall back to a download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}
