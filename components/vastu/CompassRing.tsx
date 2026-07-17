"use client";

import { DIR8_CW } from "@/lib/vastu/data";

const DIR_BEARING: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

/**
 * Compass-rose bezel around the plot. A direction at real bearing θ appears at
 * screen bearing (θ − northOffsetDeg), so aligning to a real-world heading
 * turns the whole rose while the rooms stay put. Purely decorative styling — a
 * double bezel, degree ticks, a north arrow, and styled cardinals.
 */
export default function CompassRing({
  cx, cy, radius, northOffsetDeg, locked,
}: {
  cx: number; cy: number; radius: number; northOffsetDeg: number; locked: boolean;
}) {
  const ring = locked ? "#D4AF37" : "rgba(212,175,55,0.4)";
  const tickColor = "rgba(212,175,55,0.45)";

  const pt = (bearing: number, r: number) => {
    const rad = (bearing * Math.PI) / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  };
  const screenBearing = (dir: number) => ((dir - northOffsetDeg) % 360 + 360) % 360;

  // 24 ticks every 15°.
  const ticks = [];
  for (let i = 0; i < 24; i++) {
    const b = screenBearing(i * 15);
    const cardinal = i % 6 === 0;
    const inter = i % 3 === 0;
    const len = cardinal ? 0.7 : inter ? 0.5 : 0.28;
    const a = pt(b, radius);
    const c = pt(b, radius - len);
    ticks.push(
      <line key={i} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={tickColor} strokeWidth={cardinal ? 0.11 : 0.06} strokeLinecap="round" />,
    );
  }

  // North arrow — the iconic compass marker, just outside the ring at N.
  const nTip = pt(screenBearing(0), radius + 0.95);
  const nL = pt(screenBearing(0) - 4, radius + 0.15);
  const nR = pt(screenBearing(0) + 4, radius + 0.15);

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* double bezel */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={ring} strokeWidth={0.09} />
      <circle cx={cx} cy={cy} r={radius - 0.7} fill="none" stroke={ring} strokeOpacity={0.5} strokeWidth={0.04} />
      {ticks}

      {/* north arrow */}
      <polygon points={`${nTip.x},${nTip.y} ${nL.x},${nL.y} ${nR.x},${nR.y}`} fill="#D4AF37" opacity={locked ? 1 : 0.9} />

      {/* letters */}
      {DIR8_CW.map((dir) => {
        const b = screenBearing(DIR_BEARING[dir]);
        const p = pt(b, radius + (dir.length === 1 ? 1.9 : 1.5));
        const cardinal = dir.length === 1;
        const isN = dir === "N";
        return (
          <text
            key={dir}
            x={p.x}
            y={p.y}
            dy={0.34}
            fontSize={cardinal ? 1.0 : 0.6}
            fontWeight={cardinal ? 800 : 600}
            textAnchor="middle"
            fill={isN ? "#ef4444" : cardinal ? "#D4AF37" : "rgba(212,175,55,0.55)"}
            style={{ userSelect: "none" }}
          >
            {dir}
          </text>
        );
      })}
    </g>
  );
}
