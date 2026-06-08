"use client";

import { motion } from "framer-motion";

const SIGNS = [
  "ARIES","TAURUS","GEMINI","CANCER",
  "LEO","VIRGO","LIBRA","SCORPIO",
  "SAGITTARIUS","CAPRICORN","AQUARIUS","PISCES",
];
const SYMBOLS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 138;
const TEXT_R = 120;
const MANDALA_R = 72;

function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function MandalaGeometry() {
  const pts12 = Array.from({ length: 12 }, (_, i) => polarToXY(i * 30, MANDALA_R));
  const pts12inner = Array.from({ length: 12 }, (_, i) => polarToXY(i * 30 + 15, MANDALA_R * 0.5));
  const starD = pts12.flatMap((p, i) => [p, pts12inner[i]])
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ") + " Z";

  return (
    <g opacity={0.2}>
      <path d={starD} fill="none" stroke="var(--gold)" strokeWidth="0.7" />
      {pts12.map((p, i) => (
        <line
          key={i}
          x1={p.x} y1={p.y}
          x2={pts12[(i + 6) % 12].x} y2={pts12[(i + 6) % 12].y}
          stroke="var(--gold)" strokeWidth="0.5"
        />
      ))}
      <circle cx={CX} cy={CY} r={MANDALA_R * 0.28} fill="none" stroke="var(--gold)" strokeWidth="0.5" />
      <circle cx={CX} cy={CY} r={MANDALA_R * 0.52} fill="none" stroke="var(--gold)" strokeWidth="0.4" />
    </g>
  );
}

export default function ZodiacWheel() {
  const textCircumference = 2 * Math.PI * TEXT_R;

  return (
    <div
      className="relative flex items-center justify-center mx-auto"
      style={{ width: SIZE, height: SIZE }}
    >
      {/* Layer 3: breathing glow aura */}
      <motion.div
        animate={{ opacity: [0.45, 0.85, 0.45] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="rounded-full"
          style={{
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(212,175,55,0.38) 0%, transparent 70%)",
            filter: "blur(28px)",
          }}
        />
      </motion.div>

      {/* Layer 2: inner mandala — counter-clockwise 120s */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 pointer-events-none"
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <MandalaGeometry />
        </svg>
      </motion.div>

      {/* Layer 1: outer zodiac ring — clockwise 60s */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 pointer-events-none"
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            {/* Full-circle path for textPath */}
            <path
              id="zodiac-ring-path"
              d={`M ${CX},${CY - TEXT_R}
                  A ${TEXT_R},${TEXT_R} 0 0 1 ${CX + TEXT_R},${CY}
                  A ${TEXT_R},${TEXT_R} 0 0 1 ${CX},${CY + TEXT_R}
                  A ${TEXT_R},${TEXT_R} 0 0 1 ${CX - TEXT_R},${CY}
                  A ${TEXT_R},${TEXT_R} 0 0 1 ${CX},${CY - TEXT_R}`}
            />
          </defs>

          {/* Outer decorative rings */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="rgba(212,175,55,0.28)" strokeWidth="1" />
          <circle cx={CX} cy={CY} r={OUTER_R - 9} fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth="0.5" />

          {/* Tick marks every 30° */}
          {Array.from({ length: 12 }, (_, i) => {
            const inner = polarToXY(i * 30, OUTER_R - 9);
            const outer = polarToXY(i * 30, OUTER_R);
            return (
              <line
                key={i}
                x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
                x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
                stroke="rgba(212,175,55,0.55)" strokeWidth="1.2"
              />
            );
          })}

          {/* Sign names along the arc */}
          <text
            fontSize="6.5"
            fill="rgba(212,175,55,0.72)"
            letterSpacing="1.8"
            fontFamily="Cinzel, serif"
          >
            <textPath href="#zodiac-ring-path" textLength={textCircumference} lengthAdjust="spacing">
              {SIGNS.map((s) => `${s} ▾ `).join("")}
            </textPath>
          </text>
        </svg>
      </motion.div>

      {/* Centre: Om + symbol ring (static, reveal on mount) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Zodiac symbol ring (static inner ring) */}
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute">
          {SYMBOLS.map((sym, i) => {
            const { x, y } = polarToXY(i * 30, 92);
            return (
              <text
                key={sym}
                x={x.toFixed(2)} y={y.toFixed(2)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fill="rgba(212,175,55,0.45)"
              >
                {sym}
              </text>
            );
          })}
          <circle cx={CX} cy={CY} r={80} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" />
        </svg>

        {/* Om symbol */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="glow-om select-none z-10"
          style={{ fontSize: 62, color: "var(--gold)", lineHeight: 1 }}
        >
          🕉
        </motion.div>
      </div>
    </div>
  );
}
