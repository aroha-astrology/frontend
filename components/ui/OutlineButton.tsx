"use client";

import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Gold-outline pill button (Hero "Generate Kundli" / "Talk To AI" style).
 * Theme-aware fill via the `card` token; gold glow on hover.
 */
export default function OutlineButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "w-full flex items-center justify-center gap-2 py-3.5 px-2 rounded-[14px]",
        "border border-gold/40 bg-card text-gold text-[13px] font-medium tracking-wide",
        "shadow-[0_0_15px_rgba(223,181,100,0.15)] hover:shadow-[0_0_20px_rgba(223,181,100,0.3)] transition-all",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
