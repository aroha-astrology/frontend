"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mx-4 mt-8 mb-4 rounded-3xl overflow-hidden relative text-center px-6 py-10"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.18) 0%, rgba(5,6,10,0.0) 70%), var(--surface)",
        border: "1px solid rgba(212,175,55,0.3)",
      }}
    >
      {/* Decorative faint Om */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ fontSize: 220, opacity: 0.04, color: "var(--gold)", overflow: "hidden" }}
      >
        🕉
      </div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="text-xs tracking-widest uppercase mb-2 relative z-10"
        style={{ color: "var(--text-muted)" }}
      >
        Begin your cosmic journey
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.25, duration: 0.45 }}
        className="text-2xl font-bold mb-2 relative z-10 shimmer-text"
        style={{ fontFamily: "Cinzel, serif" }}
      >
        Unlock Your Destiny
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.35, duration: 0.45 }}
        className="text-sm leading-relaxed mb-6 relative z-10"
        style={{ color: "var(--text-muted)" }}
      >
        Discover what the stars have written for you — your birth chart, love compatibility, and daily guidance in one place.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.45, duration: 0.4, type: "spring", stiffness: 300 }}
        className="relative z-10"
      >
        <Link
          href="/kundli"
          className="shimmer-btn inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 font-semibold text-sm"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, #b8890f 100%)",
            color: "#05060A",
            boxShadow: "0 0 24px rgba(212,175,55,0.4), 0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          ✨ Start Free Reading
        </Link>
      </motion.div>
    </motion.section>
  );
}
