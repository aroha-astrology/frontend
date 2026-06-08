"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ScrollText, MessageCircle } from "lucide-react";
import { MoonGlyph } from "@/components/icons/MoonGlyph";
import { LotusIcon } from "@/components/icons/LotusIcon";
import { MandalaRing } from "@/components/icons/MandalaRing";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 pb-14 px-6 min-h-[610px] flex flex-col items-center">

      {/* Moon — 310px, dramatically bleeds off-screen top-left */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-24 -top-6 pointer-events-none"
        style={{ opacity: 0.9 }}
      >
        <MoonGlyph size={310} color="#D4AF37" />
      </motion.div>

      {/* Lotus — top right, bleeds off-screen */}
      <motion.div
        animate={{ rotate: [0, 3, 0, -3, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-10 top-4 pointer-events-none"
        style={{ opacity: 0.11 }}
      >
        <LotusIcon size={230} color="#D4AF37" />
      </motion.div>

      {/* Mandala ring — very faint full background */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0.025 }}
      >
        <MandalaRing size={500} color="#D4AF37" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center mt-28">

        {/* Editorial headline — large and dominant */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.2 }}
        >
          <h1
            className="font-display font-bold text-white tracking-widest leading-tight"
            style={{ fontSize: "2.1rem", letterSpacing: "0.14em" }}
          >
            AI POWERED
          </h1>
          <h1
            className="font-editorial"
            style={{
              color: "var(--gold)",
              fontStyle: "italic",
              fontSize: "4.6rem",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}
          >
            Vedic Guidance
          </h1>
        </motion.div>

        {/* Gold ornament divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="flex items-center gap-3 mt-6 mb-6"
        >
          <span
            style={{
              display: "block",
              height: 1,
              width: 44,
              background: "rgba(212,175,55,0.3)",
            }}
          />
          <span
            className="font-display uppercase"
            style={{
              fontSize: "0.55rem",
              letterSpacing: "0.55em",
              color: "rgba(212,175,55,0.55)",
            }}
          >
            Aroho
          </span>
          <span
            style={{
              display: "block",
              height: 1,
              width: 44,
              background: "rgba(212,175,55,0.3)",
            }}
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="text-xs text-center max-w-[230px]"
          style={{ color: "var(--text-muted)", lineHeight: 1.85 }}
        >
          Ancient Wisdom. Modern Intelligence.
          <br />
          Guidance that aligns your destiny.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex gap-3 mt-9"
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
