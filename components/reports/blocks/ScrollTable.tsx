import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A table that scrolls sideways inside its own box when it is wider than the
 * card it sits in — the one place report tables get that behaviour, so a wide
 * table can never widen the page.
 *
 * `relative` is the part that is easy to leave out and expensive to miss. A
 * table cell often carries a visually hidden label (`sr-only`), which is
 * absolutely positioned; with no positioned ancestor inside the scroll box, its
 * containing block is the page, so it is neither scrolled nor clipped by the
 * box and sits wherever its cell would be — out past the screen edge. That one
 * 1px label then makes the whole page wider than the screen, and Chrome on
 * Android lays out every `position: fixed` element (the bottom tab bar, every
 * bottom sheet) against that wider page. That is how the KP report shifted the
 * rating sheet to the right.
 */
export default function ScrollTable({
  className,
  tableClassName,
  children,
}: {
  /** Extra classes for the scroll box, e.g. a border. */
  className?: string;
  /** Classes for the <table>; give it a `min-w-[…]` when its columns need room. */
  tableClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-x-auto scrollbar-hide", className)}>
      <table className={cn("w-full text-xs", tableClassName)}>{children}</table>
    </div>
  );
}
