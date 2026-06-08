"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Round gold-bordered icon button used across the top bar (menu, bell,
 * theme toggle, language). Theme-aware via the `card` token.
 */
const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center",
          "text-gold bg-card backdrop-blur-md hover:bg-gold/10 transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export default IconButton;
