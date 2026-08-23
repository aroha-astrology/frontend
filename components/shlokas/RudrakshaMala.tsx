"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RudrakshaBead, type RudrakshaBeadRef } from "./RudrakshaBead";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * The bead-ring mala. Renders as ONE `<svg viewBox>` so it scales natively
 * at any container width with zero resize-observer/JS-measurement machinery
 * — the same responsive idiom already used by components/vastu/CompassRing
 * and components/ui/NorthIndianChart in this codebase. RudrakshaBead can't
 * be a native SVG child (it's a div/button/svg tree, ported as-is from
 * apps/api rather than rewritten), so it's embedded via `<foreignObject>` —
 * the standard bridge for HTML-in-scalable-SVG, and it scales along with
 * everything else in the same viewBox transform.
 *
 * Every bead is a normal, equally-styled, counted position — there is no
 * separate decorative guru bead. `total` is the traditional 108-count (see
 * MALA_COUNT in lib/shlokas.ts), not the 50-verse library size — the caller
 * cycles through the library's distinct verses to fill it, not repetitions
 * of one verse (that's what the old JapCounter did, and it's still gone).
 * The highlight walks the ring ~3.9 times over a full 108-count round.
 */

const RING_BEADS = 28;
const BEAD_MUKHI = 5; // the common commercially-available rudraksha grade

const VB = 360;
const CX = 180;
const CY = 176;
const RX = 124;
const RY = 114;
const BEAD_SIZE = 30;
const ACTIVE_BEAD_SIZE = 42;
const SPACER_R = 3.2;

function pt(bearingDeg: number, rx: number, ry: number) {
  const rad = (bearingDeg * Math.PI) / 180;
  return { x: CX + rx * Math.sin(rad), y: CY - ry * Math.cos(rad) };
}
const slotBearing = (i: number) => (i * 360) / RING_BEADS;

interface Props {
  /** Total mantras in the library — the counter reads against this, not RING_BEADS. */
  total: number;
  /** 0-based position in the full library. */
  currentIndex: number;
  onTap: () => void;
  /** True while the active bead's mantra audio is playing — the bead can't be tapped again until it finishes. */
  locked: boolean;
  /** Current mantra's first line — shown as a subtitle in place of the tap hint while `locked` (audio playing). */
  mantraSnippet: string;
}

export default function RudrakshaMala({ total, currentIndex, onTap, locked, mantraSnippet }: Props) {
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

  // `foreignObject` clips its content to its own box — `overflow: visible` on
  // it is not honoured across engines — so the active bead, which alone draws
  // a halo bloom (r = 0.85 * size) and pulses to scale 1.1, gets its glow
  // squared off unless its box is padded out. Only it needs the padding: the
  // rest render hideHalo/hideShadow and never scale, so they fit `size`
  // exactly. It is also appended last, so the padded box paints over its
  // neighbours instead of under them; the padding itself is
  // `pointer-events-none` so it can't swallow taps meant for the bead.
  const ACTIVE_PAD = 25;

  const beads = [];
  const spacers = [];
  for (let k = 0; k < RING_BEADS; k++) {
    if (k === activeSlot) continue;
    const p = pt(slotBearing(k), RX, RY);
    beads.push(
      <foreignObject key={`bead-${k}`} x={p.x - BEAD_SIZE / 2} y={p.y - BEAD_SIZE / 2} width={BEAD_SIZE} height={BEAD_SIZE} aria-hidden>
        <RudrakshaBead mukhi={BEAD_MUKHI} size={BEAD_SIZE} locked onTap={() => {}} hideShadow hideHalo />
      </foreignObject>,
    );
  }

  const ap = pt(slotBearing(activeSlot), RX, RY);
  const activeBox = ACTIVE_BEAD_SIZE + ACTIVE_PAD * 2;
  beads.push(
    <foreignObject
      key="bead-active"
      x={ap.x - activeBox / 2}
      y={ap.y - activeBox / 2}
      width={activeBox}
      height={activeBox}
    >
      <div className="w-full h-full flex items-center justify-center pointer-events-none [&>*]:pointer-events-auto">
        <RudrakshaBead
          ref={activeBeadRef}
          mukhi={BEAD_MUKHI}
          size={ACTIVE_BEAD_SIZE}
          locked={locked}
          onTap={onTap}
          hideHalo={reducedMotion}
          hitPadding={12}
          ariaLabel={t("shlokas.tapRudraksha")}
        />
      </div>
    </foreignObject>,
  );
  for (let i = 0; i < RING_BEADS; i++) {
    const p = pt(slotBearing(i) + 360 / RING_BEADS / 2, RX, RY);
    spacers.push(<circle key={`sp-${i}`} cx={p.x} cy={p.y} r={SPACER_R} fill="var(--gold)" opacity={0.85} />);
  }

  return (
    <div className="relative w-full max-w-[360px] mx-auto aspect-square">
      <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full overflow-visible">
        {/* Thread */}
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="var(--mala-thread)" strokeWidth={1.2} opacity={0.6} />

        {spacers}
        {beads}

        {/* Center content */}
        <foreignObject x={CX - 100} y={CY - 68} width={200} height={136}>
          <div className="w-full h-full flex flex-col items-center justify-center text-center gap-1.5 select-none">
            <span className="font-devanagari text-3xl text-foreground/90 leading-none">ॐ</span>
            {locked ? (
              <p className="font-devanagari text-sm text-foreground/90 leading-tight px-3 max-w-full truncate">
                {mantraSnippet}
              </p>
            ) : (
              <p className="text-[11px] text-muted leading-tight px-3">{t("shlokas.tapRudraksha")}</p>
            )}
            <div className="mt-0.5 px-3 py-1 rounded-full border border-gold/30 bg-card/85 text-xs font-semibold text-gold tabular-nums">
              {currentIndex + 1} / {total}
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
