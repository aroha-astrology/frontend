"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const chips = ["Career guidance", "Love life", "2026 Prediction"];

export default function AIChatPreview() {
  const router = useRouter();

  return (
    <div
      className="rounded-3xl border p-4 mx-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Sage avatar */}
        <div
          className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            borderColor: "var(--gold)",
            background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))",
          }}
        >
          🧙
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gold text-sm">AI Astrologer</span>
            <span className="live-pulse" />
            <span className="text-[10px] text-green-400">Live</span>
          </div>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-xs mt-1 leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Namaste! I&apos;m your AI Astrologer. How can I guide you today?
          </motion.p>
        </div>
      </div>

      {/* Quick-action chips */}
      <div className="flex gap-2 flex-wrap">
        {chips.map((chip, i) => (
          <motion.button
            key={chip}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/ai-chat?q=${encodeURIComponent(chip)}`)}
            className="px-3 py-1.5 rounded-full text-xs border transition-colors"
            style={{
              background: "rgba(212,175,55,0.08)",
              borderColor: "rgba(212,175,55,0.3)",
              color: "var(--gold)",
            }}
          >
            {chip}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
