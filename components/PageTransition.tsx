"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/** Bottom-nav tab order — determines slide direction between them. */
const TAB_ORDER = ["/", "/vastu", "/ai-chat", "/horoscope", "/panchang"];

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevIndexRef = useRef(0);

  // Every route change should land at the top, regardless of where the
  // previous page was scrolled to. Next's default scroll-to-top on
  // navigation isn't reliable inside the Capacitor WebView, so we force it
  // explicitly here alongside the transition that already keys off pathname.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const index = TAB_ORDER.indexOf(pathname);
  const prevIndex = prevIndexRef.current;
  // Moving to a later tab slides in from the right (right-to-left motion);
  // moving to an earlier one slides in from the left. Unrecognized routes
  // (not one of the 5 tabs) default to entering from the right.
  const direction = index === -1 || index >= prevIndex ? 1 : -1;
  if (index !== -1) prevIndexRef.current = index;

  return (
    // Enter-only, no AnimatePresence. An exit animation keeps the outgoing
    // page mounted alongside the incoming one, and since both are plain
    // block elements in normal document flow they STACK: the (invisible,
    // fading) old page occupies its full height ABOVE the new page, which
    // reads as a screen-tall blank gap at the top of every freshly-opened
    // page. `mode="wait"` would fix the stacking but reintroduces the
    // stuck-exit hazard (a second nav tap during the exit can leave the
    // gate closed so the new page never mounts at all). Dropping the exit
    // animation avoids both: the old page unmounts instantly, the new one
    // still slides in on its `key` change.
    <motion.div
      key={pathname}
      initial={{ x: direction * 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
