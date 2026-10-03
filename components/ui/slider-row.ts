/**
 * The Home card rows (moon-sign horoscopes, reports). On a phone: a swipeable
 * strip that runs off the right edge, scrollbar hidden. From 768px: a grid
 * inside the page width, because a hidden-scrollbar strip can't be scrolled
 * with a mouse. Cards pair this with `md:min-w-0 md:max-w-none` to drop their
 * fixed 160px phone width.
 */
export const SLIDER_ROW =
  "flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5 md:grid md:grid-cols-4 2xl:grid-cols-6 md:overflow-visible md:pr-0";
