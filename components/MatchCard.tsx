"use client";

import Link from "next/link";
import { Heart, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function MatchCard() {
  return (
    <Link href="/compatibility" className="block mx-4">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-4 rounded-2xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Pulsing heart icon */}
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart size={26} fill="rgba(239,68,68,0.8)" style={{ color: "rgba(239,68,68,0.9)" }} />
          </motion.div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Match Making
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Find your perfect cosmic match with advanced compatibility analysis
          </p>
        </div>

        {/* Arrow */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid var(--border)" }}
        >
          <ChevronRight size={16} style={{ color: "var(--gold)" }} />
        </div>
      </motion.div>
    </Link>
  );
}
