"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Plan, Pt } from "@/lib/vastu/types";
import { planCenter } from "@/lib/vastu/geometry";
import { sixteenSectors, padaGrid } from "@/lib/vastu/grid";

const GOLD = "#D4AF37";
const LABEL_HALO = "var(--card)";

const polyPoints = (poly: Pt[]) => poly.map((p) => `${p.x},${p.y}`).join(" ");

/**
 * Display-only advanced Vastu guides drawn inside PlanCanvas's <svg> (plot
 * units): the 16-zone wheel or the 9×9 Vastu Purusha Mandala. Never affects
 * scoring.
 */
export default function AdvancedOverlay({ plan, mode, radius }: { plan: Plan; mode: "zones16" | "grid81"; radius: number }) {
  const { t } = useTranslation();
  const sectors = useMemo(() => (mode === "zones16" ? sixteenSectors(plan, radius) : []), [plan, mode, radius]);
  const grid = useMemo(() => (mode === "grid81" ? padaGrid(plan, 9) : null), [plan, mode]);
  const center = planCenter(plan);

  if (mode === "zones16") {
    return (
      <g style={{ pointerEvents: "none" }} data-testid="vastu-advanced-overlay" data-mode="zones16" aria-hidden>
        <g clipPath="url(#vastu-plot-clip)">
          {sectors.map((s, i) => (
            <path key={s.zone} d={s.path} fill={GOLD} fillOpacity={i % 2 ? 0.025 : 0.075} stroke={GOLD} strokeOpacity={0.35} strokeWidth={0.03} />
          ))}
        </g>
        {sectors.map((s, i) => {
          const cardinal = i % 4 === 0;
          return (
            <text
              key={s.zone}
              x={s.labelAt.x}
              y={s.labelAt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={cardinal ? 0.55 : 0.45}
              fontWeight={cardinal ? 700 : 600}
              letterSpacing={0.02}
              fill={GOLD}
              fillOpacity={cardinal ? 0.95 : 0.75}
              stroke={LABEL_HALO}
              strokeWidth={0.14}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {s.zone}
            </text>
          );
        })}
      </g>
    );
  }

  if (!grid) return null;
  return (
    <g style={{ pointerEvents: "none" }} data-testid="vastu-advanced-overlay" data-mode="grid81" aria-hidden>
      <g clipPath="url(#vastu-plot-clip)">
        {grid.cells
          .filter((c) => c.ring >= 1 && c.ring <= 3)
          .map((c) => (
            <polygon key={`${c.row}-${c.col}`} points={polyPoints(c.polygon)} fill={GOLD} fillOpacity={c.ring === 1 ? 0.035 : c.ring === 2 ? 0.02 : 0.01} />
          ))}
        <polygon points={polyPoints(grid.brahmasthan)} fill={GOLD} fillOpacity={0.12} />
        {grid.lines.map((l, i) => (
          <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke={GOLD} strokeOpacity={0.4} strokeWidth={0.03} />
        ))}
        <polygon points={polyPoints(grid.brahmasthan)} fill="none" stroke={GOLD} strokeOpacity={0.85} strokeWidth={0.06} strokeDasharray="0.22 0.16" strokeLinejoin="round" />
      </g>
      <text
        x={center.x}
        y={center.y + 0.95}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={0.45}
        fontWeight={600}
        letterSpacing={0.04}
        fill={GOLD}
        fillOpacity={0.9}
        stroke={LABEL_HALO}
        strokeWidth={0.14}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {t("vastu.grid.brahmasthan", "Brahmasthan")}
      </text>
    </g>
  );
}
