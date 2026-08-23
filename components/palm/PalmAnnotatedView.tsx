"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

type Development = "flat" | "normal" | "prominent";

interface MajorLine {
  present?: boolean;
  polyline?: Array<[number, number]>;
}

interface MountRegion {
  cx: number;
  cy: number;
  radius: number;
}

interface HandObservations {
  mounts?: Record<string, Development>;
  majorLines?: Record<string, MajorLine>;
}

/**
 * Draw order and colour per line. Heart is red because that is what people expect to see
 * marked on a palm; the rest are spaced around the wheel so no two adjacent lines read as the
 * same colour on a skin-tone photograph. Every colour is also checked to stay legible against
 * both a dark and a light palm — hence the dark halo stroke under each path below.
 */
const LINE_ORDER = [
  "heartLine",
  "headLine",
  "lifeLine",
  "fateLine",
  "sunLine",
  "healthLine",
  "girdleOfVenus",
  "ringOfSolomon",
  "simianLine",
] as const;

type LineKey = (typeof LINE_ORDER)[number];

const LINE_COLOR: Record<string, string> = {
  heartLine: "#FF4D4D",
  headLine: "#F2C14E",
  lifeLine: "#5BD08A",
  fateLine: "#6FA8FF",
  sunLine: "#C77DFF",
  healthLine: "#3FD0C9",
  girdleOfVenus: "#FF9ECD",
  ringOfSolomon: "#FFB067",
  simianLine: "#FF6B35",
};

/**
 * Fallback mount positions, used ONLY when this reading has no landmark-derived regions —
 * an older reading captured before regions were recorded, or one where hand detection failed.
 * These are anatomical averages: they know nothing about this hand's proportions or how it was
 * framed, which is exactly why the real regions (mountRegions.ts, derived from MediaPipe
 * landmarks on the actual photograph) are preferred whenever they exist.
 */
const FALLBACK_MOUNT_POSITIONS: Record<string, [number, number]> = {
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

function toPath(points: Array<[number, number]>, w: number, h: number): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x * w} ${y * h}`).join(" ");
}

function developmentRadius(dev: Development | undefined): number {
  return dev === "prominent" ? 3.2 : dev === "flat" ? 1.8 : 2.4;
}

export interface PalmAnnotatedViewProps {
  photoUrl: string | null;
  observations: HandObservations | null | undefined;
  /** Landmark-derived mount positions for THIS photograph, when the capture recorded them. */
  mountRegions?: Record<string, MountRegion> | null;
  onSelectLine: (key: string) => void;
  onSelectMount: (key: string) => void;
}

export default function PalmAnnotatedView({
  photoUrl,
  observations,
  mountRegions,
  onSelectLine,
  onSelectMount,
}: PalmAnnotatedViewProps) {
  const { t } = useTranslation();
  const [drawn, setDrawn] = useState(false);
  /**
   * The photograph's real aspect ratio, read off the decoded image.
   *
   * This is load-bearing, not cosmetic: the overlay used to draw into a fixed 100x100 viewBox
   * with `preserveAspectRatio="none"` on top of an `object-cover` photo, so the SVG stretched
   * to the container while the photo cropped to it. The two coordinate systems only agreed if
   * the capture happened to be exactly 4:5 — every other shot put the "heart line" somewhere
   * that wasn't the heart line. Sizing the box to the image and letterboxing both layers the
   * same way is what makes a traced point land on the crease it was traced from.
   */
  const [aspect, setAspect] = useState<number | null>(null);

  const lines = useMemo(() => {
    if (!observations?.majorLines) return [];
    return LINE_ORDER.filter((key) => observations.majorLines?.[key]?.polyline?.length).map(
      (key) => ({ key, points: observations.majorLines![key]!.polyline! }),
    );
  }, [observations]);

  const mounts = useMemo(() => {
    if (!observations?.mounts) return [];
    return Object.entries(observations.mounts)
      .map(([key, development]) => {
        const region = mountRegions?.[key];
        const pos: [number, number] | undefined = region
          ? [region.cx, region.cy]
          : FALLBACK_MOUNT_POSITIONS[key];
        return pos ? { key, development, pos } : null;
      })
      .filter((m): m is { key: string; development: Development; pos: [number, number] } => !!m);
  }, [observations, mountRegions]);

  // A square viewBox would re-introduce the stretch this component exists to avoid; matching it
  // to the photo's own ratio keeps one unit horizontal equal to one unit vertical.
  const vbW = 100;
  const vbH = aspect ? 100 / aspect : 125;

  return (
    <div className="space-y-3">
      <div
        className="relative w-full rounded-3xl overflow-hidden border border-gold/20 bg-black"
        style={{ aspectRatio: aspect ?? 4 / 5 }}
      >
        {photoUrl ? (
          // object-contain, not object-cover: the overlay is traced against the WHOLE frame, so
          // cropping the photo would silently shift every line off its crease.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setAspect(img.naturalWidth / img.naturalHeight);
              }
              setDrawn(true);
            }}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-surface" />
        )}

        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
        >
          {lines.map(({ key, points }) => (
            <g key={key}>
              {/* Dark halo underneath so a bright line stays visible on a light palm. */}
              <path
                d={toPath(points, vbW, vbH)}
                fill="none"
                stroke="#000"
                strokeOpacity={0.45}
                strokeWidth={2.4}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <motion.path
                d={toPath(points, vbW, vbH)}
                fill="none"
                stroke={LINE_COLOR[key] ?? "#D4AF37"}
                strokeWidth={2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer pointer-events-auto"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={drawn ? { pathLength: 1, opacity: 1 } : {}}
                transition={{ duration: 0.9, delay: 0.15 * LINE_ORDER.indexOf(key as LineKey) }}
                onClick={() => onSelectLine(key)}
              />
              {/* Name the line where it ends, in its own colour — the point of the overlay is
                  that the user can tell which line is which without a key. */}
              <motion.text
                x={points[points.length - 1]![0] * vbW}
                y={points[points.length - 1]![1] * vbH}
                dx={points[points.length - 1]![0] > 0.6 ? -1.5 : 1.5}
                dy={-1.2}
                textAnchor={points[points.length - 1]![0] > 0.6 ? "end" : "start"}
                fill={LINE_COLOR[key] ?? "#D4AF37"}
                stroke="#000"
                strokeWidth={0.6}
                paintOrder="stroke"
                style={{ fontSize: 3.6, fontWeight: 700 }}
                className="cursor-pointer pointer-events-auto select-none"
                initial={{ opacity: 0 }}
                animate={drawn ? { opacity: 1 } : {}}
                transition={{ delay: 0.6 + 0.15 * LINE_ORDER.indexOf(key as LineKey) }}
                onClick={() => onSelectLine(key)}
              >
                {t(`palm.line.${key}`)}
              </motion.text>
            </g>
          ))}
          {mounts.map(({ key, development, pos }) => (
            <motion.circle
              key={key}
              cx={pos[0] * vbW}
              cy={pos[1] * vbH}
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

      {lines.length > 0 && (
        <>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1">
            {lines.map(({ key }) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectLine(key)}
                className="flex items-center gap-1.5 text-[11px] text-foreground/75"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: LINE_COLOR[key] ?? "#D4AF37" }}
                />
                {t(`palm.line.${key}`)}
              </button>
            ))}
          </div>
          <p className="px-1 text-[11px] text-muted">{t("palm.view.tapHint")}</p>
        </>
      )}
    </div>
  );
}
