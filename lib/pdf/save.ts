import { registerPlugin } from "@capacitor/core";

interface FileSaverPlugin {
  /**
   * Writes the file into the phone's Downloads/Aroha folder and opens it. Before Android 10
   * it can only open it (`saved` is false), and rejects if the phone has no PDF viewer.
   */
  savePdf(options: { base64: string; fileName: string }): Promise<{ uri: string; saved: boolean; opened: boolean }>;
}

/** Local native plugin (mobile/android FileSaverPlugin.java) — only on the Android app. */
const FileSaver = registerPlugin<FileSaverPlugin>("FileSaver");

/** "saved": written to the phone's Downloads folder. "downloaded": handed to the browser, or to a PDF viewer. */
export type PdfSaveResult = "saved" | "downloaded";

async function isNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false; // @capacitor/core not resolvable — plain web build.
  }
}

/**
 * Whether this device can keep a PDF at all. A browser always can. The app
 * shows the site inside a webview, where a normal download does nothing, so it
 * needs the native saver; app builds from before that was added can't.
 */
export async function canSavePdf(): Promise<boolean> {
  if (!(await isNativeApp())) return true;
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isPluginAvailable("FileSaver");
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function savePdf(bytes: Uint8Array, fileName: string): Promise<PdfSaveResult> {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });

  if (await isNativeApp()) {
    const { saved } = await FileSaver.savePdf({ base64: await toDataUrl(blob), fileName });
    return saved ? "saved" : "downloaded";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // The browser reads the file after the click returns, so the link can't be dropped at once.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}

/** A file name from plain-letter parts: "kp_annual" gives "aroha-kp-annual.pdf". */
export function pdfFileName(...parts: Array<string | null | undefined>): string {
  const slug = parts
    .filter((part): part is string => !!part)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return `aroha-${slug || "report"}.pdf`;
}
