"use client";

import type { ReactNode } from "react";

/**
 * One row inside a FeatureGroupSection — label + raw key (useful for an
 * internal tool, not customer-facing) on the left, a toggle control (and
 * optionally a price editor) on the right. Shared by the main Features board
 * (a Switch control) and a group's Feature Overrides (a 3-way Inherit/On/Off
 * control) — only the control differs.
 */
export default function FeatureRow({
  label,
  featureKey,
  control,
  priceEditor,
  error,
  isNew = false,
}: {
  label: string;
  featureKey: string;
  control: ReactNode;
  priceEditor?: ReactNode;
  error?: string | null;
  /** Roadmap feature (registry `tag: 'new'`) — shows a NEW badge. */
  isNew?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-foreground truncate flex items-center gap-1.5">
          {isNew && (
            <span className="shrink-0 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
              NEW
            </span>
          )}
          <span className="truncate">{label}</span>
        </p>
        <p className="text-[10px] text-muted truncate">{featureKey}</p>
        {error && <p className="text-[11px] text-red-400 mt-0.5">{error}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {priceEditor}
        {control}
      </div>
    </div>
  );
}
