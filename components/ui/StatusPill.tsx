import { cn } from "@/lib/utils";

/**
 * Generic status→color pill. Generalizes the `statusClasses()` formula from
 * `app/settings/history/page.tsx` (rounded-full border px-2.5 py-1 text-[11px]
 * font-medium, text/bg/border in the -400/-500/10/-500/30 shade pattern).
 *
 * This component is domain-agnostic: it takes an already-translated `label`
 * and a `tone`, and doesn't know what it's labeling. Callers own the
 * status→tone mapping for their own domain. Suggested maps, for the two
 * booking systems this was built for:
 *
 * Astrologer bookings (`AstrologerBookingStatus`):
 *   requested → "pending", confirmed → "info", completed → "success",
 *   declined → "danger", cancelled → "neutral", refunded → "success"
 *
 * Pooja bookings (`PoojaBookingStatus`):
 *   requested → "pending", assigned → "info", completed → "success",
 *   cancelled → "neutral", refunded → "success"
 */
export type StatusPillTone = "success" | "pending" | "danger" | "neutral" | "info";

export interface StatusPillProps {
  label: string;
  tone: StatusPillTone;
  className?: string;
}

const TONE_CLASSES: Record<StatusPillTone, string> = {
  success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  danger: "text-red-400 bg-red-500/10 border-red-500/30",
  neutral: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  info: "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

export default function StatusPill({ label, tone, className }: StatusPillProps) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", TONE_CLASSES[tone], className)}>
      {label}
    </span>
  );
}
