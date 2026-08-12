"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Lowercase graha glyphs, keyed to match the asset basenames under /planets.
 *
 * NOTE: four Capitalized copies of this same map already exist un-exported
 * (app/kundli/page.tsx, components/ui/NorthIndianChart.tsx, SouthIndianChart.tsx,
 * HouseGrid.tsx). This one is exported so future work has a single copy to
 * converge on; the existing four are deliberately left alone rather than
 * refactored from inside a UI redesign, where touching the chart renderers
 * would add regression risk for no visual gain.
 */
export const PLANET_GLYPH: Record<string, string> = {
  sun: "☉",
  moon: "☾",
  mars: "♂",
  mercury: "☿",
  jupiter: "♃",
  venus: "♀",
  saturn: "♄",
  rahu: "☊",
  ketu: "☋",
};

/**
 * Planet artwork at /planets/<name>.png, falling back to the Unicode glyph in a
 * gold-bordered badge when the image is missing or fails to load — an unrecognised
 * lord name from the backend, or an asset not yet sliced from the design sheet.
 *
 * Same either/or `<img>` + `onError` swap as ReportThemeCard's `ReportVisual` and
 * GemstoneCard's `GemVisual`, and a plain <img> for the same reason they use one:
 * `src` is a runtime template literal and next/image has no equivalent fallback path.
 */
export default function PlanetIcon({ planet, size = 36, className }: { planet: string; size?: number; className?: string }) {
  const [imgError, setImgError] = useState(false);
  const glyph = PLANET_GLYPH[planet];

  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/planets/${planet}.png`}
        alt=""
        aria-hidden
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
        className={cn("shrink-0 object-contain", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "shrink-0 grid place-items-center rounded-full border border-gold/30 bg-gold/5 text-gold",
        className,
      )}
    >
      {glyph ?? planet.slice(0, 1).toUpperCase()}
    </span>
  );
}
