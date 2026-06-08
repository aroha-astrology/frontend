"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function MatchCard() {
  return (
    <Link href="/compatibility" className="block mx-4">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="rounded-3xl overflow-hidden border"
        style={{
          background:
            "linear-gradient(135deg, rgba(17,19,27,0.95), rgba(11,13,18,0.9))",
          borderColor: "rgba(212,175,55,0.25)",
        }}
      >
        <div className="flex items-center justify-between p-5">
          {/* Left: Overlapping silhouette circles */}
          <div className="relative w-16 h-12 flex-shrink-0">
            {/* Female circle */}
            <div
              className="absolute top-0 left-0 w-11 h-11 rounded-full flex items-center justify-center text-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))",
                border: "1.5px solid rgba(212,175,55,0.45)",
              }}
            >
              👩
            </div>
            {/* Male circle — overlaps */}
            <div
              className="absolute top-1 left-6 w-11 h-11 rounded-full flex items-center justify-center text-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))",
                border: "1.5px solid rgba(212,175,55,0.35)",
              }}
            >
              👨
            </div>
            {/* Connecting glow between circles */}
            <div
              className="absolute"
              style={{
                width: 20,
                height: 20,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(212,175,55,0.25), transparent)",
              }}
            />
          </div>

          {/* Center text */}
          <div className="flex-1 min-w-0 px-3">
            <p className="font-editorial text-xl text-gold leading-tight">
              Match Making
            </p>
            <p
              className="text-xs mt-1 leading-relaxed font-body"
              style={{ color: "var(--text-muted)" }}
            >
              Discover compatibility based on Vedic astrology.
            </p>
          </div>

          {/* Right: Arrow circle */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.3)",
            }}
          >
            <ChevronRight size={16} style={{ color: "var(--gold)" }} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
