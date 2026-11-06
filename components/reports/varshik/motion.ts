"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/** Counts a number up from 0 once, when it scrolls into view. Reduced motion shows the final value. */
export function useCountUp(target: number, duration = 1) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    if (!inView) return;
    const controls = animate(0, target, { duration, ease: "easeOut", onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, target, duration, reduce]);

  return { ref, value };
}

/** The standard "settle in" used by every chart: fade and rise a few pixels, once. */
export const reveal = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -8% 0px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};
