"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { MotionConfig } from "framer-motion";
import { PdfCapturingContext } from "@/components/pdf/PdfCapturingContext";
import PageFrame from "./PageFrame";
import VarshikCover from "./VarshikCover";
import type { PageCtx, PageDef } from "./page-types";

/** Font steps, as the fraction of full size. Each step re-wraps the text at that size; the last is the floor. */
export const FIT_STEPS = [1, 0.94, 0.88, 0.82, 0.76, 0.7];

export interface FitReport {
  key: string;
  /** Index into FIT_STEPS that the page ended at. */
  step: number;
  /** True when even the floor did not fit and the page was clipped (never spills onto another page). */
  clipped: boolean;
  /** Columns the page's long lists ended in (1 = none). */
  cols: number;
  /** At the last attempt: drawn height over the room (above 1.0 means clipped). */
  over: number;
  /** Full-size content height over the room there is: 1.0 just fits, 2.0 is twice too tall. Dev measure. */
  ratio: number;
}

export interface PdfBookHandle {
  /** One A4 box per page, in order. */
  boxes: () => HTMLElement[];
  /** Waits for fonts and pictures, then shrinks each page to fit. Resolves with what each page needed. */
  fit: () => Promise<FitReport[]>;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function picturesLoaded(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
}

/** What the fitter tries, best first: the page as it is, then its long lists in 2 and 3 columns, each with the font steps down to the floor. */
const ATTEMPTS: [cols: number, scale: number][] = [
  [1, 1], [1, 0.94], [2, 1], [2, 0.94], [2, 0.88], [3, 1], [3, 0.94], [3, 0.88], [3, 0.82], [3, 0.76], [3, 0.7],
];

/** The tall lists of a page: the deepest elements with 3 or more children that are at least 250 px tall (a list of cards, a run of month blocks). */
function listsOf(inner: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (const el of Array.from(inner.querySelectorAll<HTMLElement>("*"))) {
    if (el instanceof SVGElement || el.closest("svg")) continue;
    const kids = Array.from(el.children).filter((c) => c.getBoundingClientRect().height > 0);
    if (kids.length < 3 || el.offsetHeight < 250) continue;
    const display = getComputedStyle(el).display;
    if (display !== "flex" && display !== "block" && display !== "grid") continue;
    if (display === "flex" && getComputedStyle(el).flexDirection !== "column") continue;
    if (display === "grid") continue;
    // Chrome draws SVG text out of place inside CSS columns, so a container that holds a chart is never put in columns.
    if (el.querySelector("svg") && !el.hasAttribute("data-vk-flow")) continue;
    found.push(el);
  }
  // Containers a component marked with data-vk-flow win; of the guessed ones, keep only the deepest and none that touch a marked one.
  const marked = Array.from(inner.querySelectorAll<HTMLElement>("[data-vk-flow]"));
  const guessed = found.filter((el) => !found.some((o) => o !== el && el.contains(o)) && !marked.some((m) => m.contains(el) || el.contains(m)));
  return [...marked, ...guessed];
}

function setColumns(lists: { el: HTMLElement; gap: string }[], wanted: number) {
  for (const { el, gap } of lists) {
    const cols = Math.min(wanted, Number(el.dataset.vkMaxcols ?? 99));
    el.dataset.vkCols = String(cols);
    if (cols <= 1) {
      el.style.removeProperty("display");
      el.style.removeProperty("column-count");
      el.style.removeProperty("column-gap");
      for (const c of Array.from(el.children) as HTMLElement[]) {
        c.style.removeProperty("break-inside");
        c.style.removeProperty("margin-bottom");
      }
    } else {
      el.style.display = "block";
      el.style.columnCount = String(cols);
      el.style.columnGap = "18px";
      const kids = Array.from(el.children) as HTMLElement[];
      kids.forEach((c, i) => {
        c.style.breakInside = "avoid";
        c.style.marginBottom = i === kids.length - 1 ? "0" : gap;
      });
    }
  }
}

/** Fits one page: long lists go to 2 or 3 columns and the font shrinks a step at a time, never past the floor. */
function fitPage(box: HTMLElement): { step: number; clipped: boolean; ratio: number; cols: number; over: number } {
  const body = box.querySelector<HTMLElement>("[data-a4-body]");
  const inner = box.querySelector<HTMLElement>("[data-a4-inner]");
  if (!body || !inner) return { step: 0, clipped: false, ratio: 0, cols: 1, over: 0 };
  // A second run (React strict mode runs effects twice in dev) starts from the page as built.
  setColumns(Array.from(inner.querySelectorAll<HTMLElement>("[data-vk-cols]")).map((el) => ({ el, gap: "0px" })), 1);
  inner.style.setProperty("--vk-fit", "1");
  const ratio = Math.round((inner.offsetHeight / Math.max(1, body.clientHeight)) * 100) / 100;
  const lists = listsOf(inner).map((el) => ({ el, gap: getComputedStyle(el).rowGap === "normal" ? "0px" : getComputedStyle(el).rowGap }));
  let last: { step: number; cols: number; over: number } = { step: FIT_STEPS.length - 1, cols: 1, over: 0 };
  // A page with no long list just steps down through the font sizes.
  const attempts: [number, number][] = lists.length === 0 ? FIT_STEPS.map((sc) => [1, sc]) : ATTEMPTS;
  for (const [cols, s] of attempts) {
    setColumns(lists, cols);
    inner.style.setProperty("--vk-fit", String(s));
    last = { step: FIT_STEPS.indexOf(s), cols, over: 0 };
    // The rectangle is the drawn (zoomed) height; offsetHeight would be the unzoomed one.
    const over = Math.round((inner.getBoundingClientRect().height / Math.max(1, body.clientHeight)) * 100) / 100;
    last = { ...last, over };
    if (over <= 1.0005) return { ...last, clipped: false, ratio, over };
  }
  return { ...last, clipped: true, ratio };
}

/**
 * The report as the PDF sees it: every page in its own fixed A4 box (794 x 1123 px), stacked down the
 * screen and hidden behind the "preparing" cover (`preview`: shown in the flow, for the dev preview page). Charts are settled (no entrance animation) and
 * folded pieces are open, because the capture reads PdfCapturingContext.
 */
const PdfBook = forwardRef<PdfBookHandle, { pages: PageDef[]; ctx: PageCtx; preview?: boolean }>(function PdfBook({ pages, ctx, preview = false }, ref) {
  const root = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    boxes: () => Array.from(root.current?.querySelectorAll<HTMLElement>("[data-pdf-page]") ?? []),
    fit: async () => {
      const el = root.current;
      if (!el) return [];
      if (document.fonts?.ready) await document.fonts.ready;
      await picturesLoaded(el);
      await nextFrame();
      await nextFrame();
      const boxes = Array.from(el.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      const out: FitReport[] = [];
      for (const box of boxes) {
        const r = fitPage(box);
        box.dataset.fit = String(r.step);
        if (r.clipped) box.dataset.clipped = "true";
        out.push({ key: box.dataset.pdfPage ?? "", ...r });
      }
      await nextFrame();
      return out;
    },
  }));

  return (
    <PdfCapturingContext.Provider value={true}>
      <MotionConfig reducedMotion="always">
        <div
          ref={root}
          aria-hidden={preview ? undefined : "true"}
          data-testid="pdf-book"
          className="flex flex-col"
          style={preview ? { width: 794, gap: 24 } : { position: "absolute", left: 0, top: 0, width: 794, zIndex: -1, pointerEvents: "none" }}
        >
          {pages.map((p, i) => {
            const Body = p.Body;
            return (
              <div key={p.key} data-pdf-page={p.key} style={{ width: 794, height: 1123, flex: "none", background: "var(--background)" }}>
                {p.key === "cover" ? (
                  <VarshikCover name={ctx.name} a4 />
                ) : (
                  <PageFrame a4 chapter={p.chapter} name={ctx.name} pageNo={i + 1} total={pages.length} title={p.title} eyebrow={p.eyebrow}>
                    <Body ctx={ctx} />
                  </PageFrame>
                )}
              </div>
            );
          })}
        </div>
      </MotionConfig>
    </PdfCapturingContext.Provider>
  );
});

export default PdfBook;
