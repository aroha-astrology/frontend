"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * The cover (owner's image, 1696 x 2528, docs/varshik-classical-completeness.md "PDF cover"). The words baked into the
 * picture stay English in every language. The reader's name is written on the dashed "Prepared for" line as SVG text:
 * a vertical gold gradient sampled from the lettering (top #F2DB97, middle #E7C897, bottom #D5B790) and a soft dark
 * shadow. SVG fill, never CSS background-clip:text, so the PDF capture keeps it.
 */
const W = 1696;
const H = 2528;
/** The dashes run at y 2227 from x 691 to 1468; the name starts at x 700 and never crosses 1468. */
const LINE = { x0: 700, x1: 1468, baseline: 2216 };
/** Cap height of the "P" of "Prepared" is about 75 px. Alex Brush has a cap height of about 0.58 em. */
const BASE_SIZE = 128;
const MIN_SIZE = 56;
/** The Noto Serif faces run larger than the script face at the same size. */
const INDIC_SIZE = 100;

/** The edge colour of the picture, top to bottom, so the A4 side gaps blend into it. */
const EDGE_STOPS: [number, string][] = [
  [0, "#0a172a"], [6, "#111f30"], [12, "#0e273a"], [19, "#102d40"], [25, "#182b44"], [31, "#3d3a65"], [38, "#4b446f"],
  [44, "#303b5e"], [50, "#294c69"], [56, "#3e627a"], [62, "#6f6c81"], [69, "#756357"], [75, "#8f7761"], [81, "#1b2c39"],
  [88, "#131d2c"], [94, "#091020"], [100, "#090f1f"],
];

/** A script that the script font has no glyphs for falls back to the matching Noto Serif, still in gold. */
function familyFor(name: string): string {
  const serif = "var(--font-vk-serif), Georgia, serif";
  if (/[ऀ-ॿ]/.test(name)) return `var(--font-vk-deva), ${serif}`;
  if (/[ঀ-৿]/.test(name)) return `var(--font-vk-bn), ${serif}`;
  if (/[஀-௿]/.test(name)) return `var(--font-vk-ta), ${serif}`;
  if (/[ఀ-౿]/.test(name)) return `var(--font-vk-te), ${serif}`;
  if (/[ಀ-೿]/.test(name)) return `var(--font-vk-kn), ${serif}`;
  if (/[઀-૿]/.test(name)) return `var(--font-vk-gu), ${serif}`;
  return `var(--font-vk-script), "Alex Brush", ${serif}`;
}

export default function VarshikCover({
  name,
  src = "/varshphal/cover.webp",
  a4 = false,
  writeOn = false,
  className,
}: {
  name: string | null;
  src?: string;
  /** Fit the picture to an A4 page: scaled to the page height, centred, the side gaps filled with the picture's own edge colour. */
  a4?: boolean;
  /** The in-app ready moment: the name writes itself a letter at a time (whole letters, so Indic conjuncts never split). Off for the PDF. */
  writeOn?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<SVGTextElement>(null);
  const [size, setSize] = useState(BASE_SIZE);
  const text = (name ?? "").trim();
  const family = familyFor(text);
  const reduce = useReducedMotion();
  const letters = (() => {
    try {
      return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (x) => x.segment);
    } catch {
      return Array.from(text);
    }
  })();
  const [shown, setShown] = useState(writeOn && !reduce ? 0 : letters.length);
  useEffect(() => {
    if (!writeOn || reduce) {
      setShown(letters.length);
      return;
    }
    setShown(0);
    const id = setInterval(() => setShown((n) => (n >= letters.length ? (clearInterval(id), n) : n + 1)), 90);
    return () => clearInterval(id);
  }, [text, writeOn, reduce, letters.length]);
  const latin = family.includes("--font-vk-script");

  // Shrink to fit the line: never wrap, never cross x 1468.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !text) return;
    const measure = () => {
      const base = family.includes("--font-vk-script") ? BASE_SIZE : INDIC_SIZE;
      el.setAttribute("font-size", String(base));
      const w = el.getComputedTextLength();
      const room = LINE.x1 - LINE.x0;
      setSize(w > room ? Math.max(MIN_SIZE, Math.floor((base * room) / w)) : base);
    };
    measure();
    // Fonts arrive after first paint: measure again when they are ready.
    void document.fonts?.ready.then(measure);
  }, [text, family]);

  const svg = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-full w-full"
      role="img"
      aria-label={text ? `Varshik Rashifal, prepared for ${text}` : "Varshik Rashifal"}
      data-testid="varshik-cover"
    >
      <defs>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2DB97" />
          <stop offset="0.5" stopColor="#E7C897" />
          <stop offset="1" stopColor="#D5B790" />
        </linearGradient>
        <filter id={`${uid}s`} x="-10%" y="-30%" width="120%" height="170%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>
      <image href={src} width={W} height={H} />
      {text ? (
        <text ref={ref} x={LINE.x0} y={LINE.baseline} fontSize={size} opacity={0} aria-hidden="true" style={{ fontFamily: family }}>
          {text}
        </text>
      ) : null}
      {text ? (
        <text
          x={LINE.x0}
          y={LINE.baseline}
          fontSize={size}
          fill={`url(#${uid}g)`}
          filter={`url(#${uid}s)`}
          style={{ fontFamily: family, fontWeight: latin ? 400 : 600 }}
        >
          {letters.slice(0, shown).join("")}
        </text>
      ) : null}
    </svg>
  );

  if (!a4) return <div className={className}>{svg}</div>;
  return (
    <div
      className={className}
      style={{
        aspectRatio: "210 / 297",
        display: "flex",
        justifyContent: "center",
        background: `linear-gradient(to bottom, ${EDGE_STOPS.map(([p, c]) => `${c} ${p}%`).join(", ")})`,
      }}
    >
      <div style={{ height: "100%", aspectRatio: `${W} / ${H}` }}>{svg}</div>
    </div>
  );
}
