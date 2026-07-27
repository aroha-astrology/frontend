"use client";

import { computeTraitBars, rightRoundedBarPath } from "@/lib/report-chart-geometry";
import { ACCENT_COLOR } from "@/lib/chart-palette";

/**
 * Horizontal trait-tilt bar chart for Archetype.traits — dataviz skill's
 * form heuristic: comparing 5 named magnitudes calls for direct-comparison
 * bars, not a radar/spider chart (radars are hard to read accurately: the
 * polygon area is visually dominant but carries no real meaning, and
 * comparing two non-adjacent axes means eyeballing angles). Sorted by score
 * descending so the reader sees rank at a glance; each bar is
 * direct-labelled with its own trait name + "score/10" (no legend — a single
 * accent hue needs none, per marks-and-anatomy.md).
 *
 * This IS the trait list, just visualized (see ArchetypeCard.tsx's comment)
 * — there's no separate plain-text trait list alongside it, which would
 * duplicate the same 5 labels twice.
 *
 * One hue (ACCENT_COLOR = var(--gold), this app's existing accent — see
 * lib/chart-palette.ts) — a comparison of one series' magnitudes never needs
 * a categorical palette. Each bar is its own tiny SVG with viewBox 0 0 400 12
 * and a CSS `aspectRatio` lock matching that viewBox exactly, so the
 * rounded-tip path renders as a true (non-elliptical) arc at any responsive
 * width — an unlocked viewBox scaled by width alone would stretch rx into an
 * ellipse.
 */
export default function TraitTiltBars({ traits }: { traits: { label: string; score: number }[] }) {
  const bars = computeTraitBars(traits, 10);
  if (bars.length === 0) return null;

  const VIEW_W = 400;
  const VIEW_H = 12;
  const BAR_Y = 1;
  const BAR_H = 10;

  return (
    <div className="flex flex-col gap-2.5">
      {bars.map((bar, i) => (
        <div key={`${bar.label}-${i}`} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-foreground/80 truncate">{bar.label}</span>
            <span className="text-[10px] tabular-nums text-muted shrink-0">{bar.score}/10</span>
          </div>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
            className="w-full"
            aria-hidden="true"
          >
            {/* Decorative reinforcement of the label+score text above, which
                already carries the accessible name — no new English copy to
                translate (dataviz skill: direct labels + native tooltip are
                a mouse-hover nicety here, not the accessibility channel). */}
            <title>{`${bar.label} ${bar.score}/10`}</title>
            <rect x={0} y={BAR_Y} width={VIEW_W} height={BAR_H} rx={BAR_H / 2} fill="var(--border)" opacity={0.5} />
            {bar.pct > 0 && (
              <path
                d={rightRoundedBarPath(0, BAR_Y, (bar.pct / 100) * VIEW_W, BAR_H, BAR_H / 2)}
                fill={ACCENT_COLOR}
              />
            )}
          </svg>
        </div>
      ))}
    </div>
  );
}
