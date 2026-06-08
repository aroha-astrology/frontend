"use client";

import { zodiac } from "@/data/zodiac";
import { horoscopes } from "@/data/horoscopes";
import { motion } from "framer-motion";
import { useState } from "react";

const STARS_TOTAL = 5;
const STARS_FILLED = 4;

function StarRating() {
  return (
    <div className="flex gap-0.5 mt-1.5">
      {Array.from({ length: STARS_TOTAL }, (_, i) => (
        <span
          key={i}
          className="text-[10px] leading-none"
          style={{
            color: i < STARS_FILLED ? "var(--gold)" : "rgba(212,175,55,0.25)",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function HoroscopeSlider() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4">
      {zodiac.map((sign) => {
        const isActive = sign.name === active;
        return (
          <motion.div
            key={sign.name}
            whileTap={{ scale: 1.04 }}
            onClick={() => setActive(isActive ? null : sign.name)}
            className="min-w-[160px] max-w-[160px] rounded-2xl p-3 cursor-pointer border flex-shrink-0 transition-all"
            style={{
              background: isActive
                ? "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))"
                : "var(--surface)",
              borderColor: isActive ? "var(--gold)" : "var(--border)",
              boxShadow: isActive
                ? "0 0 20px rgba(212,175,55,0.2)"
                : "none",
              transition: "box-shadow 0.3s, border-color 0.3s, background 0.3s",
            }}
          >
            <div className="text-2xl mb-1 leading-none">{sign.symbol}</div>
            <p className="font-semibold text-xs text-gold">{sign.name}</p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {sign.dates}
            </p>
            <StarRating />
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
