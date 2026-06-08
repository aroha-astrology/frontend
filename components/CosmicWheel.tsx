"use client";

// Multi-layer rotating zodiac wheel section
// Place AFTER horoscope on home page
// Section heading: "Your Cosmic Blueprint"

import { motion } from "framer-motion";

const ZODIAC_SYMBOLS = [
  "♈", "♉", "♊", "♋", "♌", "♍",
  "♎", "♏", "♐", "♑", "♒", "♓",
];

const MANDALA_DOTS = 12;

export default function CosmicWheel() {
  return (
    <section className="py-8 px-4 flex flex-col items-center">
      {/* Section heading */}
      <div className="flex items-center justify-between w-full mb-6">
        <h2 className="font-display text-base font-semibold text-white tracking-wide">
          Your Cosmic Blueprint
        </h2>
        <span className="text-xs text-gold">✦</span>
      </div>

      {/* Wheel container */}
      <div className="relative w-[280px] h-[280px]">

        {/* Layer 6: Outer glow aura — behind everything, centered */}
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 100,
            height: 100,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(212,175,55,0.3), transparent)",
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
            border: "1px solid rgba(212,175,55,0.3)",
          }}
        />

        {/* Layer 2: 12 zodiac symbols positioned around 120px radius (static) */}
        {ZODIAC_SYMBOLS.map((symbol, i) => {
          const angle = (i * 360) / 12 * (Math.PI / 180);
          const radius = 120;
          const cx = 140;
          const cy = 140;
          const symbolSize = 28; // w-7 h-7
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
                border: "1px solid rgba(212,175,55,0.35)",
                background: "rgba(17,19,27,0.85)",
                fontSize: "0.7rem",
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
            border: "1px solid rgba(212,175,55,0.15)",
          }}
        >
          {/* 12 small dots around the mandala ring */}
          {Array.from({ length: MANDALA_DOTS }, (_, i) => {
            const angle = (i * 360) / MANDALA_DOTS * (Math.PI / 180);
            const r = 90; // radius = half of 180px
            const x = 90 + r * Math.cos(angle) - 3;
            const y = 90 + r * Math.sin(angle) - 3;
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  left: x,
                  top: y,
                  background: "rgba(212,175,55,0.5)",
                }}
              />
            );
          })}
        </motion.div>

        {/* Layer 4: Gold energy ring — breathing scale pulse */}
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full"
          style={{
            width: 140,
            height: 140,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "2px solid rgba(212,175,55,0.4)",
          }}
        />

        {/* Layer 5: Center Om symbol + breathing glow */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute flex items-center justify-center"
          style={{
            width: 80,
            height: 80,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="text-4xl select-none"
            style={{
              color: "var(--gold)",
              textShadow:
                "0 0 20px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.3)",
              fontFamily: "serif",
            }}
          >
            ॐ
          </span>
        </motion.div>

      </div>
    </section>
  );
}
