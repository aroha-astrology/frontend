"use client";

import { zodiac } from "@/data/zodiac";
import { motion } from "framer-motion";
import BrandLogo from "@/components/ui/BrandLogo";

export default function ZodiacWheel() {
  const radius = 110;
  const cx = 140;
  const cy = 140;

  return (
    <div className="flex justify-center my-4">
      <div className="relative w-[280px] h-[280px]">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-yellow-500/20" />
        <div className="absolute inset-4 rounded-full border border-yellow-500/10" />

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center flex flex-col items-center">
            <BrandLogo size={60} className="drop-shadow-[0_0_8px_rgba(223,181,100,0.4)]" />
          </div>
        </div>

        {/* Zodiac symbols */}
        {zodiac.map((sign, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = cx + radius * Math.cos(angle) - 14;
          const y = cy + radius * Math.sin(angle) - 14;
          return (
            <motion.div
              key={sign.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              title={sign.name}
              className="absolute w-7 h-7 flex items-center justify-center text-base rounded-full bg-[var(--surface)] border border-yellow-500/20 hover:border-yellow-500/60 transition-colors cursor-default"
              style={{ left: x, top: y }}
            >
              {sign.symbol}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
