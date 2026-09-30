"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Check } from "lucide-react";
import type { PalmEvent, PalmKundliMatch } from "@/lib/palm-api";
import { ImageSaver } from "@/lib/yantra-api";
import { isNativeAndroid } from "@/lib/play-billing";

/**
 * The palm photograph with its line map and dated life events drawn on it.
 *
 * The overlay was pulled on 2026-08-23 because the traced lines ran nowhere near the real
 * creases. It is back because the backend now (a) snaps every traced path onto the crease it was
 * traced from and (b) withholds any line that does not sit on a crease (`trace.drawable`, see the
 * backend's lib/palm/crease-snap.ts). This component draws ONLY lines that passed that gate — a
 * line with no verdict (an older reading) or a failed one is never drawn.
 *
 * Coordinates are 0-1 of the whole photograph. The photo is letterboxed (object-contain) inside a
 * box of its own aspect ratio, and the SVG uses the same aspect, so a point lands on the pixel it
 * was traced from whatever the shot's shape.
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

const LINE_COLOR: Record<string, string> = {
  heartLine: "#FF4D6D",
  headLine: "#2EE59D",
  lifeLine: "#B983FF",
  fateLine: "#FFD166",
  sunLine: "#FF9F1C",
  healthLine: "#3FD0C9",
  girdleOfVenus: "#FF9ECD",
  ringOfSolomon: "#FFB067",
  simianLine: "#FF6B35",
};

interface DrawnLine {
  polyline?: Array<[number, number]>;
  trace?: { drawable?: boolean };
}

type Pt = [number, number];

const VB_W = 100;
const CARD_W = 35;
const CARD_H = 12.5;
const EDGE = 2;
const BAND = 7; // brand strip at the bottom

interface CardLayout {
  event: PalmEvent;
  side: "l" | "r";
  y: number;
  anchor: Pt | null;
}

/** Cards sit in the two outer columns, near the height of the thing they point at; overlaps in a
 * column are pushed apart so no two cards collide. */
function layoutCards(events: PalmEvent[], vbH: number): CardLayout[] {
  const cards: CardLayout[] = events.map((event, i) => {
    const anchor: Pt | null = event.anchor ? [event.anchor[0] * VB_W, event.anchor[1] * vbH] : null;
    const side: "l" | "r" = anchor ? (anchor[0] < VB_W / 2 ? "l" : "r") : i % 2 === 0 ? "l" : "r";
    const y = anchor ? anchor[1] - CARD_H / 2 : vbH - BAND - (Math.floor(i / 2) + 1) * (CARD_H + 2);
    return { event, side, y, anchor };
  });
  const maxY = vbH - BAND - CARD_H - 2;
  for (const side of ["l", "r"] as const) {
    const col = cards.filter((c) => c.side === side).sort((a, b) => a.y - b.y);
    col.forEach((c, i) => {
      c.y = Math.max(EDGE, Math.min(maxY, c.y));
      if (i > 0) c.y = Math.max(c.y, col[i - 1]!.y + CARD_H + 1.5);
    });
    for (let i = col.length - 1; i >= 0; i--) {
      const limit = i === col.length - 1 ? maxY : col[i + 1]!.y - CARD_H - 1.5;
      col[i]!.y = Math.min(col[i]!.y, limit);
    }
  }
  return cards;
}

const toPath = (points: Pt[], vbH: number) =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${(x * VB_W).toFixed(2)} ${(y * vbH).toFixed(2)}`).join(" ");

export interface PalmAnnotatedViewProps {
  photoUrl: string | null;
  /** The primary hand's stored observations ({ majorLines }). */
  observations?: { majorLines?: Record<string, DrawnLine> } | null;
  events?: PalmEvent[];
  /** Ages are drawn only for a paid reading; a scan-only reading shows locked cards. */
  unlocked?: boolean;
  kundliMatch?: PalmKundliMatch | null;
}

export default function PalmAnnotatedView({
  photoUrl,
  observations,
  events = [],
  unlocked = false,
  kundliMatch = null,
}: PalmAnnotatedViewProps) {
  const { t } = useTranslation();
  const [aspect, setAspect] = useState<number | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const ratio = aspect ?? 4 / 5;
  const vbH = VB_W / ratio;

  const lines = useMemo(() => {
    const major = observations?.majorLines;
    if (!major) return [];
    return LINE_ORDER.filter((key) => {
      const line = major[key];
      return line?.trace?.drawable === true && (line.polyline?.length ?? 0) >= 2;
    }).map((key) => ({ key, points: major[key]!.polyline! }));
  }, [observations]);

  const cards = useMemo(() => layoutCards(events, vbH), [events, vbH]);

  const sourceLabel = (source: string) =>
    source === "marriageLine" || source === "childrenLine"
      ? t(`palm.map.${source}`)
      : t(`palm.line.${source}`);

  const ageText = (e: PalmEvent) =>
    !unlocked || e.locked || e.ages.length === 0
      ? t("palm.map.lockedAge")
      : t("palm.map.age", { age: e.ages.map((a) => a.age).join(" · ") });

  /** Photo + overlay flattened to one PNG data URL, at up to 1600 px on the long edge. */
  async function renderPng(): Promise<string> {
    const img = imgRef.current;
    const svg = svgRef.current;
    if (!img || !svg || !img.naturalWidth) throw new Error("not ready");
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const overlay = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("overlay failed"));
        i.src = url;
      });
      ctx.drawImage(overlay, 0, 0, w, h);
    } finally {
      URL.revokeObjectURL(url);
    }
    return canvas.toDataURL("image/png");
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const png = await renderPng();
      const fileName = "aroha-palm-reading.png";
      if (await isNativeAndroid()) {
        try {
          await ImageSaver.savePng({ base64: png, fileName });
          setSaved(true);
          return;
        } catch {
          window.open(png, "_blank");
          return;
        }
      }
      const a = document.createElement("a");
      a.href = png;
      a.download = fileName;
      a.click();
      setSaved(true);
    } catch {
      // Saving is a convenience; the reading itself is unaffected.
    } finally {
      setSaving(false);
    }
  }

  const showOverlay = photoUrl !== null && imgSize !== null;

  return (
    <div className="space-y-2">
      <div
        className="relative w-full rounded-3xl overflow-hidden border border-gold/20 bg-black"
        style={{ aspectRatio: ratio }}
      >
        {photoUrl ? (
          // object-contain, not object-cover: the overlay is traced against the WHOLE frame.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={photoUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setAspect(img.naturalWidth / img.naturalHeight);
                setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-surface" />
        )}

        {showOverlay && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', sans-serif"
          >
            {lines.map(({ key, points }) => {
              const end = points[points.length - 1]!;
              const onRight = end[0] > 0.6;
              return (
                <g key={key}>
                  <path
                    d={toPath(points, vbH)}
                    fill="none"
                    stroke="#000"
                    strokeOpacity={0.5}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={toPath(points, vbH)}
                    fill="none"
                    stroke={LINE_COLOR[key] ?? "#D4AF37"}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <text
                    x={end[0] * VB_W + (onRight ? -1.2 : 1.2)}
                    y={end[1] * vbH - 1.2}
                    textAnchor={onRight ? "end" : "start"}
                    fontSize={2.6}
                    fontWeight={700}
                    fill={LINE_COLOR[key] ?? "#D4AF37"}
                    stroke="#000"
                    strokeWidth={0.5}
                    paintOrder="stroke"
                  >
                    {t(`palm.line.${key}`)}
                  </text>
                </g>
              );
            })}

            {cards.map(({ event, side, y, anchor }) => {
              const x = side === "l" ? EDGE : VB_W - EDGE - CARD_W;
              const edgeX = side === "l" ? x + CARD_W : x;
              return (
                <g key={event.kind}>
                  {anchor && (
                    <>
                      <line
                        x1={edgeX}
                        y1={y + CARD_H / 2}
                        x2={anchor[0]}
                        y2={anchor[1]}
                        stroke="#000"
                        strokeOpacity={0.5}
                        strokeWidth={0.9}
                      />
                      <line
                        x1={edgeX}
                        y1={y + CARD_H / 2}
                        x2={anchor[0]}
                        y2={anchor[1]}
                        stroke="#fff"
                        strokeWidth={0.35}
                      />
                      <circle cx={anchor[0]} cy={anchor[1]} r={1.1} fill="#fff" stroke="#000" strokeWidth={0.3} />
                    </>
                  )}
                  <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={1.6} fill="#0B0B12" fillOpacity={0.82} stroke="#D4AF37" strokeOpacity={0.55} strokeWidth={0.25} />
                  <text x={x + 2} y={y + 3.6} fontSize={2.1} fontWeight={700} fill="#D4AF37" letterSpacing={0.15}>
                    {t(`palm.map.${event.kind}`).toUpperCase()}
                  </text>
                  <text x={x + 2} y={y + 8} fontSize={unlocked && !event.locked ? 3.9 : 3.3} fontWeight={800} fill="#fff">
                    {ageText(event)}
                  </text>
                  <text x={x + 2} y={y + 11} fontSize={1.9} fill="#C9C4B5">
                    {sourceLabel(event.source)}
                  </text>
                </g>
              );
            })}

            {kundliMatch && (
              <g>
                <rect x={EDGE} y={EDGE} width={40} height={6.2} rx={3.1} fill="#0B0B12" fillOpacity={0.82} stroke="#2EE59D" strokeOpacity={0.7} strokeWidth={0.25} />
                <text x={EDGE + 3} y={EDGE + 4.2} fontSize={2.7} fontWeight={800} fill="#2EE59D">
                  {t("palm.map.kundliMatch", { percent: kundliMatch.percent })}
                </text>
              </g>
            )}

            <rect x={0} y={vbH - BAND} width={VB_W} height={BAND} fill="#0B0B12" fillOpacity={0.78} />
            <text x={VB_W / 2} y={vbH - BAND / 2 + 1} textAnchor="middle" fontSize={2.8} fontWeight={800} fill="#D4AF37" letterSpacing={0.2}>
              {t("palm.map.brand")}
            </text>
          </svg>
        )}
      </div>

      {showOverlay && (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gold/30 text-gold px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {saved ? <Check size={15} /> : <Download size={15} />}
          {saved ? t("palm.map.saved") : t("palm.map.save")}
        </button>
      )}
    </div>
  );
}
