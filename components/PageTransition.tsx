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
    // No `mode="wait"`: that mode holds the new page unmounted until the
    // outgoing page's exit animation fully resolves, and a second nav tap
    // while the first exit is still playing (rapid taps, a slow device, a
    // tab switch during the ~220ms window) can leave that exit promise
    // never resolving — the URL/pathname changes (the tap "worked"), but
    // the gate AnimatePresence is waiting on never opens, so the new page
    // never mounts. Default (sync) mode mounts the new page immediately
    // regardless of the old one's exit state, trading a brief crossfade
    // overlap for never getting stuck.
    <AnimatePresence initial={false}>
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
