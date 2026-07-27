"use client";

import { cn } from "@/lib/utils";

export interface ColophonProps {
  /** Disclaimer/legal copy — caller-supplied and caller-translated; never hardcoded here. */
  disclaimer: string;
  /** Brand line under the disclaimer. Defaults to "AROHA ASTROLOGY". */
  brand?: string;
  className?: string;
}

/**
 * A closing block for the end of a report: a hairline divider, small
 * centered disclaimer text, then a letterspaced brand line. Presentation
 * only — the disclaimer copy is entirely the caller's responsibility (legal
 * text must never be hardcoded/invented in this component).
 */
export default function Colophon({ disclaimer, brand = "AROHA ASTROLOGY", className }: ColophonProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 pb-2 pt-6", className)}>
      <div className="h-px w-full bg-border" aria-hidden="true" />
      <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted">{disclaimer}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">{brand}</p>
    </div>
  );
}
