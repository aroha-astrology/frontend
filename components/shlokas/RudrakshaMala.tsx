"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RudrakshaBead, type RudrakshaBeadRef } from "./RudrakshaBead";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * The 108-bead-style mala ring — reproduces the reference mockup's mala
 * screen exactly (see the plan's "middle part" scope). Renders as ONE
 * `<svg viewBox>` so it scales natively at any container width with zero
 * resize-observer/JS-measurement machinery — the same responsive idiom
 * already used by components/vastu/CompassRing.tsx and
 * components/ui/NorthIndianChart.tsx in this codebase. RudrakshaBead can't
 * be a native SVG child (it's a div/button/svg tree, ported as-is from
 * apps/api rather than rewritten), so it's embedded via `<foreignObject>` —
 * the standard bridge for HTML-in-scalable-SVG, and it scales along with
 * everything else in the same viewBox transform.
 *
 * Ring = position in the 50-verse library, NOT repetitions of one verse
 * (that's what JapCounter used to do, and it's gone — see the shlokas
 * redesign plan for why). Tapping the one glowing bead advances to the next
 * mantra; the highlight walks the 27-bead ring twice over 50 mantras.
 */

const RING_BEADS = 27;
const SLOTS = RING_BEADS + 1; // +1 for the guru bead, evenly spaced with the rest
const BEAD_MUKHI = 5; // the common commercially-available rudraksha grade

const VB = 360;
const CX = 180;
const CY = 176;
const RX = 134;
const RY = 122;
const BEAD_SIZE = 30;
const ACTIVE_BEAD_SIZE = 42;
const GURU_SIZE = 48;
const SPACER_R = 3.2;

function pt(bearingDeg: number, rx: number, ry: number) {
  const rad = (bearingDeg * Math.PI) / 180;
  return { x: CX + rx * Math.sin(rad), y: CY - ry * Math.cos(rad) };
}
const slotBearing = (i: number) => (i * 360) / SLOTS;

interface Props {
  /** Total mantras in the library — the counter reads against this, not RING_BEADS. */
  total: number;
  /** 0-based position in the full library. */
  currentIndex: number;
  onTap: () => void;
}

export default function RudrakshaMala({ total, currentIndex, onTap }: Props) {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const activeBeadRef = useRef<RudrakshaBeadRef>(null);
  const activeSlot = currentIndex % RING_BEADS;

  // Tap flash on the bead that just became active, mirroring the reference
  // choreography (scale up, then settle). Skipped under reduced motion.
  useEffect(() => {
    if (reducedMotion) return;
    activeBeadRef.current?.pulse();
  }, [currentIndex, reducedMotion]);

  function handleTap() {
    navigator.vibrate?.(20);
    onTap();
  }

  const guruPt = pt(slotBearing(0), RX, RY);
  const activePt = pt(slotBearing(activeSlot + 1), RX, RY);

  const beads = [];
  const spacers = [];
  for (let k = 0; k < RING_BEADS; k++) {
    const isActive = k === activeSlot;
    const p = pt(slotBearing(k + 1), RX, RY);
    const size = isActive ? ACTIVE_BEAD_SIZE : BEAD_SIZE;
    beads.push(
      <foreignObject
        key={`bead-${k}`}
        x={p.x - size / 2}
        y={p.y - size / 2}
        width={size}
        height={size}
        style={{ overflow: "visible" }}
        aria-hidden={!isActive}
      >
        <RudrakshaBead
          ref={isActive ? activeBeadRef : undefined}
          mukhi={BEAD_MUKHI}
          size={size}
          locked={!isActive}
          onTap={isActive ? handleTap : () => {}}
          hideShadow={!isActive}
          hideHalo={!isActive || reducedMotion}
          hitPadding={isActive ? 12 : 0}
          ariaLabel={isActive ? t("shlokas.tapRudraksha") : undefined}
        />
      </foreignObject>,
    );
  }
  for (let i = 0; i < SLOTS; i++) {
    const p = pt(slotBearing(i) + 360 / SLOTS / 2, RX, RY);
    spacers.push(<circle key={`sp-${i}`} cx={p.x} cy={p.y} r={SPACER_R} fill="var(--gold)" opacity={0.85} />);
  }

  // Curved arrow from just under the center text toward the active bead —
  // a short quadratic bow, bulging away from the ring center for a natural
  // hand-drawn feel rather than a straight line.
  const arrowStart = { x: CX, y: CY + 40 };
  const arrowBulge = { x: (arrowStart.x + activePt.x) / 2, y: (arrowStart.y + activePt.y) / 2 + 16 };
  const pullBack = 16;
  const dx = activePt.x - arrowBulge.x;
  const dy = activePt.y - arrowBulge.y;
  const dist = Math.hypot(dx, dy) || 1;
  const arrowEnd = { x: activePt.x - (dx / dist) * pullBack, y: activePt.y - (dy / dist) * pullBack };

  return (
    <div className="relative w-full max-w-[360px] mx-auto aspect-square">
      <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full overflow-visible">
        <defs>
          <marker id="malaArrowHead" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--gold)" />
          </marker>
        </defs>

        {/* Thread */}
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="var(--mala-thread)" strokeWidth={1.2} opacity={0.6} />

        {spacers}
        {beads}

        {/* Guru bead assembly — decorative, not one of the 27 counted beads */}
        <g aria-hidden="true">
          {[-8, -3, 3, 8].map((dx2) => (
            <path
              key={dx2}
              d={`M ${guruPt.x} ${guruPt.y + GURU_SIZE * 0.34} Q ${guruPt.x + dx2} ${guruPt.y + GURU_SIZE * 0.6} ${guruPt.x + dx2 * 1.4} ${guruPt.y + GURU_SIZE * 0.85}`}
              stroke="var(--gold)"
              strokeWidth={1.4}
              fill="none"
              opacity={0.75}
              strokeLinecap="round"
            />
          ))}
          <ellipse cx={guruPt.x} cy={guruPt.y + GURU_SIZE * 0.24} rx={9} ry={4} fill="var(--gold)" />
          <circle cx={guruPt.x} cy={guruPt.y + GURU_SIZE * 0.34} r={7} fill="#7a1f1f" />
        </g>
        <foreignObject
          x={guruPt.x - GURU_SIZE / 2}
          y={guruPt.y - GURU_SIZE / 2}
          width={GURU_SIZE}
          height={GURU_SIZE}
          style={{ overflow: "visible" }}
        >
          <div aria-hidden="true">
            <RudrakshaBead mukhi={0} size={GURU_SIZE} locked onTap={() => {}} hideHalo />
          </div>
        </foreignObject>

        {!reducedMotion && (
          <path
            d={`M ${arrowStart.x} ${arrowStart.y} Q ${arrowBulge.x} ${arrowBulge.y} ${arrowEnd.x} ${arrowEnd.y}`}
            stroke="var(--gold)"
            strokeWidth={1.6}
            fill="none"
            opacity={0.75}
            strokeLinecap="round"
            markerEnd="url(#malaArrowHead)"
          />
        )}

        {/* Center content */}
        <foreignObject x={CX - 100} y={CY - 68} width={200} height={136}>
          <div className="w-full h-full flex flex-col items-center justify-center text-center gap-1.5 select-none">
            <span className="font-devanagari text-3xl text-foreground/90 leading-none">ॐ</span>
            <p className="text-[11px] text-muted leading-tight px-3">{t("shlokas.tapRudraksha")}</p>
            <div className="mt-0.5 px-3 py-1 rounded-full border border-gold/30 bg-card/85 text-xs font-semibold text-gold tabular-nums">
              {currentIndex + 1} / {total}
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
