"use client";

import React from "react";
import { zodiac } from "@/data/zodiac";
import { horoscopes } from "@/data/horoscopes";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Aries, Taurus, Gemini, Cancer, Leo, Virgo,
  Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces,
} from "@/components/icons/ZodiacIcons";

type ZodiacFC = React.FC<{ size?: number; color?: string; className?: string }>;

const ZODIAC_ICON_MAP: Record<string, ZodiacFC> = {
  Aries, Taurus, Gemini, Cancer, Leo, Virgo,
  Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces,
};

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
            color: i < STARS_FILLED ? "var(--gold)" : "rgba(212,175,55,0.2)",
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
        const ZodiacIcon = ZODIAC_ICON_MAP[sign.name];

        return (
          <motion.div
            key={sign.name}
            whileTap={{ scale: 1.04 }}
            onClick={() => setActive(isActive ? null : sign.name)}
            className="min-w-[168px] max-w-[168px] rounded-2xl p-4 cursor-pointer border flex-shrink-0 transition-all"
            style={{
              background: isActive
                ? "linear-gradient(135deg, rgba(212,175,55,0.11), rgba(212,175,55,0.04))"
                : "rgba(14,15,21,0.7)",
              borderColor: isActive
                ? "rgba(212,175,55,0.7)"
                : "rgba(212,175,55,0.1)",
              boxShadow: isActive
                ? "0 0 22px rgba(212,175,55,0.18)"
                : "none",
              transition: "box-shadow 0.3s, border-color 0.3s, background 0.3s",
            }}
          >
            {/* Gold SVG zodiac icon */}
            <div className="h-9 flex items-center mb-2">
              {ZodiacIcon && <ZodiacIcon size={30} color="#D4AF37" />}
            </div>

            <p className="font-display font-semibold text-xs" style={{ color: "var(--gold)", letterSpacing: "0.04em" }}>
              {sign.name}
            </p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {sign.dates}
            </p>
            <StarRating />
            <p
              className="text-[11px] mt-2 leading-relaxed line-clamp-2"
              style={{ color: "var(--text-muted)", opacity: 0.82 }}
            >
              {horoscopes[sign.name]}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
