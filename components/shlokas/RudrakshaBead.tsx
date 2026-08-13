"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef, useState, useId } from "react";

interface Props {
  mukhi: number;
  size: number;
  locked: boolean;
  onTap: () => void;
  /** Hide cast shadow when the bead sits on a string (mala ring). */
  hideShadow?: boolean;
  /** Hide breathing halo (the ring renders its own glow on the active bead only). */
  hideHalo?: boolean;
  ariaLabel?: string;
  /**
   * Extra px added symmetrically to the button's clickable area beyond the
   * drawn bead — the visual bead stays whatever `size` says, but the tap
   * target grows. Needed because RudrakshaMala renders the whole ring as one
   * scaled SVG (see its header comment), so a bead drawn a comfortable size
   * at max width can end up under the 44px touch-target floor at a narrow
   * viewport. The outer wrapper div has no `overflow: hidden`, so a
   * negative-inset button still registers clicks outside its nominal box.
   */
  hitPadding?: number;
}

export interface RudrakshaBeadRef {
  pulse: () => void;
}

/** Real bead photo, tried before the hand-drawn fallback below. Drop a file here and every bead upgrades with no code change. */
const BEAD_PHOTO_SRC = "/shlokas/assets/rudraksha-bead.webp";

/**
 * Photoreal Rudraksha bead, ported unmodified (SVG-drawing part) from the
 * dormant `apps/api` mantra-jaap feature (backend/apps/api/src/components/
 * mantra/RudrakshaBead.tsx) — that build already solved layered radial
 * gradients, carved mukhi grooves, specular highlight and cast shadow, so
 * the fallback below is a copy, not a rewrite. mukhi=0 renders a smooth
 * deity bead with an Om glyph.
 *
 * Tries a real photo (BEAD_PHOTO_SRC) first for mukhi>0 beads, falling back
 * to the hand-drawn SVG on error — same either/or pattern as
 * MalaBackdrop.tsx's MandalaDisc and components/reports/ReportThemeCard.tsx's
 * ReportVisual. The deity/Om variant (mukhi=0) stays SVG-only; nothing in
 * the current ring uses it.
 *
 * The one change from the source SVG: the halo/glow, which was a hardcoded
 * gold rgba, now reads `var(--gold)` via `color-mix()` so it recolors with
 * the app's dark/light theme (`--gold` already differs per theme in
 * globals.css). The bead body itself keeps its original hardcoded browns —
 * a rudraksha seed is brown in reality regardless of app theme, so that
 * part of the asset is representational, not brand chrome.
 */
export const RudrakshaBead = forwardRef<RudrakshaBeadRef, Props>(function RudrakshaBead(
  { mukhi, size, locked, onTap, hideShadow = false, hideHalo = false, ariaLabel, hitPadding = 0 },
  ref,
) {
  const [scale, setScale] = useState(1);
  const [glow, setGlow] = useState(0.0);
  const [breathePhase, setBreathePhase] = useState(0);
  const [photoError, setPhotoError] = useState(false);
  const pulseTimerRef = useRef<number | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const useSvg = mukhi === 0 || photoError;

  useEffect(() => {
    if (hideHalo) return;
    const id = setInterval(() => {
      setBreathePhase((p) => (p + 1) % 360);
    }, 50);
    return () => clearInterval(id);
  }, [hideHalo]);

  useImperativeHandle(ref, () => ({
    pulse: () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      setScale(1.1);
      setGlow(0.75);
      pulseTimerRef.current = window.setTimeout(() => {
        setScale(1.0);
        setGlow(0);
      }, 220);
    },
  }));

  const cx = size / 2;
  const cy = size / 2;
  const beadR = size * 0.34;
  const haloR = size * 0.46;
  const haloBloomR = size * 0.85;
  const shadowRy = size * 0.045;
  const shadowCy = cy + beadR + size * 0.04;
  const sparkles = [
    { angle: 20, r: 0.85, offset: 0 },
    { angle: 130, r: 0.95, offset: 90 },
    { angle: 210, r: 0.8, offset: 180 },
    { angle: 300, r: 0.9, offset: 270 },
  ];

  // Mukhi grooves: curved paths from top to bottom; offset N-fold around the centerline.
  const mukhiPaths: string[] = [];
  if (mukhi > 0) {
    for (let i = 0; i < mukhi; i++) {
      const angleDeg = (i / mukhi) * 180 - 90;
      const t = Math.sin((angleDeg * Math.PI) / 180);
      const widthAtCenter = beadR * Math.abs(t) * 0.95;
      const startX = cx;
      const startY = cy - beadR * 0.95;
      const endX = cx;
      const endY = cy + beadR * 0.95;
      const cp1X = cx + widthAtCenter;
      const cp1Y = cy;
      mukhiPaths.push(`M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${endX} ${endY}`);
    }
  }

  const breatheScale = hideHalo ? 1 : 1 + 0.08 * Math.sin((breathePhase * Math.PI) / 180);
  const breatheOpacity = locked || hideHalo ? 0 : 0.55 + 0.25 * Math.sin((breathePhase * Math.PI) / 180);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-block",
      }}
    >
      {/* Cast shadow under the bead — sells the resting-in-space feel */}
      {!hideShadow && (
        <svg
          width={size}
          height={size}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            transform: `scale(${scale})`,
            transition: "transform 220ms ease-out",
          }}
        >
          <defs>
            <radialGradient id={`shadow${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.42)" />
              <stop offset="60%" stopColor="rgba(0,0,0,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>
          <ellipse cx={cx} cy={shadowCy} rx={beadR * 0.9} ry={shadowRy} fill={`url(#shadow${uid})`} />
        </svg>
      )}

      {/* Breathing halo — bright warm bloom + a few twinkling sparkle points, sized to bleed
          well past the bead itself (reference mockup's active-bead glow). Theme-aware gold via
          color-mix(); overflow:visible since the bloom radius exceeds this svg's own box. */}
      {!hideHalo && (
        <svg
          width={size}
          height={size}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "visible",
            pointerEvents: "none",
            transform: `scale(${breatheScale})`,
            opacity: breatheOpacity,
            transition: "opacity 60ms linear",
          }}
        >
          <defs>
            <radialGradient id={`halo${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--gold) 0%, transparent)" />
              <stop offset="40%" stopColor="color-mix(in srgb, var(--gold) 0%, transparent)" />
              <stop offset="58%" stopColor="color-mix(in srgb, var(--gold) 95%, white)" />
              <stop offset="78%" stopColor="color-mix(in srgb, var(--gold) 70%, transparent)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--gold) 0%, transparent)" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={haloBloomR} fill={`url(#halo${uid})`} />
          {sparkles.map((s, i) => {
            const rad = (s.angle * Math.PI) / 180;
            const sx = cx + haloBloomR * s.r * Math.sin(rad);
            const sy = cy - haloBloomR * s.r * Math.cos(rad);
            const twinkle = Math.max(0, Math.sin(((breathePhase + s.offset) * Math.PI) / 180));
            return (
              <circle
                key={i}
                cx={sx}
                cy={sy}
                r={size * 0.02}
                fill="color-mix(in srgb, var(--gold) 90%, white)"
                opacity={twinkle}
              />
            );
          })}
        </svg>
      )}

      {/* Tap glow ring */}
      <svg
        width={size}
        height={size}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: glow,
          transition: "opacity 220ms ease-out",
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={haloR}
          stroke="color-mix(in srgb, var(--gold) 80%, transparent)"
          strokeWidth={1.5}
          fill="none"
        />
      </svg>

      {/* Bead body */}
      <button
        type="button"
        onClick={onTap}
        disabled={locked}
        aria-label={ariaLabel ?? "Tap to count"}
        style={{
          position: "absolute",
          inset: -hitPadding,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: locked ? "default" : "pointer",
          opacity: locked ? 0.55 : 1,
          transform: `scale(${scale})`,
          transition: "transform 220ms ease-out, opacity 180ms ease-out",
        }}
      >
        {!useSvg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BEAD_PHOTO_SRC}
            alt=""
            width={size}
            height={size}
            draggable={false}
            className="object-contain"
            onError={() => setPhotoError(true)}
          />
        ) : (
        <svg width={size} height={size}>
          <defs>
            {/* Outer silhouette — deep cherry brown radial */}
            <radialGradient id={`beadOuter${uid}`} cx="48%" cy="48%" r="52%">
              <stop offset="0%" stopColor="#8a4626" />
              <stop offset="55%" stopColor="#5a2a17" />
              <stop offset="85%" stopColor="#2a0f06" />
              <stop offset="100%" stopColor="#0d0301" />
            </radialGradient>
            {/* Warm core — biases shading toward the top-left */}
            <radialGradient id={`beadCore${uid}`} cx="32%" cy="28%" r="65%">
              <stop offset="0%" stopColor="#c98553" />
              <stop offset="25%" stopColor="#9c5a32" />
              <stop offset="55%" stopColor="rgba(120,60,28,0.35)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            {/* Specular highlight — soft white ellipse, organic shape */}
            <radialGradient id={`spec${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,240,210,0.85)" />
              <stop offset="50%" stopColor="rgba(255,240,210,0.25)" />
              <stop offset="100%" stopColor="rgba(255,240,210,0)" />
            </radialGradient>
            {/* Mukhi groove — light edge gradient (catches highlight) */}
            <linearGradient id={`grooveLight${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,210,150,0)" />
              <stop offset="45%" stopColor="rgba(255,210,150,0.55)" />
              <stop offset="100%" stopColor="rgba(255,210,150,0)" />
            </linearGradient>
            {/* Mukhi groove — dark edge gradient (the carved shadow) */}
            <linearGradient id={`grooveDark${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="50%" stopColor="rgba(0,0,0,0.85)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>
            {/* Rim darkening — soft black halo at the silhouette edge */}
            <radialGradient id={`rim${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="78%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.75)" />
            </radialGradient>
            {/* Micro-noise filter — breaks the perfect gradient with organic surface */}
            <filter id={`noise${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="3" />
              <feColorMatrix
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0.15 0"
              />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
          </defs>

          {/* Base silhouette */}
          <circle cx={cx} cy={cy} r={beadR} fill={`url(#beadOuter${uid})`} />

          {/* Warm core (top-left bias) */}
          <circle cx={cx} cy={cy} r={beadR} fill={`url(#beadCore${uid})`} />

          {/* Organic noise overlay */}
          <circle cx={cx} cy={cy} r={beadR} fill="#000" filter={`url(#noise${uid})`} opacity={0.55} />

          {/* Brahmarandhra (top pore) — recessed dark spot with tiny inner highlight */}
          <circle cx={cx} cy={cy - beadR + 5} r={3} fill="#1a0703" />
          <circle cx={cx - 0.6} cy={cy - beadR + 4.4} r={0.8} fill="rgba(255,210,150,0.35)" />

          {/* Mukhi grooves — paired dark+light strokes for carved depth */}
          {mukhiPaths.length > 0 && (
            <>
              {/* Shadow edge (slightly to the right of true centerline) */}
              <g opacity={0.95}>
                {mukhiPaths.map((d, i) => (
                  <path
                    key={`d${i}`}
                    d={d}
                    stroke={`url(#grooveDark${uid})`}
                    strokeWidth={1.8}
                    fill="none"
                    transform="translate(0.6, 0)"
                  />
                ))}
              </g>
              {/* Light edge (catches the top-left light) */}
              <g opacity={0.85}>
                {mukhiPaths.map((d, i) => (
                  <path
                    key={`l${i}`}
                    d={d}
                    stroke={`url(#grooveLight${uid})`}
                    strokeWidth={1.2}
                    fill="none"
                    transform="translate(-0.6, 0)"
                  />
                ))}
              </g>
            </>
          )}

          {/* Om glyph for deity beads (mukhi = 0) */}
          {mukhi === 0 && (
            <text
              x={cx}
              y={cy + beadR * 0.22}
              fontSize={beadR * 0.95}
              fontWeight={700}
              fill="color-mix(in srgb, var(--gold) 92%, transparent)"
              textAnchor="middle"
              className="font-devanagari"
              style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
            >
              ॐ
            </text>
          )}

          {/* Rim darkening — pushes the silhouette */}
          <circle cx={cx} cy={cy} r={beadR} fill={`url(#rim${uid})`} />

          {/* Specular highlight — elongated, top-left */}
          <ellipse
            cx={cx - beadR * 0.32}
            cy={cy - beadR * 0.42}
            rx={beadR * 0.32}
            ry={beadR * 0.16}
            fill={`url(#spec${uid})`}
            transform={`rotate(-32 ${cx - beadR * 0.32} ${cy - beadR * 0.42})`}
          />
        </svg>
        )}
      </button>
    </div>
  );
});
