"use client";

import { cn } from "@/lib/utils";

export type ChecklistItem = string | { text: string };

/**
 * Normalizes the two accepted item shapes (a plain string, or a `{ text }`
 * object) down to a flat string list, trimming whitespace and dropping any
 * item that ends up empty. Exported so the shape-handling logic is testable
 * without rendering (see Checklist.test.ts) — the same pure-helper-next-to-
 * component pattern lib/report-score-facts.ts documents for
 * ReportScoreFacts.tsx.
 */
export function normalizeChecklistItems(items: ChecklistItem[]): string[] {
  return items
    .map((item) => (typeof item === "string" ? item : item.text))
    .map((text) => text.trim())
    .filter((text) => text.length > 0);
}

export interface ChecklistProps {
  items: ChecklistItem[];
  className?: string;
}

/**
 * Renders a list of items, each prefixed with a checkmark glyph, styled as a
 * real list (no browser default markers/indent). Renders nothing for an
 * empty/all-blank list rather than an empty <ul>.
 */
export default function Checklist({ items, className }: ChecklistProps) {
  const normalized = normalizeChecklistItems(items);
  if (normalized.length === 0) return null;

  return (
    <ul className={cn("flex list-none flex-col gap-2 pl-0", className)}>
      {normalized.map((text, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85">
          <span className="mt-0.5 shrink-0 text-gold" aria-hidden="true">
            ✓
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
