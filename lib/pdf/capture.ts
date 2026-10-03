import { A4_HEIGHT_PT, A4_WIDTH_PT, buildImagePdf, type PdfImagePage } from "./jpeg-pdf";
import { planPages, type Span } from "./page-breaks";

/**
 * Turns a part of the screen into a PDF that looks exactly like it. The
 * element is drawn by the browser itself (modern-screenshot wraps a copy of it
 * in an SVG, which the browser renders with its real layout, fonts and
 * colours), then cut into A4-shaped pages.
 *
 * Whatever is on screen is what gets captured, at the width it has on this
 * device, so a phone gets the phone layout and a laptop the wide one. Anything
 * the reader must see has to be open before this runs; see
 * components/pdf/PdfCapture.tsx, which opens the accordions first.
 */

/** Width of a page image in pixels. A4 at about 170 dots per inch: sharp on a phone, light to share. */
const TARGET_PAGE_PIXELS = 1400;
const MIN_SCALE = 1.5;
/** Phones are narrow, so they would need more than this to reach the target; capped to keep files small. */
const MAX_SCALE = 3;
const JPEG_QUALITY = 0.9;

/** A heading stays with at least this much of what follows it, so none ends a page alone. */
const HEADING_KEEP_WITH_NEXT = 48;
/** The box of a line of text is taller than its letters; a cut this far into it touches no ink. */
const LINE_BOX_SLACK = 0.12;
/** A card that has to be cut shouldn't be cut this close to its top or bottom edge. */
const BOX_EDGE = 28;

const GRAPHIC_TAGS = new Set(["svg", "img", "canvas", "video", "picture"]);
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4"]);

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function hasBox(style: CSSStyleDeclaration): boolean {
  if (parseFloat(style.borderTopWidth) > 0 || parseFloat(style.borderBottomWidth) > 0) return true;
  if (style.backgroundImage !== "none") return true;
  const colour = style.backgroundColor;
  return colour !== "transparent" && colour !== "rgba(0, 0, 0, 0)";
}

/** Measures what a page cut must not, or should not, pass through. See ./page-breaks.ts. */
function measure(root: HTMLElement, pageHeight: number): { keepWhole: Span[]; preferWhole: Span[] } {
  const origin = root.getBoundingClientRect().top;
  const keepWhole: Span[] = [];
  const preferWhole: Span[] = [];
  const range = document.createRange();

  const visit = (el: Element) => {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;
    const rect = el.getBoundingClientRect();
    const top = rect.top - origin;
    const bottom = rect.bottom - origin;
    const tag = el.tagName.toLowerCase();

    if (GRAPHIC_TAGS.has(tag)) {
      if (rect.height > 0) keepWhole.push({ top, bottom });
      return;
    }
    if (HEADING_TAGS.has(tag) && rect.height > 0) {
      keepWhole.push({ top, bottom: bottom + HEADING_KEEP_WITH_NEXT });
    }
    if (el !== root && rect.height > 0 && hasBox(style)) {
      // Anything taller than a page has to be cut somewhere, so it can't ask to stay whole.
      if (rect.height <= pageHeight) preferWhole.push({ top, bottom });
      // Where a box does get cut, the cut stays clear of its border, so no sliver of a
      // card is left alone at the top or bottom of a page.
      if (rect.height > BOX_EDGE * 2) {
        preferWhole.push({ top, bottom: top + BOX_EDGE }, { top: bottom - BOX_EDGE, bottom });
      }
    }

    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        visit(child as Element);
      } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        range.selectNodeContents(child);
        // One rectangle per line of text, so a cut can fall between two lines of a paragraph.
        for (const line of Array.from(range.getClientRects())) {
          if (line.height <= 0 || line.width <= 0) continue;
          const slack = line.height * LINE_BOX_SLACK;
          keepWhole.push({ top: line.top - origin + slack, bottom: line.bottom - origin - slack });
        }
      }
    }
  };
  visit(root);
  return { keepWhole, preferWhole };
}

/**
 * A strip that scrolls sideways (a wide table on a phone) shows only what fits, and a PDF
 * can't be scrolled. This shrinks the content of each one until all of it fits, and returns
 * the function that puts it back.
 */
function fitSidewaysScrollers(root: HTMLElement): () => void {
  const undo: Array<() => void> = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    const overflowX = getComputedStyle(el).overflowX;
    if (overflowX !== "auto" && overflowX !== "scroll") continue;
    const ratio = String(Math.floor((el.clientWidth / el.scrollWidth) * 1000) / 1000);
    for (const child of Array.from(el.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const before = child.style.zoom;
      child.style.zoom = ratio;
      undo.push(() => {
        child.style.zoom = before;
      });
    }
  }
  return () => undo.forEach((restore) => restore());
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The captured page could not be drawn"));
    img.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("The page image could not be encoded"));
        blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export interface CaptureOptions {
  /** Shown as the document title in PDF readers. */
  title?: string;
}

export async function captureToPdf(root: HTMLElement, options: CaptureOptions = {}): Promise<Uint8Array> {
  if (document.fonts?.ready) await document.fonts.ready;
  const restore = fitSidewaysScrollers(root);
  try {
    await nextFrame();
    return await capture(root, options);
  } finally {
    restore();
  }
}

async function capture(root: HTMLElement, options: CaptureOptions): Promise<Uint8Array> {

  const rect = root.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  if (width === 0 || height === 0) throw new Error("Nothing to capture");

  // A4-shaped pages at the width of the screen, with a little air above and below each cut.
  const pageHeight = Math.round((width * A4_HEIGHT_PT) / A4_WIDTH_PT);
  const margin = Math.min(32, Math.max(12, Math.round(width * 0.03)));
  const contentHeight = pageHeight - margin * 2;
  const pages = planPages({ totalHeight: height, pageHeight: contentHeight, ...measure(root, contentHeight) });

  const background = getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#000000";

  const { domToSvg } = await import("modern-screenshot");
  const svgUrl = await domToSvg(root, {
    width,
    height,
    backgroundColor: background,
  });
  const image = await loadImage(svgUrl);

  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, TARGET_PAGE_PIXELS / width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(pageHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");

  const draw = (page: Span) => {
    const sliceHeight = page.bottom - page.top;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      image,
      0,
      page.top,
      width,
      sliceHeight,
      0,
      Math.round(margin * scale),
      canvas.width,
      Math.round(sliceHeight * scale),
    );
  };

  // Safari and Firefox paint an SVG's embedded fonts and pictures only after it has been
  // drawn once or twice, so the first draws are thrown away (the library does the same).
  if (!/Chrome\//.test(navigator.userAgent)) {
    for (let i = 0; i < 3; i++) {
      draw(pages[0]!);
      await wait(100);
    }
  }

  const images: PdfImagePage[] = [];
  for (const page of pages) {
    draw(page);
    images.push({ jpeg: await canvasToJpeg(canvas), pixelWidth: canvas.width, pixelHeight: canvas.height });
  }
  // Frees the canvas memory now rather than whenever it is collected; long reports run to many pages.
  canvas.width = 0;
  canvas.height = 0;

  return buildImagePdf(images, A4_WIDTH_PT, A4_HEIGHT_PT, { title: options.title });
}
