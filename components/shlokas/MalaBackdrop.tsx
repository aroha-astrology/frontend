"use client";

import { useState } from "react";

/**
 * The mala screen's scenic backdrop — foliage left, temple right, hazy
 * mountains, drifting clouds, birds, sun/moon glow, mandala disc — per the
 * reference mockup and the user's explicit call-out of that scenery.
 *
 * Mountains/Temple/Foliage now render the user-supplied photographic crops
 * (public/shlokas/backdrop/*.webp) and fall back to the original coded SVG
 * silhouette on error — same try-image-then-fallback idiom already used by
 * MandalaDisc (public/mandala.png) and RudrakshaBead (the bead photo). Sky,
 * Glow, Clouds and Birds stay coded: they're simple gradients/dashes that
 * already read `var(--mala-*)` tokens and repaint per theme for free, which
 * a baked photo can't do — no photo replaces them.
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
      <Mountains />
      <Clouds />
      <TempleImage />
      <FoliageImage />
      <Birds />
      <DiyaAccent />
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

function MountainsFallback() {
  return (
    <>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="absolute right-[-6%] top-[8%] w-[110%] h-[42%] text-[color:var(--mala-silhouette)]" opacity={0.28}>
        <path
          fill="currentColor"
          d="M0,150 L45,95 L80,125 L130,70 L175,115 L215,85 L255,130 L300,90 L345,120 L400,100 L400,200 L0,200 Z"
        />
      </svg>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="absolute right-[-6%] top-[20%] w-[110%] h-[38%] text-[color:var(--mala-silhouette)]" opacity={0.4}>
        <path fill="currentColor" d="M0,170 L60,110 L110,145 L160,100 L220,150 L280,115 L340,155 L400,130 L400,200 L0,200 Z" />
      </svg>
    </>
  );
}

/** Real hazy-mountain photo, tried before the coded silhouette pair above. Shifted up and toward the right vs. plain full-width/center, per the reference feedback that the range read too low and too centered. */
function Mountains() {
  const [imgError, setImgError] = useState(false);
  if (imgError) return <MountainsFallback />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/shlokas/backdrop/mountains.webp"
      alt=""
      className="absolute right-[-6%] top-[8%] w-[110%] h-[52%] object-cover object-right opacity-80"
      onError={() => setImgError(true)}
    />
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

function TempleFallback() {
  return (
    <svg
      viewBox="0 0 120 160"
      preserveAspectRatio="xMaxYMax meet"
      className="absolute right-[4%] bottom-[16%] w-[26%] max-w-[110px] h-[34%] text-[color:var(--mala-silhouette)]"
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

/** Real temple-on-the-hill photo, tried before TempleFallback's coded silhouette. */
function TempleImage() {
  const [imgError, setImgError] = useState(false);
  if (imgError) return <TempleFallback />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/shlokas/backdrop/temple.webp"
      alt=""
      className="absolute right-[2%] bottom-[10%] w-[38%] max-w-[160px] h-[40%] object-contain object-bottom opacity-90"
      onError={() => setImgError(true)}
    />
  );
}

function FoliageFallback() {
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

/** Real hanging-branch photo, tried before FoliageFallback's coded silhouette. */
function FoliageImage() {
  const [imgError, setImgError] = useState(false);
  if (imgError) return <FoliageFallback />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/shlokas/backdrop/foliage.webp"
      alt=""
      className="absolute left-[-4%] top-[-3%] w-[42%] max-w-[190px] object-contain object-left-top opacity-90"
      onError={() => setImgError(true)}
    />
  );
}

/** Small lit-diya accent, bottom-left — no coded fallback (purely decorative, skip silently on 404). */
function DiyaAccent() {
  const [imgError, setImgError] = useState(false);
  if (imgError) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/shlokas/backdrop/diya.webp"
      alt=""
      className="absolute left-[2%] bottom-[6%] w-[16%] max-w-[70px] object-contain opacity-85"
      onError={() => setImgError(true)}
    />
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

/**
 * public/shlokas/backdrop/mandala-line.webp is a real-alpha version of
 * public/mandala.png — the original has no alpha channel at all (opaque
 * white square), which at 12% opacity barely showed against the old plain
 * gradient but reads as a foggy rectangular wash now that a photo backdrop
 * sits under it. This derived asset keeps only the linework (alpha =
 * darkness), so it blends as a soft pattern instead of a box. Falls back to
 * a plain coded disc if it 404s, same either/or pattern as
 * ReportThemeCard's ReportVisual.
 */
function MandalaDisc() {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="absolute left-1/2 top-[46%] w-[80%] max-w-[380px] aspect-square -translate-x-1/2 -translate-y-1/2 opacity-[0.22]">
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/shlokas/backdrop/mandala-line.webp"
          alt=""
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
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
