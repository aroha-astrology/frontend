"use client";

import { useLayoutEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Height of one grid row in pixels. Has to match `lg:auto-rows-[4px]` below. */
const ROW_PX = 4;
/** Space under each card in pixels, the same as the `gap-6` between the columns. */
const GAP_PX = 24;

/**
 * A stack of cards that becomes two columns on a wide screen, with each card
 * placed under whichever column is shorter at that point, so neither column
 * is left with a hole beside a long one.
 *
 * It is a grid of very short rows where every card spans as many rows as its
 * height needs; the browser's own placement then puts each card in the first
 * free spot, which is the shorter column. Cards stay in normal flow (nothing
 * is absolutely positioned), so the screen-to-PDF capture and the tour's
 * spotlight measure them as they would any other layout.
 *
 * Works on the DOM children rather than React children because the report
 * screens hand back a fragment of cards, some of which render nothing. No
 * package does that: the React ones need an array of children to deal out,
 * and the DOM ones position everything absolutely.
 *
 * A card that changes height (an accordion row opening) is measured again,
 * and the cards after it move to wherever is now shorter.
 */
export default function Masonry({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  // Layout effect, so the first paint already has every card's span; without
  // one a card is a single row tall and the next card is drawn over it.
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;

    const setSpan = (card: Element) => {
      if (!(card instanceof HTMLElement)) return;
      const rows = Math.ceil((card.getBoundingClientRect().height + GAP_PX) / ROW_PX);
      card.style.gridRowEnd = `span ${rows}`;
    };

    const sizes = new ResizeObserver((entries) => entries.forEach((entry) => setSpan(entry.target)));
    const watch = (card: Element) => {
      setSpan(card);
      sizes.observe(card);
    };
    const cards = new MutationObserver((records) => {
      for (const record of records) {
        record.removedNodes.forEach((node) => node instanceof Element && sizes.unobserve(node));
        record.addedNodes.forEach((node) => node instanceof Element && watch(node));
      }
    });

    Array.from(grid.children).forEach(watch);
    cards.observe(grid, { childList: true });
    return () => {
      sizes.disconnect();
      cards.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-0 lg:auto-rows-[4px]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
