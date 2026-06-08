"use client";

import { zodiac } from "@/data/zodiac";
import { horoscopes } from "@/data/horoscopes";
import { motion } from "framer-motion";
import { useState } from "react";

export default function HoroscopeSlider() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {zodiac.map((sign) => (
          <motion.div
            key={sign.name}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelected(sign.name === selected ? null : sign.name)}
            className="min-w-[200px] rounded-3xl p-4 cursor-pointer border transition-all"
            style={{
              background: "var(--surface)",
              borderColor: sign.name === selected ? "var(--gold)" : "var(--border)",
            }}
          >
            <div className="text-2xl mb-1">{sign.symbol}</div>
            <h3 className="text-gold font-semibold">{sign.name}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{sign.dates}</p>
            {sign.name === selected && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 text-sm text-foreground/80 leading-relaxed"
              >
                {horoscopes[sign.name]}
              </motion.p>
            )}
          </motion.div>
        ))}
      </div>
      {!selected && (
        <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
          Tap a sign to reveal today's reading
        </p>
      )}
    </div>
  );
}
