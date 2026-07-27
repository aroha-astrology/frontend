"use client";

import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Small convenience palette for `accent` — named keys resolve to a literal
 * CSS color applied via inline `style` (not a Tailwind class), so an
 * arbitrary hex/rgb passed straight through works identically. This
 * sidesteps the Tailwind-JIT-scanning trap lib/report-theme.ts documents
 * (a literal class STRING built outside a scanned `content` glob silently
 * produces no CSS) entirely, since no class name is ever generated from
 * this value — it's a plain inline style.
 */
const NAMED_ACCENTS: Record<string, string> = {
  gold: "var(--gold)",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  sky: "#0ea5e9",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  fuchsia: "#d946ef",
};

/**
 * Resolves a named palette key to its color, or passes any other string
 * (hex/rgb/CSS var) through untouched. Defaults to the app's theme-reactive
 * gold CSS var when no accent is given.
 */
export function resolveChapterAccent(accent?: string): string {
  if (!accent) return NAMED_ACCENTS.gold;
  return NAMED_ACCENTS[accent] ?? accent;
}

export interface ChapterCardProps {
  /** Section heading, rendered in the app's display font. */
  heading: string;
  /** Optional italic subtitle line under the heading. */
  dek?: string;
  /** A named palette key (see NAMED_ACCENTS) or any literal CSS color (hex/rgb). Defaults to gold. */
  accent?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * A paper-like card wrapping one report section: a colored top rule, a
 * display-font heading, an optional italic dek, then arbitrary children
 * content below. Built on the shared Card surface (rounded-3xl, bg-card,
 * theme-aware) rather than a bespoke container, matching every other
 * report-fact component's precedent (AgeBandTable/DecadeArcCard/
 * TimingWindowsCard/ArchetypeCard all wrap in Card).
 */
export default function ChapterCard({ heading, dek, accent, children, className }: ChapterCardProps) {
  const color = resolveChapterAccent(accent);
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg leading-snug text-foreground">{heading}</h3>
          {dek && <p className="mt-1 text-sm italic leading-relaxed text-muted">{dek}</p>}
        </div>
        {children && <div className="flex flex-col gap-3">{children}</div>}
      </div>
    </Card>
  );
}
