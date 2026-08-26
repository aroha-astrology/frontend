"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { TourStep } from "./tour-registry";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findTarget(target: string | null): Element | null {
  if (!target) return null;
  return document.querySelector(`[data-tour="${target}"]`);
}

function measure(target: string | null): Rect | null {
  const el = findTarget(target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Rendered but collapsed to nothing — can't be spotlighted meaningfully.
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const PAD = 8;
const MIN_TOOLTIP_SPACE = 160;
const SPOTLIGHT_SPRING = { type: "spring" as const, stiffness: 260, damping: 30 };

export default function AppTour({ steps, onFinish }: { steps: TourStep[]; onFinish: () => void }) {
  const { t } = useTranslation();
  /**
   * Drop the decorative layers (pulse, sparkles, springs) but never the
   * navigation. Deliberately NOT also gated on useLowEndDevice: that hook is a
   * WebGL capability probe that starts `true` and keys off GPU/cores, which
   * says nothing about whether a CSS/framer 2D transition is affordable.
   */
  const plain = usePrefersReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => setMounted(true), []);

  // A step whose target isn't in the DOM is dropped, not shown as a dimmed
  // screen with a card pointing at nothing. Home sections are feature-flag
  // filtered and the report view has two entirely different render paths, so
  // a step list is always a superset of what any given user actually sees.
  // Resolved once on open: re-filtering mid-tour would renumber the steps
  // under the user as they scroll.
  const visibleSteps = useMemo(
    () => (mounted ? steps.filter((s) => s.target === null || findTarget(s.target) !== null) : steps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mounted, steps],
  );

  const total = visibleSteps.length;
  const step = visibleSteps[Math.min(stepIndex, total - 1)];
  const isLast = stepIndex >= total - 1;

  const finish = useCallback(() => onFinish(), [onFinish]);

  // Hardware back press dismisses the tour the same as tapping X, instead of
  // falling through to the app-exit/previous-route default.
  useDismissOnBackPress(true, finish);

  useEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    el?.scrollIntoView({ block: "center", behavior: plain ? "auto" : "smooth" });

    const update = () => setRect(measure(step.target));
    // Let the scroll settle before measuring.
    const t1 = setTimeout(update, plain ? 60 : 260);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(t1);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, plain]);

  if (!mounted || !step || total === 0) return null;

  const goNext = () => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const spotlightRect: Rect = rect ?? {
    top: window.innerHeight / 2,
    left: window.innerWidth / 2,
    width: 0,
    height: 0,
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
  let placement: "above" | "below" | "center" = "center";
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
      placement = "below";
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
      placement = "above";
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

  // The card slides in from the side the target is on, so the motion itself
  // points back at whatever is being explained.
  const cardOffset = placement === "above" ? 14 : placement === "below" ? -14 : 10;
  const StepIcon = step.icon;

  return createPortal(
    <>
      {/*
        Click-catcher. The scrim below is pointer-events:none (it has to be —
        it's a spread shadow, not a real backdrop), so without this every tap
        during the tour lands on whatever live UI sits underneath it. Doubles
        as tap-anywhere-to-advance.
      */}
      <div onClick={goNext} role="presentation" style={{ position: "fixed", inset: 0, zIndex: 200 }} />

      {/* Scrim and cutout in one: a huge spread shadow around the target rect. */}
      <motion.div
        initial={{ opacity: 0, scale: plain ? 1 : 0.92 }}
        animate={{
          opacity: 1,
          scale: 1,
          top: spotlightRect.top - PAD,
          left: spotlightRect.left - PAD,
          width: spotlightRect.width + PAD * 2,
          height: spotlightRect.height + PAD * 2,
        }}
        transition={plain ? { duration: 0.15 } : SPOTLIGHT_SPRING}
        style={{
          position: "fixed",
          borderRadius: 20,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
          border: rect ? "1.5px solid var(--gold)" : "none",
          pointerEvents: "none",
          zIndex: 201,
        }}
      />

      {/* Breathing ring on the highlighted element. Decorative only. */}
      {rect && !plain && (
        <motion.div
          key={`pulse-${step.id}`}
          initial={{ opacity: 0 }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.65, 0, 0.65] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "fixed",
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 20,
            border: "2px solid var(--gold)",
            pointerEvents: "none",
            zIndex: 201,
          }}
        />
      )}

      {isLast && !plain && <FinishSparkles rect={rect} />}

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
            initial={{ opacity: 0, y: cardOffset, scale: plain ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -cardOffset / 2, scale: plain ? 1 : 0.98 }}
            transition={
              plain ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 28, delay: 0.12 }
            }
            className="bg-card border border-gold/30 rounded-2xl shadow-2xl p-5 relative"
          >
            {/* Beak pointing back at the spotlight. */}
            {placement !== "center" && (
              <div
                aria-hidden
                className="absolute left-1/2 w-3 h-3 rotate-45 bg-card"
                style={{
                  marginLeft: -6,
                  [placement === "below" ? "top" : "bottom"]: -6,
                  borderTop: placement === "below" ? "1px solid var(--gold)" : undefined,
                  borderLeft: placement === "below" ? "1px solid var(--gold)" : undefined,
                  borderBottom: placement === "above" ? "1px solid var(--gold)" : undefined,
                  borderRight: placement === "above" ? "1px solid var(--gold)" : undefined,
                  opacity: 0.35,
                }}
              />
            )}

            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-2.5 min-w-0">
                {StepIcon && (
                  <span
                    className="mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: "color-mix(in srgb, var(--gold) 18%, transparent)",
                      color: "var(--gold)",
                    }}
                  >
                    <StepIcon size={15} />
                  </span>
                )}
                <h3 className="text-base font-semibold font-display text-foreground">{t(step.titleKey)}</h3>
              </div>
              <button
                onClick={finish}
                aria-label={t("tour.skip")}
                className="w-7 h-7 shrink-0 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-sm text-muted leading-relaxed mb-4">{t(step.bodyKey)}</p>

            {/* Progress bar — the dot row alone got unreadable past ~6 steps. */}
            <div className="h-[3px] rounded-full mb-3 overflow-hidden" style={{ background: "var(--border)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--gold)" }}
                initial={false}
                animate={{ width: `${((stepIndex + 1) / total) * 100}%` }}
                transition={plain ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 28 }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted tabular-nums shrink-0">
                {stepIndex + 1} / {total}
              </span>

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
                  className="h-8 px-4 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap active:scale-95 transition-transform"
                  style={{ background: "var(--gold)", color: "#1a0e00" }}
                >
                  {isLast ? t("tour.done") : t("tour.next")}
                  {!isLast && <ChevronRight size={14} />}
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

/** Eight gold motes bursting off the last spotlight. Pure decoration, no dependency. */
function FinishSparkles({ rect }: { rect: Rect | null }) {
  const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 203, pointerEvents: "none" }}>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: originX, y: originY, scale: 0.4 }}
            animate={{
              opacity: [0, 1, 0],
              x: originX + Math.cos(angle) * 96,
              y: originY + Math.sin(angle) * 96,
              scale: [0.4, 1, 0.3],
            }}
            transition={{ duration: 1.1, delay: 0.05 * i, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              marginLeft: -3,
              marginTop: -3,
              borderRadius: "50%",
              background: "var(--gold)",
            }}
          />
        );
      })}
    </div>
  );
}
