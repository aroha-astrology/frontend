"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { zodiac } from "@/data/zodiac";
import { horoscopes } from "@/data/horoscopes";

const signData: Record<string, { luckyNumber: number; luckyColor: string; career: number; love: number; health: number }> = {
  Aries:       { luckyNumber: 7,  luckyColor: "#FF6B6B", career: 85, love: 70, health: 90 },
  Taurus:      { luckyNumber: 4,  luckyColor: "#4ECDC4", career: 75, love: 90, health: 80 },
  Gemini:      { luckyNumber: 3,  luckyColor: "#FFE66D", career: 90, love: 75, health: 70 },
  Cancer:      { luckyNumber: 2,  luckyColor: "#A8E6CF", career: 70, love: 95, health: 85 },
  Leo:         { luckyNumber: 1,  luckyColor: "#FFD700", career: 95, love: 85, health: 80 },
  Virgo:       { luckyNumber: 6,  luckyColor: "#95E1D3", career: 80, love: 70, health: 90 },
  Libra:       { luckyNumber: 9,  luckyColor: "#F8B500", career: 75, love: 90, health: 75 },
  Scorpio:     { luckyNumber: 8,  luckyColor: "#C0392B", career: 85, love: 80, health: 70 },
  Sagittarius: { luckyNumber: 3,  luckyColor: "#8E44AD", career: 90, love: 75, health: 85 },
  Capricorn:   { luckyNumber: 5,  luckyColor: "#2C3E50", career: 80, love: 70, health: 80 },
  Aquarius:    { luckyNumber: 11, luckyColor: "#00B4D8", career: 95, love: 80, health: 85 },
  Pisces:      { luckyNumber: 7,  luckyColor: "#48CAE4", career: 70, love: 95, health: 75 },
};

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{label}</span>
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{value}%</span>
      </div>
      <div
        className="rounded-full overflow-hidden"
        style={{ height: "4px", background: "var(--border)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--gold), #f5e27a)",
            width: `${value}%`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function HoroscopePage() {
  const [activeSign, setActiveSign] = useState<string | null>(null);

  return (
    <motion.main
      className="min-h-screen pb-28"
      style={{ background: "var(--background)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AppHeader />

      <div className="pt-14 px-4">
        {/* Page title */}
        <div className="py-6 text-center">
          <h1
            className="font-display text-2xl font-semibold text-gold mb-1"
          >
            Daily Horoscope
          </h1>
          <p
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {today}
          </p>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-2 gap-3">
          {zodiac.map((sign) => {
            const isOpen = activeSign === sign.name;
            const data = signData[sign.name];
            const horoscope = horoscopes[sign.name] ?? "";
            const firstSentence = horoscope.split(". ")[0] + ".";

            return (
              <motion.div
                key={sign.name}
                className="rounded-2xl cursor-pointer overflow-hidden"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
                onClick={() => setActiveSign(isOpen ? null : sign.name)}
                layout
                transition={{ duration: 0.3 }}
              >
                <div className="p-4">
                  {/* Symbol */}
                  <div className="text-2xl text-gold mb-1">{sign.symbol}</div>

                  {/* Sign name */}
                  <p
                    className="font-semibold text-sm text-gold mb-0.5"
                  >
                    {sign.name}
                  </p>

                  {/* Date range */}
                  <p
                    className="text-[10px] mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {sign.dates}
                  </p>

                  {/* Preview text */}
                  <p
                    className="text-[11px] line-clamp-2 mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {firstSentence}
                  </p>

                  {/* Star rating */}
                  <div className="text-[11px]" style={{ color: "var(--gold)" }}>
                    ★★★★☆
                  </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="expanded"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        className="px-4 pb-4"
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        {/* Full horoscope */}
                        <p
                          className="text-[11px] leading-relaxed mt-3 mb-3"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {horoscope}
                        </p>

                        {/* Lucky Number badge */}
                        <div className="mb-3">
                          <span
                            className="inline-block rounded-full px-3 py-1 text-[10px] font-semibold"
                            style={{
                              background: "rgba(212,175,55,0.15)",
                              color: "var(--gold)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            Lucky Number: {data.luckyNumber}
                          </span>
                        </div>

                        {/* Lucky Color */}
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="rounded-full flex-shrink-0"
                            style={{
                              width: "14px",
                              height: "14px",
                              background: data.luckyColor,
                            }}
                          />
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Lucky Color: {data.luckyColor}
                          </span>
                        </div>

                        {/* Score bars */}
                        <ScoreBar label="Career" value={data.career} />
                        <ScoreBar label="Love" value={data.love} />
                        <ScoreBar label="Health" value={data.health} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.main>
  );
}
