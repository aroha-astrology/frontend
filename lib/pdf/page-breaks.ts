/**
 * Decides where a tall screen is cut into PDF pages. Cutting at a fixed height
 * slices through whatever happens to sit there (half a line of text, half a
 * chart), so each cut is moved up to the nearest clean gap instead.
 *
 * No DOM in here: ./capture.ts measures the page and passes plain numbers in,
 * which keeps this testable.
 */

/** A vertical extent in CSS pixels, measured from the top of the captured area. */
export interface Span {
  top: number;
  bottom: number;
}

export interface PageBreakInput {
  /** Full height of the captured area. */
  totalHeight: number;
  /** How much of that height fits on one page. */
  pageHeight: number;
  /** Things a cut must not pass through: a line of text, a picture, a chart. */
  keepWhole: Span[];
  /** Things a cut should avoid if it can: a card, a table row. */
  preferWhole: Span[];
}

/** A cut may move up by at most this share of a page, so no page ends up mostly empty. */
const MAX_BACKTRACK = 0.4;

/** Number of spans a cut at each whole pixel would pass through. */
function cutCounts(spans: Span[], totalHeight: number): Int32Array {
  const size = Math.ceil(totalHeight) + 2;
  const delta = new Int32Array(size + 1);
  for (const span of spans) {
    // A cut exactly on a span's edge doesn't damage it; only strictly inside counts.
    const first = Math.max(0, Math.floor(span.top) + 1);
    const last = Math.min(size - 1, Math.ceil(span.bottom) - 1);
    if (last < first) continue;
    delta[first]! += 1;
    delta[last + 1]! -= 1;
  }
  const counts = new Int32Array(size);
  let running = 0;
  for (let y = 0; y < size; y++) {
    running += delta[y]!;
    counts[y] = running;
  }
  return counts;
}

/** The pages, top to bottom, as extents of the captured area. Always covers every pixel once. */
export function planPages({ totalHeight, pageHeight, keepWhole, preferWhole }: PageBreakInput): Span[] {
  const total = Math.ceil(totalHeight);
  const page = Math.max(1, Math.floor(pageHeight));
  const hard = cutCounts(keepWhole, total);
  const soft = cutCounts(preferWhole, total);

  const pages: Span[] = [];
  let top = 0;
  while (total - top > page) {
    const ideal = top + page;
    const lowest = Math.max(top + 1, Math.ceil(ideal - page * MAX_BACKTRACK));
    let best = ideal;
    // Walk upward and keep the first cut that damages the least, so a tie goes to the fuller page.
    for (let y = ideal - 1; y >= lowest; y--) {
      if (hard[y]! < hard[best]! || (hard[y] === hard[best] && soft[y]! < soft[best]!)) best = y;
    }
    pages.push({ top, bottom: best });
    top = best;
  }
  pages.push({ top, bottom: total });
  return pages;
}
