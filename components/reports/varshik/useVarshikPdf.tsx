"use client";

import { createElement, useCallback, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { canSavePdf, savePdf } from "@/lib/pdf/save";
import { capturePagesToPdf } from "@/lib/pdf/capture-pages";
import { track } from "@/lib/analytics";
import type { PdfStatus } from "@/components/pdf/PdfDownload";
import PdfBook, { type FitReport, type PdfBookHandle } from "./PdfBook";
import type { PageCtx, PageDef } from "./page-types";

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** "Varshik-Rashifal-2027-Asha-Rao.pdf". Letters and digits of any script on the web; plain Latin letters only when `plain` (the Android saver keeps A-Z, 0-9 and . _ - only). */
export function varshikPdfName(name: string | null | undefined, year: number, plain = false): string {
  let clean = (name ?? "").normalize("NFKC").trim();
  if (plain) clean = clean.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, " ").trim();
  else clean = clean.replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
  const slug = clean.split(/\s+/).filter(Boolean).join("-").slice(0, 40);
  return `Varshik-Rashifal-${year}${slug ? `-${slug}` : ""}.pdf`;
}

async function onNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * The Varshik PDF: every page is rebuilt in its own A4 box (PdfBook), shrunk a font step at a time until
 * it fits, drawn one page at a time and written into one file, so the file has exactly one page per report page.
 * Use `book` in the screen's JSX (it renders only while the PDF is being made) and PdfStatusLayer for the cover and notices.
 */
export function useVarshikPdf({ pages, ctx, year, title }: { pages: PageDef[]; ctx: PageCtx | null; year: number; title: string }) {
  const [status, setStatus] = useState<PdfStatus>("idle");
  const handle = useRef<PdfBookHandle>(null);
  const busy = useRef(false);

  const download = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const scrollY = window.scrollY;
    try {
      if (!(await canSavePdf())) {
        setStatus("updateApp");
        return;
      }
      flushSync(() => setStatus("working"));
      await nextFrame();
      await nextFrame();
      const book = handle.current;
      if (!book) throw new Error("Nothing to capture");
      const fits: FitReport[] = await book.fit();
      const boxes = book.boxes();
      // Dev only: lets the headless test read how each page was fitted.
      if (process.env.NODE_ENV !== "production") (window as unknown as { __vkFit?: FitReport[] }).__vkFit = fits;
      if (boxes.length !== pages.length) throw new Error("A page is missing");
      const bytes = await capturePagesToPdf(boxes, { title });
      const result = await savePdf(bytes, varshikPdfName(ctx?.name, year, await onNativeApp()));
      setStatus(result);
      track("pdf_downloaded", {
        source: "varshik_rashifal_2027",
        result,
        pages: boxes.length,
        shrunk: fits.filter((f) => f.step > 0).length,
        clipped: fits.filter((f) => f.clipped).length,
        kb: Math.round(bytes.length / 1024),
      });
    } catch {
      setStatus("failed");
    } finally {
      busy.current = false;
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    }
  }, [pages.length, ctx?.name, year, title]);

  const dismiss = useCallback(() => setStatus("idle"), []);
  const book: ReactNode = status === "working" && ctx ? createElement(PdfBook, { ref: handle, pages, ctx }) : null;
  return { status, download, dismiss, book };
}
