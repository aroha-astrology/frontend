"use client";

import { cn } from "@/lib/utils";

/**
 * Horizontal scrolling row of category chips, with a leading "All" pill.
 * Scroll structure copied from `VargaChartTabs.tsx` (`overflow-x-auto` +
 * `shrink-0` + `scrollbar-hide`); color formula copied from
 * `app/horoscope/page.tsx`'s tab row — NOT `VargaChartTabs`'s own colors,
 * which use `bg-primary`/`text-accent` tokens that aren't defined in
 * `tailwind.config.ts` and render as no-ops. `rounded-full` (not that page's
 * `rounded-xl`) since this is a lighter pill row, not a fixed-width tab grid.
 *
 * Only meant for ≥5 options (e.g. Shagun's 7 categories + "All") —
 * `SegmentedToggle.tsx` still owns the ≤4-option non-scrolling case.
 */
export interface CategoryChipRowOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface CategoryChipRowProps<T extends string> {
  value: T | "all";
  options: CategoryChipRowOption<T>[];
  onChange: (value: T | "all") => void;
  allLabel: string;
  className?: string;
}

function chipClasses(active: boolean): string {
  return cn(
    "shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium border transition-colors",
    active ? "border-gold/50 bg-gold/10 text-gold" : "border-gold/10 text-muted hover:border-gold/30",
  );
}

export default function CategoryChipRow<T extends string>({
  value,
  options,
  onChange,
  allLabel,
  className,
}: CategoryChipRowProps<T>) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 scrollbar-hide", className)}>
      <button type="button" onClick={() => onChange("all")} className={chipClasses(value === "all")}>
        {allLabel}
      </button>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={chipClasses(value === option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
