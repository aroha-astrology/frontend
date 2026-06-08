"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Priya S.",
    sign: "♋ Cancer",
    text: "Aroho's AI predicted my career shift 3 months before it happened. Absolutely stunning accuracy!",
    stars: 5,
  },
  {
    name: "Rahul M.",
    sign: "♏ Scorpio",
    text: "The Kundli report was incredibly detailed. Felt like talking to an actual Vedic astrologer.",
    stars: 5,
  },
  {
    name: "Ananya K.",
    sign: "♍ Virgo",
    text: "Match compatibility was spot on. We've been together 2 years now — the stars don't lie!",
    stars: 5,
  },
  {
    name: "Vikram T.",
    sign: "♈ Aries",
    text: "Daily horoscope keeps me grounded every morning. The gemstone remedies actually work.",
    stars: 5,
  },
  {
    name: "Meera D.",
    sign: "♓ Pisces",
    text: "Premium dark UI feels so luxurious. I use Aroho every single day for guidance.",
    stars: 5,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <span className="text-sm tracking-wider" style={{ color: "var(--gold)" }}>
      {"★".repeat(count)}
    </span>
  );
}

export default function TestimonialsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const CARD_W = 240;
  const GAP = 12;
  const STEP = CARD_W + GAP;
  const total = testimonials.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => {
        const next = prev + 1;
        return next >= total ? 0 : next;
      });
    }, 3200);
    return () => clearInterval(interval);
  }, [total]);

  return (
    <section className="mt-8 mb-2">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center font-semibold text-base mb-5 px-4"
        style={{ fontFamily: "Cinzel, serif", color: "var(--gold)" }}
      >
        What Our Users Say
      </motion.h2>

      <div className="overflow-hidden px-4">
        <motion.div
          ref={trackRef}
          className="flex gap-3"
          animate={{ x: -(offset * STEP) }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          style={{ width: total * STEP }}
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-2xl border p-4"
              style={{
                width: CARD_W,
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <Stars count={t.stars} />
              <p
                className="text-xs mt-2 leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: "rgba(212,175,55,0.12)", border: "1px solid var(--border)" }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                    {t.name}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {t.sign}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setOffset(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === offset ? 18 : 6,
              height: 6,
              background: i === offset ? "var(--gold)" : "rgba(212,175,55,0.25)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
