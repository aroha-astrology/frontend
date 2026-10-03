"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import { canSavePdf, savePdf, type PdfSaveResult } from "@/lib/pdf/save";
import { track } from "@/lib/analytics";

/** "updateApp": an Android app build from before it could save files. */
export type PdfStatus = "idle" | "working" | PdfSaveResult | "failed" | "updateApp";

/** How long the result line stays up. */
const NOTICE_MS = 5000;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * "Download as PDF" for a screen. Put `targetRef` on the element to capture,
 * wrap it in `<PdfCapturingContext.Provider value={capturing}>` so its folded
 * parts open for the capture, and call `download` from a button.
 *
 * `source` names the screen in analytics; `fileName` is the saved file's name.
 */
export function usePdfDownload({ source, fileName, title }: { source: string; fileName: string; title: string }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<PdfStatus>("idle");
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
      // Committed at once, so the screen is already in its opened-up state when it is measured.
      flushSync(() => setStatus("working"));
      await nextFrame();
      await nextFrame();
      const node = targetRef.current;
      if (!node) throw new Error("Nothing to capture");
      const { captureToPdf } = await import("@/lib/pdf/capture");
      const result = await savePdf(await captureToPdf(node, { title }), fileName);
      setStatus(result);
      track("pdf_downloaded", { source, result });
    } catch {
      setStatus("failed");
    } finally {
      busy.current = false;
      // Opening everything made the page taller; put the reader back where they were.
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    }
  }, [source, fileName, title]);

  const dismiss = useCallback(() => setStatus("idle"), []);

  return { targetRef, status, capturing: status === "working", download, dismiss };
}

export function PdfDownloadButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-gold/30 px-4 py-2 text-xs font-semibold text-gold"
    >
      <Download size={14} />
      {t("pdf.download")}
    </button>
  );
}

/**
 * What the reader sees while and after a PDF is made: a full cover while the
 * screen is captured (it hides the page opening up underneath), then one line
 * saying how it went. Drawn on <body>, outside the captured element, so it can
 * never end up in the PDF itself.
 */
export function PdfStatusLayer({ status, onDismiss }: { status: PdfStatus; onDismiss: () => void }) {
  const { t } = useTranslation();
  const done = status !== "idle" && status !== "working";

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(onDismiss, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [done, status, onDismiss]);

  if (status === "idle") return null;

  return createPortal(
    status === "working" ? (
      <div
        role="status"
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ background: "var(--background)" }}
        data-testid="pdf-working"
      >
        <GeneratingSpinner label={t("pdf.preparing")} size={40} />
      </div>
    ) : (
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar-h)+1rem)] z-[200] flex justify-center px-4">
        <p
          role="status"
          onClick={onDismiss}
          className="pointer-events-auto max-w-sm rounded-2xl border border-gold/30 bg-card px-4 py-2.5 text-center text-xs text-foreground shadow-2xl"
          data-testid="pdf-notice"
        >
          {t(`pdf.${status}`)}
        </p>
      </div>
    ),
    document.body,
  );
}
