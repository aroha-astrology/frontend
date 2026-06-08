"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const chips = [
  "Career Prediction",
  "Marriage Prediction",
  "Love Life",
  "Business Growth",
];

export default function AIChatPreview() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-[#11131B]/80 backdrop-blur-md border border-[rgba(212,175,55,0.15)] rounded-3xl mx-4 overflow-hidden"
    >
      {/* Main content row */}
      <div className="flex items-center gap-4 p-4">
        {/* Left text block */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
            Your Personal
          </p>
          <h3 className="font-editorial text-xl text-gold leading-tight mt-0.5">
            AI Astrologer
          </h3>
          <p className="text-xs mt-1.5 leading-relaxed font-body" style={{ color: "var(--text-muted)" }}>
            Get instant clarity on life, career, relationships and much more.
          </p>

          {/* CTA row */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => router.push("/ai-chat")}
              className="shimmer-btn px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              style={{
                borderColor: "var(--gold)",
                color: "var(--gold)",
                background: "rgba(212,175,55,0.08)",
              }}
            >
              Chat Now ✨
            </button>

            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
                style={{ boxShadow: "0 0 6px rgba(74,222,128,0.8)" }}
              />
              <span className="text-[10px] text-green-400 font-body">Live</span>
            </div>
          </div>
        </div>

        {/* Right avatar/orb area */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {/* Gold ring + avatar circle */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center relative"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.04))",
              border: "2px solid rgba(212,175,55,0.5)",
              boxShadow:
                "0 0 24px rgba(212,175,55,0.15), inset 0 0 16px rgba(212,175,55,0.08)",
            }}
          >
            {/* Inner glow ring */}
            <div
              className="absolute inset-1.5 rounded-full"
              style={{
                border: "1px solid rgba(212,175,55,0.2)",
              }}
            />
            <span
              className="text-4xl relative z-10"
              role="img"
              aria-label="AI Astrologer"
            >
              🧙
            </span>
          </div>

          {/* AI POWERED badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-widest"
            style={{
              background: "rgba(11,13,18,0.9)",
              border: "1px solid rgba(212,175,55,0.3)",
              color: "var(--gold)",
            }}
          >
            <span>✦</span>
            <span>AI POWERED</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-4 mb-3"
        style={{ height: 1, background: "rgba(212,175,55,0.08)" }}
      />

      {/* Chip suggestions horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-4 px-4 scrollbar-hide">
        {chips.map((chip, i) => (
          <motion.button
            key={chip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.08 }}
            whileTap={{ scale: 0.96 }}
            onClick={() =>
              router.push(`/ai-chat?q=${encodeURIComponent(chip)}`)
            }
            className="px-3 py-1.5 rounded-full text-xs border flex-shrink-0 transition-colors"
            style={{
              background: "rgba(212,175,55,0.06)",
              borderColor: "rgba(212,175,55,0.25)",
              color: "var(--gold)",
            }}
          >
            {chip}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
