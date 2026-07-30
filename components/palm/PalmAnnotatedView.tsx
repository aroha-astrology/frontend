"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type Development = "flat" | "normal" | "prominent";

interface MajorLine {
  present?: boolean;
  polyline?: Array<[number, number]>;
}

interface HandObservations {
  mounts?: Record<string, Development>;
  majorLines?: Record<string, MajorLine>;
}

/** Anatomically fixed approximate positions (normalized 0-1, front-palm view) for each mount —
 * unlike lines, mounts don't vary in POSITION person-to-person (only in development/size), so
 * these are hand-tuned constants rather than something the vision model should be asked to
 * place — asking an LLM to re-derive a fixed anatomical layout per photo only invites drift. */
const MOUNT_POSITIONS: Record<string, [number, number]> = {
  jupiter: [0.36, 0.26],
  saturn: [0.5, 0.2],
  apollo: [0.62, 0.22],
  mercury: [0.75, 0.3],
  venus: [0.32, 0.64],
  luna: [0.73, 0.7],
  marsUpper: [0.68, 0.46],
  marsLower: [0.38, 0.4],
  rahuPlain: [0.5, 0.48],
};

const LINE_ORDER = ["heartLine", "headLine", "lifeLine", "fateLine"] as const;
const LINE_COLOR: Record<string, string> = {
  heartLine: "#E8B4B8",
  headLine: "#D4AF37",
  lifeLine: "#8FBF9F",
  fateLine: "#9FB3D4",
};

function toPath(points: Array<[number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x * 100} ${y * 100}`).join(" ");
}

function developmentRadius(dev: Development | undefined): number {
  return dev === "prominent" ? 3.2 : dev === "flat" ? 1.8 : 2.4;
}

export interface PalmAnnotatedViewProps {
  photoUrl: string | null;
  observations: HandObservations | null | undefined;
  onSelectLine: (key: string) => void;
  onSelectMount: (key: string) => void;
}

export default function PalmAnnotatedView({
  photoUrl,
  observations,
  onSelectLine,
  onSelectMount,
}: PalmAnnotatedViewProps) {
  const [drawn, setDrawn] = useState(false);

  const lines = useMemo(() => {
    if (!observations?.majorLines) return [];
    return LINE_ORDER.filter((key) => observations.majorLines?.[key]?.polyline?.length).map((key) => ({
      key,
      points: observations.majorLines![key]!.polyline!,
    }));
  }, [observations]);

  const mounts = useMemo(() => {
    if (!observations?.mounts) return [];
    return Object.entries(observations.mounts)
      .filter(([key]) => MOUNT_POSITIONS[key])
      .map(([key, development]) => ({ key, development, pos: MOUNT_POSITIONS[key]! }));
  }, [observations]);

  return (
    <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden border border-gold/20 bg-black">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={() => setDrawn(true)}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-surface" />
      )}

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {lines.map(({ key, points }) => (
          <motion.path
            key={key}
            d={toPath(points)}
            fill="none"
            stroke={LINE_COLOR[key] ?? "#D4AF37"}
            strokeWidth={0.8}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="cursor-pointer pointer-events-auto"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={drawn ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.15 * LINE_ORDER.indexOf(key as (typeof LINE_ORDER)[number]) }}
            onClick={() => onSelectLine(key)}
          />
        ))}
        {mounts.map(({ key, development, pos }) => (
          <motion.circle
            key={key}
            cx={pos[0] * 100}
            cy={pos[1] * 100}
            r={developmentRadius(development)}
            fill="#D4AF37"
            fillOpacity={0.85}
            stroke="#1a0e00"
            strokeWidth={0.4}
            className="cursor-pointer pointer-events-auto"
            initial={{ scale: 0, opacity: 0 }}
            animate={drawn ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 1 }}
            onClick={() => onSelectMount(key)}
          />
        ))}
      </svg>
    </div>
  );
}
