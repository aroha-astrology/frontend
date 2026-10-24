"use client";

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import type { PalmCaptureSlot } from "@/lib/palm-api";

/** The demo photo shown for each capture slot (public/palm-guide, owner 2026-10-23). */
export const SLOT_GUIDE_IMAGE: Record<PalmCaptureSlot, string> = {
  primaryFront: "/palm-guide/front.jpg",
  primaryPercussion: "/palm-guide/side.jpg",
  primaryFingertips: "/palm-guide/fingertips.jpg",
  primaryThumb: "/palm-guide/thumb.jpg",
  primaryMounts: "/palm-guide/mounts.jpg",
};

/**
 * What the next photo should look like, shown before every shot: an example picture, a title and
 * one short instruction. It sits over the camera preview; "Got it" closes it, and the small
 * example thumbnail in the camera view brings it back.
 */
export default function PalmStepGuide({
  slot,
  step,
  total,
  hand,
  onReady,
}: {
  slot: PalmCaptureSlot;
  step: number;
  total: number;
  /** Which physical hand to hold up, or null when not known yet. */
  hand: "left" | "right" | null;
  onReady: () => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="palm-step-guide"
      className="absolute inset-0 z-30 flex flex-col bg-black/95 px-5 pb-8 pt-16"
    >
      <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-gold">
        {t("palm.guide.counter", { current: step, total })}
      </p>
      <h2 className="mt-1 text-center font-display text-xl text-white" data-testid="palm-guide-title">
        {t(`palm.guide.step.${slot}.title`)}
      </h2>
      {hand && (
        <p className="mt-1 text-center text-sm font-semibold text-gold">
          {t(hand === "right" ? "palm.capture.useRightHand" : "palm.capture.useLeftHand")}
        </p>
      )}

      <div className="relative mx-auto mt-4 min-h-0 w-full max-w-xs flex-1 overflow-hidden rounded-3xl border border-gold/30 bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SLOT_GUIDE_IMAGE[slot]}
          alt=""
          className="h-full w-full object-cover"
          data-testid="palm-guide-image"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          {t("palm.guide.example")}
        </span>
      </div>

      <p className="mx-auto mt-4 max-w-xs text-center text-sm leading-relaxed text-white/90">
        {t(`palm.guide.step.${slot}.tip`)}
      </p>

      <button
        type="button"
        onClick={onReady}
        data-testid="palm-guide-ready"
        className="mx-auto mt-5 w-full max-w-xs rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-[#1a0e00]"
      >
        {t("palm.guide.ready")}
      </button>
    </motion.div>
  );
}
