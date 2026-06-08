"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function KundliCard() {
  return (
    <Link href="/kundli" className="block mx-4">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-4 rounded-2xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Mandala icon */}
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0 grid grid-cols-2 gap-0.5 p-1.5"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid var(--border)" }}
        >
          {[0,1,2,3].map((i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ background: i % 2 === 0 ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.2)" }}
            />
          ))}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gold">Kundli Generator</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Generate your detailed Kundli in seconds
          </p>
        </div>

        {/* Arrow */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(212,175,55,0.15)", border: "1px solid var(--border)" }}
        >
          <ChevronRight size={16} style={{ color: "var(--gold)" }} />
        </div>
      </motion.div>
    </Link>
  );
}
