"use client";

import type { TraceImage } from "@/lib/vastu/trace";

/**
 * The traced photo, drawn faintly beneath the plan. Render it first inside
 * PlanCanvas's <svg> so the plot and rooms paint over it. Plan units only.
 */
export default function TraceUnderlay({ trace }: { trace: TraceImage }) {
  const w = trace.width * trace.scale;
  const h = trace.height * trace.scale;
  const cx = trace.x + w / 2;
  const cy = trace.y + h / 2;
  return (
    <image
      href={trace.dataUrl}
      x={trace.x}
      y={trace.y}
      width={w}
      height={h}
      transform={trace.rotation ? `rotate(${trace.rotation} ${cx} ${cy})` : undefined}
      opacity={trace.opacity}
      preserveAspectRatio="none"
      pointerEvents="none"
      aria-hidden
      data-testid="vastu-trace-underlay"
      style={{ pointerEvents: "none" }}
    />
  );
}
