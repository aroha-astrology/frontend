"use client";

import { motion } from "framer-motion";
import { OmSymbol } from "@/components/icons/OmSymbol";

const ZODIAC_SYMBOLS = [
  "♈", "♉", "♊", "♋", "♌", "♍",
  "♎", "♏", "♐", "♑", "♒", "♓",
];

const MANDALA_DOTS = 12;

export default function CosmicWheel() {
  return (
    <section className="py-10 px-4 flex flex-col items-center">
      {/* Section heading */}
      <div className="flex items-center justify-between w-full mb-8 px-1">
        <div>
          <p
            className="font-display uppercase mb-1"
            style={{ fontSize: "0.6rem", letterSpacing: "0.5em", color: "rgba(212,175,55,0.5)" }}
          >
            Sacred Geometry
          </p>
          <h2 className="font-display text-base font-semibold text-white tracking-wide">
            Your Cosmic Blueprint
          </h2>
        </div>
        <span className="text-xs" style={{ color: "rgba(212,175,55,0.4)" }}>✦</span>
      </div>

      {/* Wheel container */}
      <div className="relative w-[280px] h-[280px]">

        {/* Layer 6: Outer glow aura — breathing radial gradient */}
        <motion.div
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 120,
            height: 120,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(212,175,55,0.25), transparent 70%)",
          }}
        />

        {/* Layer 1: Outer zodiac ring — rotates clockwise 60s */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute rounded-full"
          style={{
            width: 280,
            height: 280,
            top: 0,
            left: 0,
            border: "1px solid rgba(212,175,55,0.28)",
          }}
        />

        {/* Layer 2: 12 zodiac symbols positioned around 120px radius (static) */}
        {ZODIAC_SYMBOLS.map((symbol, i) => {
          const angle = (i * 360) / 12 * (Math.PI / 180);
          const radius = 120;
          const cx = 140;
          const cy = 140;
          const symbolSize = 26;
          const x = cx + radius * Math.cos(angle) - symbolSize / 2;
          const y = cy + radius * Math.sin(angle) - symbolSize / 2;

          return (
            <div
              key={symbol}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                width: symbolSize,
                height: symbolSize,
                left: x,
                top: y,
                border: "1px solid rgba(212,175,55,0.3)",
                background: "rgba(14,15,21,0.9)",
                fontSize: "0.65rem",
                color: "var(--gold)",
                backdropFilter: "blur(2px)",
              }}
            >
              {symbol}
            </div>
          );
        })}

        {/* Layer 3: Mandala ring — counter-clockwise 120s */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="absolute rounded-full"
          style={{
            width: 180,
            height: 180,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(212,175,55,0.14)",
          }}
        >
          {Array.from({ length: MANDALA_DOTS }, (_, i) => {
            const angle = (i * 360) / MANDALA_DOTS * (Math.PI / 180);
            const r = 90;
            const x = 90 + r * Math.cos(angle) - 3;
            const y = 90 + r * Math.sin(angle) - 3;
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  left: x,
                  top: y,
                  background: "rgba(212,175,55,0.45)",
                }}
              />
            );
          })}
        </motion.div>

        {/* Layer 4: Gold energy ring — breathing scale pulse */}
        <motion.div
          animate={{ scale: [1, 1.025, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full"
          style={{
            width: 140,
            height: 140,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1.5px solid rgba(212,175,55,0.38)",
          }}
        />

        {/* Layer 5: Center Om symbol SVG — no emoji */}
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute flex items-center justify-center"
          style={{
            width: 90,
            height: 90,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            filter: "drop-shadow(0 0 10px rgba(212,175,55,0.45)) drop-shadow(0 0 24px rgba(212,175,55,0.2))",
          }}
        >
          <OmSymbol size={54} color="#D4AF37" />
        </motion.div>

      </div>
    </section>
  );
}
