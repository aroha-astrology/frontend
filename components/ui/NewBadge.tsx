"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Corner tag for a just-enabled report catalogue entry (see reports-api.ts's
 * ReportCatalogueEntry.isNew). Deliberately its own small gold-gradient pill rather than a
 * StatusPill tone — StatusPill's vocabulary (positive/neutral/caution/muted) is a result
 * label, not a "look at this" marketing accent, so a 5th tone there would be a mismatch, not
 * a reuse.
 */
export default function NewBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-gradient-to-r from-gold to-amber-300 text-[#1a0e00] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm",
        className,
      )}
    >
      {t("reports.newBadge")}
    </span>
  );
}
