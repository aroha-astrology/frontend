"use client";

import { useState } from "react";

/**
 * The mala screen's scenic backdrop — foliage left, temple right, hazy
 * mountains, drifting clouds, birds, sun/moon glow, mandala disc — per the
 * reference mockup and the user's explicit call-out of that scenery.
 *
 * No photographic art exists for this (nothing in public/ resembles it), so
 * every layer below is a coded silhouette rather than a placeholder image —
 * this is the same decorative-SVG idiom components/LotusSilhouette.tsx and
 * components/ZodiacSilhouette.tsx already use (currentColor + opacity), not
 * a new pattern. It also re-themes for free: a baked sunrise photo would
 * need a second night version, but these silhouettes just read
 * `var(--mala-*)` tokens (added to app/globals.css) and repaint per theme —
 * light renders the mockup's sunrise directly, dark renders a night scene.
 *
 * Split into one function per layer (not one giant background image) so a
 * real asset can replace any single layer later — e.g. swap TempleRight's
 * body for an `<img>` — without touching this file's structure or its
 * caller. `public/mandala.png` is the one layer with a real asset already
 * in the repo, so it alone follows the try-image-then-fallback pattern
 * (matching components/reports/ReportThemeCard.tsx's ReportVisual).
 *
 * Layered back-to-front, absolutely positioned, `pointer-events-none`, so it
 * sits behind the ring exactly like ParticleBackground + MoonBackground sit
 * behind app/page.tsx's content (same `relative z-10` split there).
 */
export default function MalaBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <Sky />
      <Glow />
      <FarMountains />
      <Clouds />
      <NearMountains />
      <TempleRight />
      <FoliageLeft />
      <Birds />
      <MandalaDisc />
    </div>
  );
}

function Sky() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, var(--mala-sky-1) 0%, var(--mala-sky-2) 100%)" }}
    />
  );
}

function Glow() {
  return (
    <div
      className="absolute left-1/2 top-[8%] w-[70%] aspect-square -translate-x-1/3 rounded-full blur-3xl opacity-50"
      style={{ background: "radial-gradient(circle, var(--mala-glow) 0%, transparent 70%)" }}
    />
  );
}

function FarMountains() {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 top-[18%] w-full h-[42%] text-[color:var(--mala-silhouette)]" opacity={0.28}>
      <path
        fill="currentColor"
        d="M0,150 L45,95 L80,125 L130,70 L175,115 L215,85 L255,130 L300,90 L345,120 L400,100 L400,200 L0,200 Z"
      />
    </svg>
  );
}

function NearMountains() {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 top-[30%] w-full h-[38%] text-[color:var(--mala-silhouette)]" opacity={0.4}>
      <path fill="currentColor" d="M0,170 L60,110 L110,145 L160,100 L220,150 L280,115 L340,155 L400,130 L400,200 L0,200 Z" />
    </svg>
  );
}

function Clouds() {
  const puffs = [
    { left: "8%", top: "14%", w: 90, h: 22, delay: "0s" },
    { left: "58%", top: "10%", w: 120, h: 26, delay: "-8s" },
    { left: "30%", top: "20%", w: 70, h: 16, delay: "-16s" },
  ];
  return (
    <div className="absolute inset-0">
      {puffs.map((p, i) => (
        <div
          key={i}
          className="animate-mala-cloud-drift absolute rounded-full blur-md opacity-35"
          style={{
            left: p.left,
            top: p.top,
            width: p.w,
            height: p.h,
            background: "var(--mala-sky-1)",
            filter: "blur(6px) brightness(1.6)",
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

function TempleRight() {
  return (
    <svg
      viewBox="0 0 120 160"
      preserveAspectRatio="xMaxYMax meet"
      className="absolute right-[4%] bottom-[30%] w-[26%] max-w-[110px] h-[34%] text-[color:var(--mala-silhouette)]"
      opacity={0.55}
    >
      {/* Stepped shikhara tapering to a finial, on a small base. */}
      <path
        fill="currentColor"
        d="
          M60,8 L64,20 L56,20 Z
          M46,20 L74,20 L70,36 L50,36 Z
          M42,36 L78,36 L73,54 L47,54 Z
          M36,54 L84,54 L78,76 L42,76 Z
          M28,76 L92,76 L92,150 L28,150 Z
        "
      />
      <circle cx="60" cy="6" r="2.4" fill="currentColor" />
    </svg>
  );
}

function FoliageLeft() {
  return (
    <svg
      viewBox="0 0 140 160"
      preserveAspectRatio="xMinYMax meet"
      className="absolute left-[-2%] bottom-[26%] w-[34%] max-w-[130px] h-[36%] text-[color:var(--mala-silhouette)]"
      opacity={0.6}
    >
      {/* Layered fronds, largest/frontmost last so it overlaps the rest. */}
      <path fill="currentColor" opacity={0.7} d="M10,160 C10,110 40,70 90,50 C60,80 50,120 55,160 Z" />
      <path fill="currentColor" opacity={0.85} d="M0,160 C0,120 20,85 65,60 C40,90 32,125 35,160 Z" />
      <path fill="currentColor" d="M-10,160 C-10,125 5,95 45,72 C25,98 20,128 22,160 Z" />
    </svg>
  );
}

function Birds() {
  const flock = [
    { x: 70, y: 30, s: 1 },
    { x: 95, y: 22, s: 0.8 },
    { x: 120, y: 34, s: 0.7 },
    { x: 40, y: 45, s: 0.6 },
  ];
  return (
    <svg viewBox="0 0 200 100" className="absolute inset-x-0 top-0 w-full h-[24%] text-[color:var(--mala-silhouette)]" opacity={0.45}>
      {flock.map((b, i) => (
        <path
          key={i}
          d={`M${b.x - 6 * b.s},${b.y} Q${b.x - 3 * b.s},${b.y - 4 * b.s} ${b.x},${b.y} Q${b.x + 3 * b.s},${b.y - 4 * b.s} ${b.x + 6 * b.s},${b.y}`}
          stroke="currentColor"
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** The one layer with a real asset already in the repo — falls back to a plain coded disc if it 404s, same either/or pattern as ReportThemeCard's ReportVisual. */
function MandalaDisc() {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="absolute left-1/2 top-[46%] w-[80%] max-w-[380px] aspect-square -translate-x-1/2 -translate-y-1/2 opacity-[0.12]">
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/mandala.png" alt="" className="w-full h-full object-contain" onError={() => setImgError(true)} />
      ) : (
        <svg viewBox="0 0 100 100" className="w-full h-full text-[color:var(--mala-silhouette)]">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      )}
    </div>
  );
}
