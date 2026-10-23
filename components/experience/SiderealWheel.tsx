"use client";

import { useTranslation } from "react-i18next";
import { ascendantLongitude, polar, signStartAngle, wheelPlanets } from "@/lib/wheel";

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☾", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

const SIZE = 320;
const C = SIZE / 2;
const R_OUTER = 150;
const R_SIGNS = 130;
const R_INNER = 112;
const R_PLANETS = 92;

/**
 * The 360° sidereal wheel (switch experience.wheelChart): twelve whole-sign sectors with the
 * ascendant fixed at the left, signs running counter-clockwise, and every planet at its own degree.
 * Same chart as the North and South styles, drawn the way a Western chart is.
 */
export default function SiderealWheel({
  planets,
  ascendant,
}: {
  planets: readonly Record<string, any>[];
  ascendant: Record<string, any> | null | undefined;
}) {
  const { t } = useTranslation();
  const asc = ascendantLongitude(ascendant);
  if (asc == null) return null;

  const placed = wheelPlanets(planets, asc);
  const ascSignIndex = Math.floor(asc / 30);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={t("cosmicChart.wheel.label")}
      data-testid="sidereal-wheel"
      className="mx-auto h-auto w-full max-w-[380px] text-gold"
    >
      <circle cx={C} cy={C} r={R_OUTER} fill="none" stroke="currentColor" strokeOpacity={0.5} />
      <circle cx={C} cy={C} r={R_INNER} fill="none" stroke="currentColor" strokeOpacity={0.35} />
      {Array.from({ length: 12 }, (_, i) => {
        const start = signStartAngle(i, asc);
        const a = polar(C, C, R_INNER, start);
        const b = polar(C, C, R_OUTER, start);
        // A sign covers start to start + 30 degrees, so its middle is 15° further round.
        const mid = polar(C, C, R_SIGNS, start + 15);
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeOpacity={0.35} />
            <text
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={15}
              fill="currentColor"
              fillOpacity={i === ascSignIndex ? 1 : 0.7}
              data-testid={`wheel-sign-${i}`}
            >
              {SIGN_GLYPHS[i]}
            </text>
          </g>
        );
      })}

      {/* Ascendant marker on the left */}
      <line x1={C - R_OUTER - 6} y1={C} x2={C - R_INNER} y2={C} stroke="currentColor" strokeWidth={2} />
      <text x={C - R_OUTER + 2} y={C - 8} fontSize={10} fill="currentColor" textAnchor="start">
        {t("cosmicChart.wheel.asc")}
      </text>

      {placed.map((p) => {
        const tickFrom = polar(C, C, R_INNER, p.trueAngle);
        const tickTo = polar(C, C, R_INNER - 7, p.trueAngle);
        const g = polar(C, C, R_PLANETS, p.angle);
        return (
          <g key={p.planet} data-testid={`wheel-planet-${p.planet}`}>
            <line x1={tickFrom.x} y1={tickFrom.y} x2={tickTo.x} y2={tickTo.y} stroke="currentColor" strokeWidth={1.5} />
            <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="central" fontSize={17} fill="currentColor">
              {PLANET_GLYPHS[p.planet] ?? p.planet.slice(0, 2)}
              {p.retrograde ? <tspan fontSize={9} dy={-6}>R</tspan> : null}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
