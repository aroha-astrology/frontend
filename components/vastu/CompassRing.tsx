"use client";

import { DIR8_CW } from "@/lib/vastu/data";

/** Bearing (deg clockwise from North) of each of the 8 directions. */
const DIR_BEARING: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

/**
 * Rotating compass ring around the plot. A direction at real bearing θ appears
 * at screen bearing (θ − northOffsetDeg), so locking to a real-world heading
 * turns the whole ring while the rooms stay put — matching the on-canvas rating.
 */
export default function CompassRing({
  cx,
  cy,
  radius,
  northOffsetDeg,
  locked,
}: {
  cx: number;
  cy: number;
  radius: number;
  northOffsetDeg: number;
  locked: boolean;
}) {
  const ringColor = locked ? "#D4AF37" : "rgba(212,175,55,0.35)";
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={ringColor} strokeWidth={0.08} />
      {DIR8_CW.map((dir) => {
        const screenBearing = ((DIR_BEARING[dir] - northOffsetDeg) % 360 + 360) % 360;
        const rad = (screenBearing * Math.PI) / 180;
        const x = cx + radius * Math.sin(rad);
        const y = cy - radius * Math.cos(rad);
        const cardinal = dir.length === 1;
        const isNorth = dir === "N";
        return (
          <g key={dir}>
            {isNorth && (
              <circle cx={x} cy={y} r={0.62} fill="#D4AF37" opacity={locked ? 1 : 0.85} />
            )}
            <text
              x={x}
              y={y}
              dy={0.32}
              fontSize={cardinal ? 0.95 : 0.62}
              fontWeight={cardinal ? 800 : 600}
              textAnchor="middle"
              fill={isNorth ? "#1a1206" : cardinal ? "#D4AF37" : "rgba(212,175,55,0.6)"}
              style={{ userSelect: "none" }}
            >
              {dir}
            </text>
          </g>
        );
      })}
    </g>
  );
}
