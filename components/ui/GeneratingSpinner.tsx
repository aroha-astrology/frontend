"use client";

import { motion } from "framer-motion";

/**
 * Rotating-ring "generating…" indicator. Extracted from GemstoneCard's
 * inline generating-state markup (it was the richest existing example of
 * this AI-generation waiting state) so it can be shared verbatim with the
 * report reading view (app/reports/[id]/page.tsx) instead of being
 * re-copied — matches this project's "extract repeated markup into
 * components/ui/" convention. `size` defaults to 32 to match the original
 * `w-8 h-8` GemstoneCard markup exactly.
 */
export default function GeneratingSpinner({
  label,
  size = 32,
  className = "py-8",
}: {
  label: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        className="rounded-full border-2 border-gold border-t-transparent"
        style={{ width: size, height: size }}
      />
      <p className="text-xs text-muted mt-3">{label}</p>
    </div>
  );
}
