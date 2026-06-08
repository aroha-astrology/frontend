"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import ZodiacWheel from "./ZodiacWheel";

const btnVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 1.0 + i * 0.15, duration: 0.4 },
  }),
};

export default function Hero() {
  return (
    <div className="hero-bg flex flex-col items-center pt-6 pb-4 px-5">

      {/* Floating moon */}
      <motion.div
        animate={{ y: [-15, 15, -15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="text-3xl mb-2 select-none"
        style={{ filter: "drop-shadow(0 0 10px rgba(212,175,55,0.5))" }}
      >
        🌙
      </motion.div>

      {/* 3-layer Zodiac Wheel (starts rotating immediately, no delay) */}
      <ZodiacWheel />

      {/* AROHO heading — shimmer gold */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="shimmer-text font-display text-5xl font-bold tracking-widest mt-4"
      >
        AROHO
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.75 }}
        className="text-xs tracking-[0.25em] text-[var(--text-muted)] uppercase mt-2 text-center"
      >
        Divine Guidance · AI-Powered Insights
      </motion.p>

      {/* CTA buttons */}
      <div className="flex gap-3 mt-6">
        {[
          { label: "Generate Kundli", href: "/kundli" },
          { label: "Talk To AI", href: "/ai-chat" },
        ].map(({ label, href }, i) => (
          <motion.div
            key={label}
            custom={i}
            variants={btnVariants}
            initial="hidden"
            animate="visible"
          >
            <Link href={href}>
              <button
                className={`shimmer-btn h-12 px-5 rounded-full font-semibold text-sm transition-opacity active:opacity-75 ${
                  i === 0
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black"
                    : "border border-[var(--border)] text-gold bg-transparent"
                }`}
              >
                {label}
              </button>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
