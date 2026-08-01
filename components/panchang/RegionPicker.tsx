"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { REGION_META, type RegionId } from "@/lib/panchang/regions";
import IconButton from "@/components/ui/IconButton";

type DropdownPos =
  | { top: number; left: number; maxHeight: number; bottom?: undefined }
  | { bottom: number; left: number; maxHeight: number; top?: undefined };

const REGIONS = Object.values(REGION_META);

/**
 * Lets the user pick which regional calendar's native date to show on the
 * Panchang page. Modeled directly on components/LanguagePicker.tsx: same
 * portal-to-body + getBoundingClientRect positioning (clamped inside the
 * viewport horizontally, flips to open upward when there isn't room below,
 * and scrolls internally via maxHeight + overflow-y-auto) so the dropdown
 * can never render cut off or off-screen even with 11 items — more than
 * LanguagePicker's 7 languages.
 */
export default function RegionPicker({
  region,
  onChange,
  align = "right",
}: {
  region: RegionId;
  onChange: (id: RegionId) => void;
  align?: "left" | "right";
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const DROPDOWN_WIDTH = 224; // w-56 — wider than LanguagePicker's w-44 since calendar names run longer (e.g. "Shalivahana Shaka")
  const ITEM_HEIGHT_ESTIMATE = 46; // matches the two-line row markup below
  const DROPDOWN_HEIGHT_ESTIMATE = REGIONS.length * ITEM_HEIGHT_ESTIMATE + 8;
  const GAP = 8;

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

  return (
    <>
      <IconButton
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={t("horoscope.panchang.regionPicker.ariaLabel")}
        aria-expanded={open}
      >
        <CalendarDays size={16} />
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
                style={{
                  position: "fixed",
                  left: pos.left,
                  width: DROPDOWN_WIDTH,
                  maxHeight: pos.maxHeight,
                  ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
                }}
                className="rounded-2xl border border-gold/20 bg-card shadow-xl overflow-y-auto z-[100]"
              >
                {REGIONS.map((meta) => {
                  const active = meta.id === region;
                  return (
                    <li key={meta.id}>
                      <button
                        onClick={() => {
                          onChange(meta.id);
                          setOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gold/10 ${
                          active ? "text-gold" : "text-foreground/80"
                        }`}
                      >
                        <span className="flex flex-col items-start leading-tight min-w-0">
                          <span className="font-medium truncate">{meta.label}</span>
                          <span className="text-[10px] text-muted truncate">{meta.calendarName}</span>
                        </span>
                        {active && <Check size={14} className="text-gold shrink-0" />}
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
