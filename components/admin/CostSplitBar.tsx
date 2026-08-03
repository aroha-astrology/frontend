"use client";

import { formatRupees } from "@/lib/format";
import type { CostSplit } from "@/lib/admin-format";

/**
 * Green/red stacked bar showing how much of a feature's (or the whole table's)
 * cost the free key pool absorbed vs. what actually hit the paid reserve —
 * green = free (real ₹ not spent), red = paid (real ₹ spent). Requested
 * directly: show the total first, then this split beneath it, in rupees and
 * percent, both segments always summing to 100% (see splitFreeVsPaid).
 *
 * On a normal day paidPercent is 0 and the bar renders solid green — that is
 * correct, not a rendering bug (see the "Billed is real ₹0" note elsewhere on
 * this page).
 */
export default function CostSplitBar({
  split,
  compact = false,
}: {
  split: CostSplit;
  /** Smaller footprint for use inline in a table cell. */
  compact?: boolean;
}) {
  const { freePaise, paidPaise, freePercent, paidPercent } = split;

  return (
    <div className={compact ? "w-full" : "max-w-md"}>
      <div
        role="img"
        aria-label={`${freePercent}% free tier, ${paidPercent}% paid reserve`}
        className={`flex w-full overflow-hidden rounded-full bg-muted/20 ${compact ? "h-1.5" : "h-2.5"}`}
      >
        {freePercent > 0 && (
          <div className="bg-green-500" style={{ width: `${freePercent}%` }} />
        )}
        {paidPercent > 0 && <div className="bg-red-500" style={{ width: `${paidPercent}%` }} />}
      </div>
      <div className={`flex justify-between gap-2 mt-1 ${compact ? "text-[10px]" : "text-xs"}`}>
        <span className="text-green-400">
          {formatRupees(freePaise)} free ({freePercent}%)
        </span>
        <span className="text-red-400">
          {formatRupees(paidPaise)} paid ({paidPercent}%)
        </span>
      </div>
    </div>
  );
}
