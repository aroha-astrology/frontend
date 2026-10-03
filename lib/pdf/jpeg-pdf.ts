/**
 * A PDF made of full-page JPEG images, written by hand so the "Download PDF"
 * button needs no PDF library. Each page is a picture of the screen (see
 * ./capture.ts), which is what keeps the file looking exactly like the app.
 *
 * The format used here is the smallest valid one: a catalog, a page tree, and
 * three objects per page (the page, its image, and the one-line drawing
 * command that stretches the image over the page). The browser's JPEG bytes
 * go in untouched, because PDF reads JPEG natively (the DCTDecode filter).
 */

export interface PdfImagePage {
  /** JPEG file bytes, as produced by canvas.toBlob("image/jpeg"). */
  jpeg: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
}

export interface PdfDocumentInfo {
  title?: string;
}

/** A4 in PDF points (1/72 inch). */
export const A4_WIDTH_PT = 595.28;
export const A4_HEIGHT_PT = 841.89;

function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/** PDF text strings outside ASCII must be UTF-16BE with a byte-order mark; written as hex. */
function hexString(text: string): string {
  let hex = "FEFF";
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  return `<${hex}>`;
}

const num = (n: number) => String(Math.round(n * 100) / 100);

export function buildImagePdf(
  pages: PdfImagePage[],
  pageWidthPt: number = A4_WIDTH_PT,
  pageHeightPt: number = A4_HEIGHT_PT,
  info: PdfDocumentInfo = {},
): Uint8Array {
  if (pages.length === 0) throw new Error("A PDF needs at least one page");

  const chunks: Uint8Array[] = [];
  let length = 0;
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === "string" ? ascii(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };

  // Byte offset of every object, by object number, for the cross-reference table.
  const offsets: number[] = [];
  const beginObject = (id: number) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  // Objects 1 and 2 are the catalog and page tree; each page then takes three.
  const pageId = (i: number) => 3 + i * 3;
  const imageId = (i: number) => 4 + i * 3;
  const contentId = (i: number) => 5 + i * 3;
  const infoId = 3 + pages.length * 3;

  // The second line is a comment of high bytes, which marks the file as binary.
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  beginObject(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObject(2);
  push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`);

  const mediaBox = `[0 0 ${num(pageWidthPt)} ${num(pageHeightPt)}]`;
  pages.forEach((page, i) => {
    beginObject(pageId(i));
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} ` +
        `/Resources << /XObject << /Im0 ${imageId(i)} 0 R >> >> /Contents ${contentId(i)} 0 R >>\nendobj\n`,
    );

    beginObject(imageId(i));
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    push(page.jpeg);
    push("\nendstream\nendobj\n");

    // An image is drawn one unit square; this scales it to cover the page.
    const draw = `q ${num(pageWidthPt)} 0 0 ${num(pageHeightPt)} 0 0 cm /Im0 Do Q`;
    beginObject(contentId(i));
    push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream\nendobj\n`);
  });

  beginObject(infoId);
  push(`<< /Producer (Aroha Astrology)${info.title ? ` /Title ${hexString(info.title)}` : ""} >>\nendobj\n`);

  const xrefOffset = length;
  const objectCount = infoId + 1;
  push(`xref\n0 ${objectCount}\n0000000000 65535 f \n`);
  for (let id = 1; id < objectCount; id++) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${objectCount} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}
