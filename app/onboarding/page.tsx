"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const slides = [
  {
    emoji: "🔮",
    title: "AI Astrologer",
    desc: "Ask Yogi Baba anything about your career, marriage, wealth, health, or lucky gemstone. Powered by Vedic wisdom.",
  },
  {
    emoji: "📜",
    title: "Generate Kundli",
    desc: "Enter your birth details and receive an instant Vedic birth chart with planetary positions, doshas, and life scores.",
  },
  {
    emoji: "🌟",
    title: "Daily Horoscopes",
    desc: "Receive personalised cosmic guidance every day for all 12 zodiac signs, rooted in Jyotish traditions.",
  },
  {
    emoji: "❤️",
    title: "Kundli Matching",
    desc: "Check compatibility between two birth charts using the traditional 36-guna Ashtakoota matching system.",
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const isLast = current === slides.length - 1;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-12">
        {slides.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === current ? 24 : 8,
              background: i === current ? "var(--gold)" : "var(--border)",
            }}
          />
        ))}
      </div>

      {/* Slide */}
      <div className="flex-1 flex items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="text-center max-w-sm"
          >
            <div className="text-7xl mb-6">{slides[current].emoji}</div>
            <h2 className="text-3xl font-bold text-gold font-display mb-4">
              {slides[current].title}
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {slides[current].desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-8 pb-20 flex gap-3">
        {!isLast && (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="flex-1 h-14 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold"
          >
            Next →
          </button>
        )}
        {isLast && (
          <Link href="/" className="flex-1">
            <button className="w-full h-14 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold">
              Get Started 🚀
            </button>
          </Link>
        )}
        {current > 0 && (
          <button
            onClick={() => setCurrent((c) => c - 1)}
            className="h-14 px-6 rounded-full border text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            Back
          </button>
        )}
      </div>
    </main>
  );
}
