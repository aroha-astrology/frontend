"use client";

import { motion } from "framer-motion";
import GoldButton from "./GoldButton";
import Link from "next/link";

export default function Hero() {
  return (
    <div className="hero-bg px-5 pt-12 pb-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-xs tracking-[0.3em] text-[var(--text-muted)] uppercase mb-2">
          Vedic Astrology
        </p>
        <h1 className="text-5xl font-bold text-gold font-display leading-tight">
          AROHA
        </h1>
        <p className="mt-3 text-base text-[var(--text-muted)] max-w-xs mx-auto">
          Discover your cosmic blueprint through the ancient wisdom of Jyotish
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-6 flex gap-3 justify-center"
      >
        <Link href="/ai-chat">
          <GoldButton>✨ Ask Astrologer</GoldButton>
        </Link>
        <Link href="/kundli">
          <GoldButton variant="outline">📜 Kundli</GoldButton>
        </Link>
      </motion.div>
    </div>
  );
}
