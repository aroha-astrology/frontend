export interface Pt {
  x: number;
  y: number;
}

/**
 * A smooth curve through the points that never overshoots them (monotone cubic, Fritsch-Carlson),
 * so a score line never dips below 0 or rises above 100 between two months. Points must be sorted
 * by x. Returns an SVG path "d" string; "" for no points.
 */
export function monotonePath(pts: Pt[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;

  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = pts[i + 1].x - pts[i].x || 1e-6;
    d[i] = (pts[i + 1].y - pts[i].y) / h[i];
  }
  const m: number[] = new Array<number>(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }

  let out = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = pts[i].x;
    const y0 = pts[i].y;
    const x1 = pts[i + 1].x;
    const y1 = pts[i + 1].y;
    out +=
      ` C${(x0 + h[i] / 3).toFixed(2)},${(y0 + (m[i] * h[i]) / 3).toFixed(2)}` +
      ` ${(x1 - h[i] / 3).toFixed(2)},${(y1 - (m[i + 1] * h[i]) / 3).toFixed(2)}` +
      ` ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  return out;
}

/** The same curve closed down to `baseY`, for a filled area under the line. */
export function monotoneAreaPath(pts: Pt[], baseY: number): string {
  if (pts.length === 0) return "";
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${monotonePath(pts)} L${last.x.toFixed(2)},${baseY.toFixed(2)} L${first.x.toFixed(2)},${baseY.toFixed(2)} Z`;
}
