"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { TOUR_STEPS, TOUR_DONE_KEY } from "./tour-steps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(target: string | null): Rect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const PAD = 8;

export default function AppTour({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => setMounted(true), []);

  const step = TOUR_STEPS[stepIndex]!;

  useEffect(() => {
    const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });

    const update = () => setRect(measure(step.target));
    // Let the scroll settle before measuring.
    const t1 = setTimeout(update, 260);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(t1);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step.target]);

  if (!mounted) return null;

  const finish = () => {
    localStorage.setItem(TOUR_DONE_KEY, "1");
    onFinish();
  };

  const goNext = () => {
    if (stepIndex === TOUR_STEPS.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const spotlightStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 20,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
        border: "1.5px solid var(--gold)",
        pointerEvents: "none",
        zIndex: 201,
        transition: "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
      }
    : {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 201,
        pointerEvents: "none",
      };

  // Tooltip placement: whichever side (above/below the target) has more room,
  // not just top-half/bottom-half of the viewport — on short mobile screens a
  // target near vertical center can have plenty of room on one side and almost
  // none on the other, and the old top-half heuristic could pick the cramped
  // side. `maxHeight` is clamped to the *actual* space available on the chosen
  // side (not a blanket 100vh) so the card scrolls internally instead of
  // spilling off-screen; if neither side has enough room at all (very short
  // viewport, tall target), fall back to the centered layout used for the
  // no-target welcome step.
  const MIN_TOOLTIP_SPACE = 160;
  let tooltipStyle: React.CSSProperties;
  const centeredStyle: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(360px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 32px)",
    overflowY: "auto",
    zIndex: 202,
  };
  if (rect) {
    const viewportH = window.innerHeight;
    const gap = PAD * 2 + 12;
    const spaceAbove = rect.top - gap - 16;
    const spaceBelow = viewportH - (rect.top + rect.height) - gap - 16;
    if (Math.max(spaceAbove, spaceBelow) < MIN_TOOLTIP_SPACE) {
      tooltipStyle = centeredStyle;
    } else if (spaceBelow >= spaceAbove) {
      tooltipStyle = {
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(360px, calc(100vw - 32px))",
        top: rect.top + rect.height + gap,
        maxHeight: Math.max(MIN_TOOLTIP_SPACE, spaceBelow),
        overflowY: "auto",
        zIndex: 202,
      };
    } else {
      tooltipStyle = {
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(360px, calc(100vw - 32px))",
        bottom: viewportH - rect.top + gap,
        maxHeight: Math.max(MIN_TOOLTIP_SPACE, spaceAbove),
        overflowY: "auto",
        zIndex: 202,
      };
    }
  } else {
    tooltipStyle = centeredStyle;
  }

  return createPortal(
    <>
      <div style={spotlightStyle} />
      {/*
        Positioning lives on this plain div (translateX(-50%) centering,
        width/maxHeight/scroll) — kept separate from the motion.div below.
        framer-motion owns the `transform` CSS property outright once it's
        animating `y` on an element, so a manual `translateX(-50%)` set via
        the `style` prop on the SAME motion.div gets silently dropped after
        the enter animation settles, leaving the card's left edge pinned at
        50% instead of centered (and spilling off the right edge).
      */}
      <div style={tooltipStyle}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="bg-card border border-gold/30 rounded-2xl shadow-2xl p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-base font-semibold font-display text-foreground">{t(step.titleKey)}</h3>
              <button
                onClick={finish}
                aria-label={t("tour.skip")}
                className="w-7 h-7 shrink-0 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-sm text-muted leading-relaxed mb-4">{t(step.bodyKey)}</p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5 shrink-0">
                {TOUR_STEPS.map((s, i) => (
                  <div
                    key={s.id}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === stepIndex ? 16 : 6,
                      height: 6,
                      background: i <= stepIndex ? "var(--gold)" : "var(--border)",
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    onClick={goBack}
                    className="w-8 h-8 rounded-full border border-gold/20 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                    aria-label={t("tour.back")}
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <button
                  onClick={goNext}
                  className="h-8 px-4 rounded-full bg-gold text-[#1a0e00] text-xs font-semibold flex items-center gap-1 whitespace-nowrap active:scale-95 transition-transform"
                >
                  {stepIndex === TOUR_STEPS.length - 1 ? t("tour.done") : t("tour.next")}
                  {stepIndex !== TOUR_STEPS.length - 1 && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>,
    document.body,
  );
}
