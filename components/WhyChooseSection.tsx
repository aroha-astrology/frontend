"use client";

import { motion } from "framer-motion";

const features = [
  { icon: "🤖", label: "AI Powered", desc: "Vedic wisdom meets modern AI for accurate insights" },
  { icon: "📿", label: "Vedic Astrology", desc: "Rooted in 5000-year Jyotish traditions" },
  { icon: "✨", label: "Personalized Insights", desc: "Readings tailored to your exact birth chart" },
  { icon: "💞", label: "Match Making", desc: "Cosmic compatibility for lasting love" },
  { icon: "🌞", label: "Daily Horoscope", desc: "Fresh planetary guidance every morning" },
];

export default function WhyChooseSection() {
  return (
    <section className="px-4 mt-8 mb-2">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center font-semibold text-base mb-5"
        style={{ fontFamily: "Cinzel, serif", color: "var(--gold)" }}
      >
        Why Choose Aroho
      </motion.h2>

      <div className="flex flex-col gap-3">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {/* Checkmark circle */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.35)" }}
            >
              <span className="text-sm leading-none" style={{ color: "var(--gold)" }}>✓</span>
            </div>

            {/* Emoji */}
            <span className="text-xl leading-none flex-shrink-0">{f.icon}</span>

            {/* Text */}
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                {f.label}
              </p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
