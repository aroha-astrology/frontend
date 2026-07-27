"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CalloutProps {
  /** Small glyph prefixed to the eyebrow line, e.g. "✦" or "→". Purely decorative (aria-hidden). */
  symbol?: string;
  /** Caps, letterspaced label, e.g. "THE BIG PICTURE" or "PRACTICAL TIP". */
  eyebrow: string;
  /** Body content — plain text or JSX with inline emphasis (e.g. <strong>/<em>). */
  children: ReactNode;
  className?: string;
}

/**
 * A tinted panel with a left gold accent rule. Uses the bare `border-gold` /
 * `text-gold` utilities, which app/globals.css redefines to the theme-reactive
 * `--gold` / `--border` CSS custom properties (distinct from the fixed-hex
 * Tailwind palette color used by opacity-modified classes like `border-gold/15`
 * elsewhere in this codebase), so this reads correctly in both light and dark
 * without any hardcoded hex.
 */
export default function Callout({ symbol = "✦", eyebrow, children, className }: CalloutProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-2xl border-l-4 border-gold bg-gold/5 p-4", className)}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
        {symbol && <span aria-hidden="true">{symbol}</span>}
        {eyebrow}
      </span>
      <div className="text-sm leading-relaxed text-foreground/85">{children}</div>
    </div>
  );
}
