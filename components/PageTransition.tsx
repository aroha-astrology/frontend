"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

/** Bottom-nav tab order — determines slide direction between them. */
const TAB_ORDER = ["/", "/kundli", "/ai-chat", "/horoscope", "/panchang"];

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevIndexRef = useRef(0);

  const index = TAB_ORDER.indexOf(pathname);
  const prevIndex = prevIndexRef.current;
  // Moving to a later tab slides in from the right (right-to-left motion);
  // moving to an earlier one slides in from the left. Unrecognized routes
  // (not one of the 5 tabs) default to entering from the right.
  const direction = index === -1 || index >= prevIndex ? 1 : -1;
  if (index !== -1) prevIndexRef.current = index;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ x: direction * 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -direction * 24, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
