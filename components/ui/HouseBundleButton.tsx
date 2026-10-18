"use client";

import { Loader2 } from "lucide-react";

export interface HouseBundleButtonProps {
  label: string;
  priceText: string;
  savingText: string | null;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function HouseBundleButton(
  props: HouseBundleButtonProps
) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled || props.busy}
      data-testid="house-bundle"
      className="w-full rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-left transition-opacity disabled:opacity-50"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">
          {props.label}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-bold text-gold">
          {props.busy && <Loader2 size={14} className="animate-spin" />}
          {props.priceText}
        </span>
      </span>
      {props.savingText !== null && (
        <span
          className="mt-1 block text-[11px] font-medium text-emerald-400"
          data-testid="house-bundle-saving"
        >
          {props.savingText}
        </span>
      )}
    </button>
  );
}
