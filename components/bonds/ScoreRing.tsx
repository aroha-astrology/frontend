"use client";

import { motion, useReducedMotion } from "framer-motion";

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** The bond's score as a ring that fills once, with the figure in the middle. */
export default function ScoreRing({ pct, children, size = 104 }: { pct: number; children: React.ReactNode; size?: number }) {
  const reduce = useReducedMotion();
  const filled = Math.max(0, Math.min(100, pct)) / 100;
  const offset = CIRCUMFERENCE * (1 - filled);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} data-testid="bond-score-ring">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" className="stroke-gold/15" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="stroke-gold"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: reduce ? offset : CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
