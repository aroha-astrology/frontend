"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FactCardProps {
  /** Caps, letterspaced label above the title. */
  eyebrow: string;
  /** Bold title line. */
  title: string;
  /** Prose body. */
  children: ReactNode;
  className?: string;
}

/**
 * A single small fact/callout — simpler than ChapterCard (no accent rule, no
 * section-heading treatment), for one fact rather than a whole section. Same
 * tile styling as the small 2-column facts in ReportScoreFacts.tsx
 * (rounded-2xl border border-gold/15 bg-card p-3, [10px] uppercase
 * tracking-wider eyebrow — see components/reports/ReportScoreFacts.tsx:48-49),
 * reused verbatim rather than inventing a new tile design.
 */
export default function FactCard({ eyebrow, title, children, className }: FactCardProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-2xl border border-gold/15 bg-card p-3.5", className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted">{eyebrow}</span>
      <h4 className="text-sm font-bold text-foreground">{title}</h4>
      <div className="text-[13px] leading-relaxed text-foreground/80">{children}</div>
    </div>
  );
}
