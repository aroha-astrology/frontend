"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { GrabfoldBook, type GrabfoldBookHandle, type PageRef } from "grabfold/react";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { buildBookPages, layoutSheets, type BookInput } from "@/lib/report-book";
import { BlankPage, CoverBack, CoverFront, Endpaper, HandwritingContext, renderBookPage } from "./BookPages";

/**
 * A finished report as a book you turn by hand (owner, 2026-10-24). grabfold turns the pages; this
 * file only decides what each page holds. Loaded on demand (the library and the book art are not
 * part of the report page until someone opens the book).
 *
 * A spread (wide screens) uses both sides of every sheet. A phone shows one page, and grabfold's
 * single-page layout only ever shows a sheet's front, so there each page takes a sheet of its own.
 */

const SPREAD_QUERY = "(min-width: 900px)";

function useSpread(): boolean {
  const [spread, setSpread] = useState(() => typeof window !== "undefined" && window.matchMedia(SPREAD_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(SPREAD_QUERY);
    const on = () => setSpread(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return spread;
}

export interface ReportBookProps extends BookInput {
  title: string;
  /** The reader's name for the cover, or null to leave the line out. */
  name: string | null;
  /** Set the cover name and pull-quotes in handwriting (its own admin switch). */
  handwriting?: boolean;
  onClose: () => void;
}

export default function ReportBook({ title, name, handwriting = false, onClose, ...input }: ReportBookProps) {
  const { t } = useTranslation();
  const spread = useSpread();
  const layout = spread ? "spread" : "single";
  const handle = useRef<GrabfoldBookHandle>(null);
  const [position, setPosition] = useState<number | null>(null);
  useDismissOnBackPress(true, onClose);

  const pages = useMemo(() => buildBookPages(input), [input]);
  const sheets = useMemo(() => layoutSheets(pages.length, layout), [pages.length, layout]);
  const dateLabel = useMemo(() => new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }), []);

  const renderPage = (ref: PageRef) => {
    if (ref.kind === "cover") {
      if (ref.face === "outside") return ref.side === "front" ? <CoverFront title={title} name={name} dateLabel={dateLabel} /> : <CoverBack />;
      return <Endpaper />;
    }
    const sides = sheets[ref.sheet];
    const index = ref.kind === "front" ? sides?.[0] : sides?.[1];
    if (index === null || index === undefined) return <BlankPage />;
    const page = pages[index];
    return page ? renderBookPage(page, index) : <BlankPage />;
  };

  return (
    <HandwritingContext.Provider value={handwriting}>
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#05070f" }} data-testid="report-book">
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white"
        >
          <X size={16} />
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-display text-sm text-gold">{title}</p>
        <div className="h-9 w-9" />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <div className={`h-full w-full ${spread ? "max-w-[1000px]" : "max-w-[460px]"}`}>
          <GrabfoldBook
            key={layout}
            ref={handle}
            sheets={sheets.length}
            covers="hard"
            layout={layout}
            pageRatio={3 / 4}
            fit="contain"
            label={title}
            renderPage={renderPage}
            onPositionChange={setPosition}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pb-6 pt-3">
        <button
          type="button"
          onClick={() => void handle.current?.prev()}
          aria-label={t("reports.book.prev", "Previous page")}
          data-testid="book-prev"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 text-gold"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="max-w-[12rem] text-center text-[11px] leading-snug text-white/60" data-position={position ?? ""}>
          {t("reports.book.hint", "Drag a page, or tap the arrows, to turn it")}
        </p>
        <button
          type="button"
          onClick={() => void handle.current?.next()}
          aria-label={t("reports.book.next", "Next page")}
          data-testid="book-next"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 text-gold"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
    </HandwritingContext.Provider>
  );
}
