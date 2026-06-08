"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const chips = [
  "Career Prediction",
  "Marriage Prediction",
  "Love Life",
  "Business Growth",
];

function SageIllustration({ size = 88 }: { size?: number }) {
  const gold = "#D4AF37";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Subtle star dots in background */}
      <circle cx="14" cy="18" r="1" fill={gold} fillOpacity="0.4" />
      <circle cx="66" cy="16" r="1.1" fill={gold} fillOpacity="0.3" />
      <circle cx="69" cy="56" r="0.8" fill={gold} fillOpacity="0.3" />
      <circle cx="11" cy="58" r="0.9" fill={gold} fillOpacity="0.3" />
      <circle cx="20" cy="70" r="0.7" fill={gold} fillOpacity="0.22" />
      <circle cx="61" cy="68" r="0.7" fill={gold} fillOpacity="0.22" />

      {/* Turban — dome shape */}
      <path
        d="M 22 44 C 22 22 58 22 58 44"
        stroke={gold}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Turban fabric fold lines */}
      <path
        d="M 24 42 Q 32 28 40 27 Q 48 28 56 42"
        stroke={gold}
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.45"
        fill="none"
      />
      <path
        d="M 28 37 Q 34 27 40 26 Q 46 27 52 37"
        stroke={gold}
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeOpacity="0.28"
        fill="none"
      />
      {/* Turban gem — diamond bindi at center forehead */}
      <polygon
        points="40,21 42,24.5 40,28 38,24.5"
        stroke={gold}
        strokeWidth="1"
        fill={gold}
        fillOpacity="0.65"
      />

      {/* Head oval */}
      <ellipse
        cx="40"
        cy="47"
        rx="13.5"
        ry="15.5"
        stroke={gold}
        strokeWidth="1.4"
        fill="none"
      />

      {/* Eyebrows */}
      <path
        d="M 32 41 Q 35 39.5 38 41"
        stroke={gold}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 42 41 Q 45 39.5 48 41"
        stroke={gold}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Eyes — almond shaped with fill */}
      <path
        d="M 33 44.5 Q 35 42.5 37 44.5 Q 35 46.5 33 44.5 Z"
        stroke={gold}
        strokeWidth="0.9"
        fill={gold}
        fillOpacity="0.65"
      />
      <path
        d="M 43 44.5 Q 45 42.5 47 44.5 Q 45 46.5 43 44.5 Z"
        stroke={gold}
        strokeWidth="0.9"
        fill={gold}
        fillOpacity="0.65"
      />

      {/* Nose — simplified triangle open at bottom */}
      <path
        d="M 40 48 L 38 52 L 42 52"
        stroke={gold}
        strokeWidth="0.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Mustache */}
      <path
        d="M 35.5 54 Q 37.5 53 40 54 Q 42.5 53 44.5 54"
        stroke={gold}
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />

      {/* Beard — long flowing from below chin */}
      <path
        d="M 30 57 C 27 64 27 71 31 74.5 C 35 76 45 76 49 74.5 C 53 71 53 64 50 57"
        stroke={gold}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Beard center parting line */}
      <line
        x1="40"
        y1="57"
        x2="40"
        y2="74"
        stroke={gold}
        strokeWidth="0.65"
        strokeOpacity="0.35"
      />
      {/* Beard texture curves */}
      <path
        d="M 32 60 Q 34 67 32 72"
        stroke={gold}
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeOpacity="0.3"
        fill="none"
      />
      <path
        d="M 48 60 Q 46 67 48 72"
        stroke={gold}
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeOpacity="0.3"
        fill="none"
      />

      {/* Shoulders / robe */}
      <path
        d="M 10 80 C 14 71 24 65 40 63 C 56 65 66 71 70 80"
        stroke={gold}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Robe neckline V */}
      <path
        d="M 36 63 Q 40 67.5 44 63"
        stroke={gold}
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function AIChatPreview() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="backdrop-blur-md rounded-3xl mx-4 overflow-hidden"
      style={{
        background: "rgba(14,15,21,0.72)",
        border: "1px solid rgba(212,175,55,0.12)",
      }}
    >
      {/* Main content row */}
      <div className="flex items-start gap-4 p-5">
        {/* Left text block */}
        <div className="flex-1 min-w-0 pt-1">
          <p
            className="font-display uppercase mb-1"
            style={{ fontSize: "0.6rem", letterSpacing: "0.45em", color: "rgba(212,175,55,0.5)" }}
          >
            Your Personal
          </p>
          <h3
            className="font-editorial leading-tight mt-0.5"
            style={{ fontSize: "1.55rem", color: "var(--gold)", fontStyle: "italic", fontWeight: 600 }}
          >
            AI Astrologer
          </h3>
          <p
            className="text-xs mt-2.5 leading-relaxed font-body"
            style={{ color: "var(--text-muted)", lineHeight: 1.75 }}
          >
            Get instant clarity on life, career,
            <br />
            relationships and much more.
          </p>

          {/* CTA row */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => router.push("/ai-chat")}
              className="shimmer-btn px-4 py-2 rounded-full text-xs font-semibold border transition-colors"
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

        {/* Right — sage illustration */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div
            className="rounded-full flex items-center justify-center relative"
            style={{
              width: 108,
              height: 108,
              background: "linear-gradient(145deg, rgba(212,175,55,0.12), rgba(212,175,55,0.03))",
              border: "1.5px solid rgba(212,175,55,0.4)",
              boxShadow: "0 0 28px rgba(212,175,55,0.12), inset 0 0 20px rgba(212,175,55,0.06)",
            }}
          >
            {/* Inner ring */}
            <div
              className="absolute inset-2 rounded-full pointer-events-none"
              style={{ border: "1px solid rgba(212,175,55,0.18)" }}
            />
            <SageIllustration size={84} />
          </div>

          {/* AI POWERED badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(8,9,14,0.95)",
              border: "1px solid rgba(212,175,55,0.28)",
              color: "var(--gold)",
              fontSize: "0.55rem",
              letterSpacing: "0.12em",
              fontFamily: "var(--font-display)",
            }}
          >
            <span>✦</span>
            <span>AI POWERED</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-5 mb-3"
        style={{ height: 1, background: "rgba(212,175,55,0.07)" }}
      />

      {/* Chip suggestions horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-5 px-5 scrollbar-hide">
        {chips.map((chip, i) => (
          <motion.button
            key={chip}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.08 }}
            whileTap={{ scale: 0.96 }}
            onClick={() =>
              router.push(`/ai-chat?q=${encodeURIComponent(chip)}`)
            }
            className="px-3.5 py-1.5 rounded-full text-xs border flex-shrink-0 transition-colors"
            style={{
              background: "rgba(212,175,55,0.05)",
              borderColor: "rgba(212,175,55,0.22)",
              color: "var(--gold)",
              whiteSpace: "nowrap",
            }}
          >
            {chip}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
