"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGES, useLanguage } from "@/providers/language-provider";
import IconButton from "@/components/ui/IconButton";

export default function LanguagePicker({ align = "right" }: { align?: "left" | "right" }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const DROPDOWN_WIDTH = 176; // w-44

  // Recompute the trigger button's screen position each time the dropdown
  // opens — the dropdown itself is portaled to document.body (see render
  // below), rather than nested under the button, so it isn't subject to
  // whatever stacking context the button's ancestors happen to be in (e.g.
  // TopBar sits outside PageTransition's animated container, which has
  // repeatedly proven unreliable to out-z-index from within).
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const left = align === "left" ? rect.left : rect.right - DROPDOWN_WIDTH;
    setPos({ top: rect.bottom + 8, left });
  }, [open, align]);

  // Close on outside click — checks both the trigger button and the portaled
  // dropdown, since they're no longer in the same DOM subtree.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <>
      <IconButton
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="relative"
        aria-label="Select language"
        aria-expanded={open}
      >
        <Globe size={18} />
        <span className="absolute -bottom-1 -right-1 text-[8px] font-bold uppercase bg-gold text-background rounded-full px-1 leading-tight">
          {current.code}
        </span>
      </IconButton>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.ul
                ref={dropdownRef}
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{ position: "fixed", top: pos.top, left: pos.left, width: DROPDOWN_WIDTH }}
                className="rounded-2xl border border-gold/20 bg-card shadow-xl overflow-hidden z-[100]"
              >
                {LANGUAGES.map((l) => {
                  const active = l.code === lang;
                  return (
                    <li key={l.code}>
                      <button
                        onClick={() => {
                          setLang(l.code);
                          setOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gold/10 ${
                          active ? "text-gold" : "text-foreground/80"
                        }`}
                      >
                        <span className="flex flex-col items-start leading-tight">
                          <span className="font-medium">{l.native}</span>
                          <span className="text-[10px] text-muted">{l.label}</span>
                        </span>
                        {active && <Check size={14} className="text-gold" />}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
