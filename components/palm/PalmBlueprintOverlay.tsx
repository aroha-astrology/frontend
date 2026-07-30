"use client";

import { motion } from "framer-motion";
import type { PalmCaptureSlot } from "@/lib/palm-api";

/**
 * The gold guide silhouette overlaid on the camera preview — morphs per
 * capture slot so the user is shown exactly how to hold their hand for THAT
 * angle, not a generic rectangle. Pure presentational SVG, no camera/detection
 * logic — PalmCaptureWizard decides when to show/hide/pulse it.
 */
export default function PalmBlueprintOverlay({ slot }: { slot: PalmCaptureSlot }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.svg
        viewBox="0 0 200 260"
        className="w-[72%] max-w-[320px] drop-shadow-[0_0_12px_rgba(212,175,55,0.35)]"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 0.85, scale: 1 }}
        transition={{ duration: 0.35 }}
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {renderSilhouette(slot)}
      </motion.svg>
    </div>
  );
}

/** A rounded-capsule finger: two parallel sides + a rounded tip, built from an explicit
 * rect+arc path so it renders crisply at any length rather than approximating with a plain
 * <rect rx>, which looks squared-off at these proportions. */
function finger(x: number, yTop: number, yBottom: number, width: number): string {
  const r = width / 2;
  const left = x - r;
  const right = x + r;
  return `M ${left} ${yBottom} L ${left} ${yTop + r} A ${r} ${r} 0 0 1 ${right} ${yTop + r} L ${right} ${yBottom}`;
}

function renderSilhouette(slot: PalmCaptureSlot) {
  switch (slot) {
    case "primaryFront":
    case "secondaryFront": {
      // Open palm facing the camera: palm outline + four spread fingers + thumb, each an
      // independent capsule (same construction as the fingertips view below) so every digit
      // reads cleanly instead of merging into one blobby continuous silhouette.
      const palm =
        "M58 132 C50 132 44 140 44 152 L46 200 C48 226 62 246 88 250 L114 250 C140 246 154 226 156 200 L158 152 C158 140 152 132 144 132 Z";
      return (
        <g>
          <path d={finger(70, 60, 138, 22)} />
          <path d={finger(101, 40, 136, 24)} />
          <path d={finger(131, 44, 136, 22)} />
          <path d={finger(155, 66, 138, 19)} />
          <path d="M52 150 C34 152 22 168 26 186 C29 200 42 208 54 202 L64 178" />
          <path d={palm} />
        </g>
      );
    }
    case "primaryPercussion":
    case "secondaryPercussion":
      // Hand on its edge, little-finger side toward the camera — a narrow vertical profile
      // with the pinky-side ridge and heel of the palm visible.
      return (
        <g>
          <path d="M90 40 C78 40 72 52 72 64 L70 150 C68 180 74 210 86 235 C94 248 108 250 118 240 C128 228 130 205 128 180 L124 70 C124 54 112 40 100 40 Z" />
          <path d="M72 100 C60 100 54 112 56 126 L60 165 C62 178 70 185 78 182" />
          <path d="M78 182 L84 220" opacity="0.35" />
        </g>
      );
    case "primaryDorsal": {
      // Back of the hand — same clean finger-capsule construction as the front view, with a
      // subtler knuckle-ridge hint instead of the palm's crease lines.
      const back =
        "M56 130 C48 130 42 140 42 152 L44 198 C46 226 60 248 88 250 L112 250 C140 248 154 226 156 198 L158 152 C158 140 152 130 144 130 Z";
      return (
        <g>
          <path d={finger(70, 60, 136, 22)} />
          <path d={finger(101, 40, 134, 24)} />
          <path d={finger(131, 44, 134, 22)} />
          <path d={finger(155, 66, 136, 19)} />
          <path d="M52 150 C34 152 22 168 26 186 C29 200 42 208 54 202 L64 178" />
          <path d={back} />
          <path d="M64 100 L146 118 M92 84 L94 130 M120 82 L120 130" opacity="0.3" />
        </g>
      );
    }
    case "primaryFingertips":
      // Four fingertip pads in a row, close-up framing.
      return (
        <g>
          <rect x="30" y="70" width="30" height="120" rx="15" />
          <rect x="72" y="40" width="30" height="150" rx="15" />
          <rect x="114" y="35" width="30" height="155" rx="15" />
          <rect x="156" y="60" width="30" height="130" rx="15" />
          <path d="M30 130 H186 M30 150 H186" opacity="0.25" />
        </g>
      );
  }
}
