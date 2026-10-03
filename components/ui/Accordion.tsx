"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePdfCapturing } from "@/components/pdf/PdfCapturingContext";

export interface AccordionProps {
  /** Row content: icon, title, subtitle, status pill — whatever the caller needs. */
  header: ReactNode;
  children: ReactNode;
  /** Open on first render. Uncontrolled thereafter — each row owns its own state so
   * several can be open at once, which is what a long read wants. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Single collapsible disclosure row. The app had no such primitive — DoshaCard,
 * YogaCard, GemstoneCard and HouseUnlockDrawer each hand-rolled a local `expanded`
 * boolean — so this is the shared one, built on framer-motion (already a dependency)
 * rather than a new package.
 *
 * The header is a real <button> with aria-expanded/aria-controls so the row is
 * reachable and announced correctly by a screen reader; the panel keeps its
 * heading semantics by rendering whatever the caller passes.
 *
 * Honors prefers-reduced-motion by snapping open/shut instead of animating height,
 * matching the guard already used on globals.css's `.animate-mala-cloud-drift`.
 *
 * While the screen is being saved as a PDF every row shows its panel, with no
 * animation, so the file carries the whole text and not just the open rows.
 */
export default function Accordion({ header, children, defaultOpen = false, className }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const capturing = usePdfCapturing();
  const shown = open || capturing;

  return (
    <div className={cn("rounded-2xl border border-gold/15 bg-card overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={shown}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 p-3.5 text-left"
      >
        <span className="flex-1 min-w-0">{header}</span>
        <motion.span
          animate={{ rotate: shown ? 180 : 0 }}
          transition={reduceMotion || capturing ? { duration: 0 } : { duration: 0.2 }}
          className="shrink-0 text-muted"
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>

      {capturing ? (
        // Swapped in whole, not animated: an exiting panel would still be on screen, and so
        // in the picture, next to this one.
        <div id={panelId} className="px-3.5 pb-3.5">
          {children}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-3.5 pb-3.5">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
