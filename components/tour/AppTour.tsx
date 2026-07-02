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

  // Tooltip placement: below the target if it's in the top half of the
  // viewport, above it otherwise; centered when there's no target (welcome).
  // Anchored via `top` (below) or `bottom` (above) rather than a guessed
  // height, so it grows away from the target regardless of how long the
  // translated title/body text is in a given language — never overlaps the
  // spotlight and never needs a magic-number height estimate.
  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const viewportH = window.innerHeight;
    const placeBelow = rect.top < viewportH / 2;
    tooltipStyle = {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(360px, calc(100vw - 32px))",
      maxHeight: "calc(100vh - 32px)",
      overflowY: "auto",
      zIndex: 202,
      ...(placeBelow
        ? { top: rect.top + rect.height + PAD * 2 + 12 }
        : { bottom: viewportH - rect.top + PAD * 2 + 12 }),
    };
  } else {
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(360px, calc(100vw - 32px))",
      maxHeight: "calc(100vh - 32px)",
      overflowY: "auto",
      zIndex: 202,
    };
  }

  return createPortal(
    <>
      <div style={spotlightStyle} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          style={tooltipStyle}
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
    </>,
    document.body,
  );
}
