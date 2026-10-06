import { registerPlugin } from "@capacitor/core";
import { textShareLink } from "./share";
import type { ShareTarget } from "./types";

/**
 * Sharing a story as a picture. The picture is the share card (a 360×640 box
 * in components/stories/ShareCard.tsx) drawn at three times its size, so it
 * comes out 1080×1920: a full-screen story on any phone.
 *
 * Three places it can run, each with a different way out:
 *  - the Android app (1.15+): the native StoryShare plugin opens the chosen app
 *    with the picture attached;
 *  - a phone browser: the system share sheet, picture attached;
 *  - a desktop browser, or an older Android app build: the picture can't be
 *    attached, so the caption and link go out and the picture is downloaded
 *    where a download works.
 */

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;
const CARD_SCALE = 3;

interface StorySharePlugin {
  /** Rejects with code "not_installed" when the target app isn't on the phone. App 1.15+. */
  shareImage(options: { base64: string; fileName: string; text: string; target: ShareTarget }): Promise<{ opened: boolean }>;
}

/** Local native plugin (mobile/android StorySharePlugin.java) — only on the Android app. */
const StoryShare = registerPlugin<StorySharePlugin>("StoryShare");

/**
 * What happened, so the sheet can say the right thing:
 * "shared" the picture went to an app; "linkOnly" only the caption and link did
 * (older app build); "saved" the picture was downloaded; "copied" the caption
 * is on the clipboard; "cancelled" the person closed the system sheet.
 */
export type ShareOutcome = "shared" | "linkOnly" | "saved" | "copied" | "cancelled";

/** Targets that are worth nothing without the picture. */
const PICTURE_ONLY: readonly ShareTarget[] = ["whatsappStatus", "instagramStory", "instagram"];

async function nativePlatform(): Promise<"plugin" | "noPlugin" | null> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    return Capacitor.isPluginAvailable("StoryShare") ? "plugin" : "noPlugin";
  } catch {
    return null; // @capacitor/core not resolvable — plain web build.
  }
}

/** Draws the share card element as a PNG data URL, 1080×1920. */
export async function captureCard(card: HTMLElement): Promise<string> {
  if (document.fonts?.ready) await document.fonts.ready;
  const { domToPng } = await import("modern-screenshot");
  return domToPng(card, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    scale: CARD_SCALE,
    backgroundColor: "#0b0920",
  });
}

async function toFile(dataUrl: string, fileName: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], fileName, { type: "image/png" });
}

function download(dataUrl: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function copy(text: string): Promise<ShareOutcome> {
  await navigator.clipboard.writeText(text);
  return "copied";
}

export interface ShareStoryOptions {
  target: ShareTarget;
  /** The words that go with the picture, install link included. */
  caption: string;
  fileName: string;
  /** The share card as a PNG data URL. Called only when the picture is needed. */
  getPng: () => Promise<string>;
}

export async function shareStory({ target, caption, fileName, getPng }: ShareStoryOptions): Promise<ShareOutcome> {
  if (target === "copy") return copy(caption);

  const link = textShareLink(target, caption);
  const native = await nativePlatform();

  // An SMS carries words only, wherever it is sent from.
  if (target === "sms" && link) {
    window.location.href = link;
    return "shared";
  }

  if (native === "plugin") {
    const base64 = await getPng();
    try {
      await StoryShare.shareImage({ base64, fileName, text: caption, target });
    } catch (err) {
      // The chosen app isn't installed: let the phone offer what it does have.
      if ((err as { code?: string } | null)?.code !== "not_installed") throw err;
      await StoryShare.shareImage({ base64, fileName, text: caption, target: "system" });
    }
    return "shared";
  }

  if (native === "noPlugin") {
    // An app build from before the plugin: words and link only.
    if (link && !PICTURE_ONLY.includes(target)) {
      window.location.href = link;
    } else {
      await copy(caption);
    }
    return "linkOnly";
  }

  // A browser. Phones can attach the picture to the system share sheet.
  const dataUrl = await getPng();
  const file = await toFile(dataUrl, fileName);
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption });
      return "shared";
    } catch (err) {
      if ((err as { name?: string } | null)?.name === "AbortError") return "cancelled";
      // Anything else (permission, an unsupported file type): fall through to the download.
    }
  }

  download(dataUrl, fileName);
  if (link) window.open(link, "_blank", "noopener");
  return "saved";
}
