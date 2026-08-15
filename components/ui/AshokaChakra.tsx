"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** The 24-spoke wheel from the Indian national flag, navy blue, slowly rotating. */
export default function AshokaChakra({ size = 64, className = "" }: { size?: number; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const spokes = Array.from({ length: 24 });

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      animate={reduced ? undefined : { rotate: 360 }}
      transition={reduced ? undefined : { duration: 20, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="#000080" strokeWidth="3" />
      <circle cx="50" cy="50" r="6" fill="#000080" />
      {spokes.map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="50"
          x2="50"
          y2="6"
          stroke="#000080"
          strokeWidth="2"
          transform={`rotate(${i * 15} 50 50)`}
        />
      ))}
    </motion.svg>
  );
}
