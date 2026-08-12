"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGES, useLanguage } from "@/providers/language-provider";
import IconButton from "@/components/ui/IconButton";
import { useTranslation } from "react-i18next";

type DropdownPos =
  | { top: number; left: number; maxHeight: number; bottom?: undefined }
  | { bottom: number; left: number; maxHeight: number; top?: undefined };

export default function LanguagePicker({
  align = "right",
  showLabel = false,
}: {
  align?: "left" | "right";
  /** Renders a bordered "Language ⌄" pill instead of the default icon-only circular trigger. */
  showLabel?: boolean;
}) {
  const { t } = useTranslation();
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const DROPDOWN_WIDTH = 176; // w-44
  const ITEM_HEIGHT_ESTIMATE = 46; // px-4 py-2.5 + two-line label, matches the row markup below
  const DROPDOWN_HEIGHT_ESTIMATE = LANGUAGES.length * ITEM_HEIGHT_ESTIMATE + 8;
  const GAP = 8;

  // Recompute the trigger button's screen position each time the dropdown
  // opens — the dropdown itself is portaled to document.body (see render
  // below), rather than nested under the button, so it isn't subject to
  // whatever stacking context the button's ancestors happen to be in (e.g.
  // TopBar sits outside PageTransition's animated container, which has
  // repeatedly proven unreliable to out-z-index from within).
  //
  // Flips to open upward when there isn't room below (e.g. the trigger sits
  // near the bottom of the screen on mobile) and more room exists above than
  // below — otherwise the dropdown would render past the viewport edge with
  // no way to scroll it into view. Height is a constant estimate rather than
  // a post-render measurement to avoid an open-then-jump flash.
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const spaceBelow = viewportH - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const openUpward = spaceBelow < DROPDOWN_HEIGHT_ESTIMATE && spaceAbove > spaceBelow;

    let left = align === "left" ? rect.left : rect.right - DROPDOWN_WIDTH;
    left = Math.max(GAP, Math.min(left, viewportW - DROPDOWN_WIDTH - GAP));

    setPos(
      openUpward
        ? { left, bottom: viewportH - rect.top + GAP, maxHeight: Math.max(160, spaceAbove) }
        : { left, top: rect.bottom + GAP, maxHeight: Math.max(160, spaceBelow) },
    );
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
      {showLabel ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Select language"
          aria-expanded={open}
          className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-gold/20 text-muted text-xs font-medium"
        >
          <Globe size={14} className="text-gold" />
          <span>{t("settings.language")}</span>
          <ChevronDown size={12} />
        </button>
      ) : (
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
      )}

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
                style={{
                  position: "fixed",
                  left: pos.left,
                  width: DROPDOWN_WIDTH,
                  maxHeight: pos.maxHeight,
                  ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
                }}
                className="rounded-2xl border border-gold/20 bg-card shadow-xl overflow-y-auto z-[100]"
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
