import { A4_HEIGHT_PT, A4_WIDTH_PT, buildImagePdf, type PdfImagePage } from "./jpeg-pdf";

/**
 * A PDF with exactly one page per element: each element is a fixed-size A4 box that is drawn on its
 * own, so nothing is ever cut or merged and the page count is the element count. The same
 * modern-screenshot drawing as ./capture.ts, without its slicing.
 *
 * Pages are drawn one at a time and the canvas is reused, so memory stays at one page.
 */

/** Pixels across one page. 1.45 x the 794 px box is about 1150 px (about 140 dpi): sharp on a phone, light to share. */
const SCALE = 1.45;
const JPEG_QUALITY = 0.78;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("The page image could not be encoded"));
        blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      "image/jpeg",
      quality,
    );
  });
}

export interface PagesCaptureOptions {
  title?: string;
  quality?: number;
  scale?: number;
  /** Called after each page, so the caller can show progress. */
  onPage?: (done: number, total: number) => void;
}

export async function capturePagesToPdf(boxes: HTMLElement[], options: PagesCaptureOptions = {}): Promise<Uint8Array> {
  if (boxes.length === 0) throw new Error("Nothing to capture");
  if (document.fonts?.ready) await document.fonts.ready;
  await nextFrame();
  const { domToCanvas } = await import("modern-screenshot");
  const background = getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#000000";
  const scale = options.scale ?? SCALE;
  const quality = options.quality ?? JPEG_QUALITY;

  const out = document.createElement("canvas");
  const pages: PdfImagePage[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]!;
    const shot = await domToCanvas(box, {
      width: box.offsetWidth,
      height: box.offsetHeight,
      scale,
      backgroundColor: background,
    });
    // Flatten onto an opaque canvas: JPEG has no alpha.
    out.width = shot.width;
    out.height = shot.height;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("No canvas");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(shot, 0, 0);
    pages.push({ jpeg: await canvasToJpeg(out, quality), pixelWidth: out.width, pixelHeight: out.height });
    shot.width = 0;
    shot.height = 0;
    options.onPage?.(i + 1, boxes.length);
  }
  out.width = 0;
  out.height = 0;
  return buildImagePdf(pages, A4_WIDTH_PT, A4_HEIGHT_PT, { title: options.title });
}
