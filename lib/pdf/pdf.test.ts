import { describe, expect, it } from "vitest";
import { buildImagePdf } from "./jpeg-pdf";
import { planPages, type Span } from "./page-breaks";
import { pdfFileName } from "./save";

const latin1 = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

describe("buildImagePdf", () => {
  // Not real JPEGs: the writer copies the bytes through without reading them.
  const pages = [
    { jpeg: new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]), pixelWidth: 1170, pixelHeight: 1655 },
    { jpeg: new Uint8Array([0xff, 0xd8, 9, 0xff, 0xd9]), pixelWidth: 1170, pixelHeight: 1655 },
  ];
  const pdf = latin1(buildImagePdf(pages, 595.28, 841.89, { title: "विवाह" }));

  it("writes one page per image inside a valid file frame", () => {
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    expect(pdf).toContain("/Count 2");
    expect(pdf.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(pdf).toContain("/Width 1170 /Height 1655");
    expect(pdf).toContain("/MediaBox [0 0 595.28 841.89]");
  });

  it("points every cross-reference entry at the object it names", () => {
    const xrefAt = Number(/startxref\n(\d+)\n/.exec(pdf)![1]);
    expect(pdf.slice(xrefAt, xrefAt + 5)).toBe("xref\n");
    const entries = pdf.slice(xrefAt).split("\n").filter((line) => line.endsWith(" 00000 n "));
    // Catalog, page tree, three objects per page, and the info object.
    expect(entries).toHaveLength(2 + pages.length * 3 + 1);
    entries.forEach((entry, i) => {
      const offset = Number(entry.slice(0, 10));
      expect(pdf.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
  });

  it("keeps the image bytes untouched and the declared length right", () => {
    const start = pdf.indexOf("stream\n") + "stream\n".length;
    expect(pdf.slice(start, start + 7)).toBe(latin1(pages[0]!.jpeg));
    expect(pdf).toContain("/Filter /DCTDecode /Length 7 >>");
  });

  it("writes a title in any script as UTF-16", () => {
    expect(pdf).toContain("/Title <FEFF0935093F0935093E0939>");
  });

  it("refuses an empty document", () => {
    expect(() => buildImagePdf([])).toThrow();
  });
});

describe("planPages", () => {
  const plan = (totalHeight: number, keepWhole: Span[] = [], preferWhole: Span[] = []) =>
    planPages({ totalHeight, pageHeight: 500, keepWhole, preferWhole });

  const covers = (pages: Span[], total: number) => {
    expect(pages[0]!.top).toBe(0);
    expect(pages.at(-1)!.bottom).toBe(total);
    pages.slice(1).forEach((page, i) => expect(page.top).toBe(pages[i]!.bottom));
  };

  it("keeps a short screen on one page", () => {
    expect(plan(320)).toEqual([{ top: 0, bottom: 320 }]);
  });

  it("cuts at the full page height when nothing is in the way", () => {
    const pages = plan(1200);
    expect(pages).toEqual([
      { top: 0, bottom: 500 },
      { top: 500, bottom: 1000 },
      { top: 1000, bottom: 1200 },
    ]);
    covers(pages, 1200);
  });

  it("moves a cut up so it doesn't slice a line of text", () => {
    const pages = plan(900, [{ top: 480, bottom: 520 }]);
    expect(pages[0]).toEqual({ top: 0, bottom: 480 });
    covers(pages, 900);
  });

  it("prefers the gap between two cards over a cut inside one", () => {
    // Lines of text every 20px inside each card, so a cut between two lines is clean too;
    // what makes the gap (440 to 452) win is that it leaves both cards whole.
    const linesFrom = (start: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({ top: start + i * 20, bottom: start + i * 20 + 14 }));
    const cards = [
      { top: 0, bottom: 440 },
      { top: 452, bottom: 800 },
    ];
    expect(plan(900, [...linesFrom(8, 21), ...linesFrom(460, 16)], cards)[0]!.bottom).toBe(452);
  });

  it("cuts through something taller than its reach rather than leave a near-empty page", () => {
    const pages = plan(1400, [{ top: 100, bottom: 1300 }]);
    expect(pages[0]).toEqual({ top: 0, bottom: 500 });
    covers(pages, 1400);
  });

  it("never moves a cut up by more than 40% of a page", () => {
    const pages = plan(900, [{ top: 250, bottom: 520 }]);
    expect(pages[0]!.bottom).toBeGreaterThanOrEqual(300);
  });
});

describe("pdfFileName", () => {
  it("makes a plain file name from a report key", () => {
    expect(pdfFileName("kp_annual")).toBe("aroha-kp-annual.pdf");
    expect(pdfFileName("Palm Reading")).toBe("aroha-palm-reading.pdf");
  });

  it("falls back when there is nothing usable", () => {
    expect(pdfFileName(undefined)).toBe("aroha-report.pdf");
    expect(pdfFileName("विवाह")).toBe("aroha-report.pdf");
  });
});
