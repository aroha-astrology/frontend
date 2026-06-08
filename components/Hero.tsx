"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ScrollText, MessageCircle } from "lucide-react";
import { MoonGlyph } from "@/components/icons/MoonGlyph";
import { LotusIcon } from "@/components/icons/LotusIcon";
import { MandalaRing } from "@/components/icons/MandalaRing";
import { MOON_FLOAT } from "@/lib/animations";

export default function Hero() {
  return (
    <section className="relative hero-bg overflow-hidden pt-16 pb-8 px-5 min-h-[520px] flex flex-col items-center">

      {/* Moon — large, positioned top-left, partially off-screen */}
      <motion.div
        {...MOON_FLOAT}
        className="absolute -left-16 top-4 pointer-events-none"
        style={{ opacity: 0.85 }}
      >
        <MoonGlyph size={220} color="#D4AF37" />
      </motion.div>

      {/* Lotus decoration — top-right */}
      <div className="absolute -right-8 top-8 pointer-events-none" style={{ opacity: 0.12 }}>
        <LotusIcon size={160} color="#D4AF37" />
      </div>

      {/* Mandala ring — background center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.04 }}>
        <MandalaRing size={400} color="#D4AF37" />
      </div>

      {/* Content — centered, above decorations */}
      <div className="relative z-10 flex flex-col items-center text-center mt-16">

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-2"
        >
          <p className="font-display text-[10px] tracking-[0.4em] text-[var(--text-muted)] uppercase">
            ✦ Aroho ✦
          </p>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-1"
        >
          <h1 className="font-display text-4xl font-bold text-white tracking-wide leading-tight">
            AI Powered
          </h1>
          <h1
            className="font-editorial text-5xl font-semibold leading-tight"
            style={{ color: "var(--gold)", fontStyle: "italic" }}
          >
            Vedic Guidance
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xs leading-relaxed text-center mt-3 max-w-[260px]"
          style={{ color: "var(--text-muted)" }}
        >
          Ancient Wisdom. Modern Intelligence.{"\n"}Guidance that aligns your destiny.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="flex gap-3 mt-6"
        >
          <Link href="/kundli">
            <button
              className="shimmer-btn flex items-center gap-2 h-12 px-5 rounded-full text-sm font-semibold border transition-all active:scale-95"
              style={{
                borderColor: "var(--gold)",
                color: "var(--gold)",
                background: "rgba(212,175,55,0.08)",
              }}
            >
              <ScrollText size={15} />
              Generate Kundli
            </button>
          </Link>
          <Link href="/ai-chat">
            <button
              className="shimmer-btn flex items-center gap-2 h-12 px-5 rounded-full text-sm font-semibold border transition-all active:scale-95"
              style={{
                borderColor: "rgba(212,175,55,0.4)",
                color: "var(--foreground)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <MessageCircle size={15} />
              Talk To AI
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
