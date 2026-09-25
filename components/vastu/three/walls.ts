// Splits one straight wall into pieces around its openings. Pure, no three.js.
// Doors leave a full-height gap (walls are cut below door-head height);
// windows leave a sill with glass above it.

export interface Opening {
  /** Distance of the opening's centre from the wall's start. */
  at: number;
  width: number;
  kind: "door" | "window";
}

export interface WallPiece {
  from: number;
  to: number;
  y0: number;
  y1: number;
  kind: "solid" | "glass";
}

export const SILL = 0.45;

export function wallPieces(len: number, height: number, openings: Opening[]): WallPiece[] {
  const spans = openings
    .map((o) => ({ from: Math.max(0, o.at - o.width / 2), to: Math.min(len, o.at + o.width / 2), kind: o.kind }))
    .filter((o) => o.to - o.from > 0.05)
    .sort((a, b) => a.from - b.from);
  const out: WallPiece[] = [];
  let cursor = 0;
  for (const s of spans) {
    const from = Math.max(s.from, cursor);
    if (from > cursor + 1e-3) out.push({ from: cursor, to: from, y0: 0, y1: height, kind: "solid" });
    if (s.to > from) {
      if (s.kind === "window") {
        out.push({ from, to: s.to, y0: 0, y1: Math.min(SILL, height), kind: "solid" });
        if (height > SILL) out.push({ from, to: s.to, y0: SILL, y1: height, kind: "glass" });
      }
      cursor = Math.max(cursor, s.to);
    }
  }
  if (len > cursor + 1e-3) out.push({ from: cursor, to: len, y0: 0, y1: height, kind: "solid" });
  return out;
}
