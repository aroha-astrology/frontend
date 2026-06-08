"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Theme-aware card surface — single source of truth for the app's card look.
 * Uses the `card` token so it turns dark in dark mode and white in light mode.
 * Accepts all framer-motion props, so callers keep their entrance animations.
 * Pass `className` to tweak padding / border / radius; tailwind-merge resolves conflicts.
 */
export default function Card({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(
        "rounded-3xl border border-gold/20 bg-card transition-colors",
        className
      )}
      {...props}
    />
  );
}
