"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Check, CircleDot, XCircle, Sparkle } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { RATING_META, TONE_CLASSES } from "@/lib/vastu/data";
import type { RoomRating } from "@/lib/vastu/analysis";

/** A bottom sheet that animates in and out. */
export function Sheet({ open, onClose, title, subtitle, children }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {open && (
        <BottomSheetModal
          onClose={onClose}
          closeLabel={t("common.close", "Close")}
          header={
            <div className="min-w-0">
              <h3 className="font-display text-base text-gold truncate">{title}</h3>
              {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
            </div>
          }
        >
          {children}
        </BottomSheetModal>
      )}
    </AnimatePresence>
  );
}

const RATING_ICON = {
  ideal: CheckCircle2,
  acceptable: Check,
  poor: CircleDot,
  harmful: XCircle,
  center: Sparkle,
} as const;

/** Rating as icon + words — never colour alone. */
export function RatingPill({ ratingKey, size = "sm" }: { ratingKey: RoomRating["ratingKey"]; size?: "sm" | "xs" }) {
  const { t } = useTranslation();
  const meta = RATING_META[ratingKey];
  const cls = TONE_CLASSES[meta.tone];
  const Icon = RATING_ICON[ratingKey];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border whitespace-nowrap ${cls.chip} ${cls.text} ${size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"} font-semibold`}>
      <Icon size={size === "xs" ? 10 : 12} strokeWidth={2.5} />
      {t(meta.labelKey)}
    </span>
  );
}

/** The ASCII-safe symbol used in the on-canvas badge. */
export const RATING_SYMBOL: Record<RoomRating["ratingKey"], string> = {
  ideal: "✓",
  acceptable: "✓",
  poor: "•",
  harmful: "✕",
  center: "✦",
};

/** A number that counts to its new value instead of jumping. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const dur = 450;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return <span className={`tabular-nums ${className ?? ""}`}>{shown}</span>;
}

export function scoreColor(score: number) {
  return score >= 75 ? "#21D88A" : score >= 50 ? "#F3C74B" : "#FF6767";
}

/** Circular score gauge. */
export function ScoreRing({ score, size = 44, stroke = 4, empty }: { score: number; size?: number; stroke?: number; empty?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(223,181,100,0.14)" strokeWidth={stroke} />
      {!empty && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 450ms cubic-bezier(.2,.8,.2,1), stroke 300ms" }}
        />
      )}
    </svg>
  );
}

/** A labelled dock button (bottom action bar). */
export function DockButton({ icon, label, onClick, primary, disabled, active, testId, tour }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  active?: boolean;
  testId?: string;
  tour?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-testid={testId}
      data-tour={tour}
      className={
        "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1 text-[10.5px] font-semibold transition-all active:scale-95 disabled:opacity-35 disabled:active:scale-100 " +
        (primary
          ? "bg-gold text-[#1a0e00] shadow-[0_6px_20px_-6px_rgba(223,181,100,0.6)]"
          : active
            ? "bg-gold/15 text-gold border border-gold/40"
            : "bg-surface border border-gold/12 text-foreground/85 hover:border-gold/35")
      }
    >
      {icon}
      <span className="truncate max-w-full">{label}</span>
    </button>
  );
}

/** Small uppercase label used above sections. */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80 ${className}`}>{children}</p>;
}
