"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { tick } from "@/lib/haptics";
import type { ReportReady } from "@/hooks/useReport";
import { readVarshik } from "./data";
import PageFrame, { CHAPTER_EN } from "./PageFrame";
import ReportSurface from "./ReportSurface";
import { buildPages } from "./pages";
import { editionNumber } from "./facts-helpers";
import type { PageCtx } from "./page-types";

const SWIPE_PX = 70;

/**
 * The Varshik Rashifal 2027 report: 56 to 61 pages in plan order, turned one at a time.
 * Swipe, use the buttons or the arrow keys; the contents list and the Timing Map open any page.
 * Everything on the pages is read from the frozen facts (`scores.varshik`) and the checked text.
 */
export default function VarshikReportView({ data, reportId }: { data: ReportReady; reportId?: string }) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const top = useRef<HTMLDivElement>(null);
  const read = useMemo(() => readVarshik(data), [data]);
  const lang = i18n.language;
  const pages = useMemo(() => (read ? buildPages(read.facts, read.byId, t, lang) : []), [read, t, lang]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [jump, setJump] = useState(false);

  // The moment the report is ready: one light tap (Android; a short vibrate in browsers that have it).
  useEffect(() => {
    if (!reduce) void tick(14);
  }, [reduce]);

  const goIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(pages.length - 1, next));
      setDir(clamped >= index ? 1 : -1);
      setIndex(clamped);
      top.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    },
    [pages.length, index, reduce],
  );

  const ctx: PageCtx | null = useMemo(() => {
    if (!read) return null;
    return {
      ...read,
      name: read.facts.reader.name,
      edition: reportId ? editionNumber(reportId) : null,
      lang,
      pages: pages.map((p) => ({ key: p.key, chapter: p.chapter, title: p.title })),
      go: (key) => {
        const i = pages.findIndex((p) => p.key === key);
        if (i >= 0) goIndex(i);
      },
      goChapter: (chapter) => {
        const i = pages.findIndex((p) => p.chapter === chapter);
        if (i >= 0) goIndex(i);
      },
    };
  }, [read, lang, pages, goIndex, reportId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") goIndex(index + 1);
      if (e.key === "ArrowLeft") goIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goIndex, index]);

  if (!read || !ctx || pages.length === 0) {
    return (
      <p className="vk-body" role="status">
        {t("varshik.error.noFacts", { defaultValue: "This report could not be opened. Please try again in a moment." })}
      </p>
    );
  }

  const page = pages[index]!;
  const Body = page.Body;

  return (
    <ReportSurface>
      <motion.div
        ref={top}
        className="flex min-w-0 scroll-mt-4 flex-col gap-3"
        data-testid="varshik-report"
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }}
      >
        <nav className="flex items-center justify-between gap-2" aria-label={t("varshik.nav.label", { defaultValue: "Report pages" })}>
          <button type="button" onClick={() => setJump(true)} className="vk-panel flex items-center gap-2 px-3 py-2 text-xs" aria-haspopup="dialog">
            <List size={16} aria-hidden="true" style={{ color: "var(--gold)" }} />
            {t("varshik.nav.contents", { defaultValue: "Contents" })}
          </button>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goIndex(index - 1)}
              disabled={index === 0}
              aria-label={t("varshik.nav.prev", { defaultValue: "Previous" })}
              className="vk-panel grid h-9 w-9 place-items-center disabled:opacity-40"
            >
              <ChevronLeft size={18} aria-hidden="true" style={{ color: "var(--gold)" }} />
            </button>
            <span className="vk-caption min-w-[5.5rem] text-center tabular-nums" aria-live="polite">
              {t("varshik.nav.page", { defaultValue: "Page {{n}} of {{total}}", n: index + 1, total: pages.length })}
            </span>
            <button
              type="button"
              onClick={() => goIndex(index + 1)}
              disabled={index === pages.length - 1}
              aria-label={t("varshik.nav.next", { defaultValue: "Next" })}
              className="vk-panel grid h-9 w-9 place-items-center disabled:opacity-40"
            >
              <ChevronRight size={18} aria-hidden="true" style={{ color: "var(--gold)" }} />
            </button>
          </span>
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page.key}
            initial={{ opacity: 0, x: reduce ? 0 : dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduce ? 0 : dir * -28 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_PX) goIndex(index + 1);
              else if (info.offset.x > SWIPE_PX) goIndex(index - 1);
            }}
            style={{ touchAction: "pan-y" }}
          >
            <PageFrame chapter={page.chapter} name={read.facts.reader.name} pageNo={index + 1} total={pages.length} title={page.title} eyebrow={page.eyebrow}>
              <Body ctx={ctx} />
            </PageFrame>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goIndex(index - 1)}
            disabled={index === 0}
            className="vk-panel flex items-center gap-1.5 px-4 py-2.5 text-sm disabled:opacity-40"
          >
            <ChevronLeft size={18} aria-hidden="true" style={{ color: "var(--gold)" }} />
            {t("varshik.nav.prev", { defaultValue: "Previous" })}
          </button>
          <button
            type="button"
            onClick={() => goIndex(index + 1)}
            disabled={index === pages.length - 1}
            className="vk-panel flex items-center gap-1.5 px-4 py-2.5 text-sm disabled:opacity-40"
          >
            {t("varshik.nav.next", { defaultValue: "Next" })}
            <ChevronRight size={18} aria-hidden="true" style={{ color: "var(--gold)" }} />
          </button>
        </div>
      </motion.div>

      {jump ? (
        <BottomSheetModal onClose={() => setJump(false)} closeLabel={t("common.close")} header={<div />}>
          <div className="vk-surface flex max-h-[70vh] min-w-0 flex-col gap-4 overflow-y-auto py-1">
            {[0, 1, 2, 3, 4, 5, 6].map((chapter) => {
              const own = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.chapter === chapter && p.title);
              if (own.length === 0) return null;
              return (
                <section key={chapter} className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="vk-eyebrow m-0">{t(`varshik.chapter.${chapter}`, { defaultValue: CHAPTER_EN[chapter] })}</h3>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {own.map(({ p, i }) => (
                      <li key={p.key}>
                        <button
                          type="button"
                          onClick={() => {
                            setJump(false);
                            goIndex(i);
                          }}
                          className="flex w-full min-w-0 items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm"
                          style={{ color: i === index ? "var(--gold)" : "var(--foreground)" }}
                        >
                          <span className="min-w-0 break-words leading-[1.45]">{p.title}</span>
                          <span className="vk-caption tabular-nums">{i + 1}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </BottomSheetModal>
      ) : null}
    </ReportSurface>
  );
}
