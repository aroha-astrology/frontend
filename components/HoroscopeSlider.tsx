"use client";

import { zodiac } from "@/data/zodiac";
import { horoscopes } from "@/data/horoscopes";
import { motion } from "framer-motion";
import { useState } from "react";

export default function HoroscopeSlider() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4">
      {zodiac.map((sign) => {
        const isActive = sign.name === active;
        return (
          <motion.div
            key={sign.name}
            whileTap={{ scale: 1.05 }}
            onClick={() => setActive(isActive ? null : sign.name)}
            className="min-w-[155px] rounded-2xl p-3 cursor-pointer border transition-all flex-shrink-0"
            style={{
              background: isActive
                ? "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))"
                : "var(--surface)",
              borderColor: isActive ? "var(--gold)" : "var(--border)",
              boxShadow: isActive ? "0 0 16px rgba(212,175,55,0.25)" : "none",
              transition: "box-shadow 0.3s, border-color 0.3s",
            }}
          >
            <div className="text-xl mb-1">{sign.symbol}</div>
            <p className="font-semibold text-xs text-gold">{sign.name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sign.dates}</p>
            <p
              className="text-[11px] mt-1.5 leading-relaxed line-clamp-2"
              style={{ color: "var(--text-muted)", opacity: 0.85 }}
            >
              {horoscopes[sign.name]}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
