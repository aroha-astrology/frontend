import { describe, expect, it } from "vitest";
import { fitTraceToPlot, traceStorageKey, type TraceBBox } from "./trace";

const box = (minX: number, minY: number, w: number, h: number): TraceBBox => ({ minX, minY, maxX: minX + w, maxY: minY + h, w, h });

describe("fitTraceToPlot", () => {
  it("centres the image on the plot bbox", () => {
    const b = box(2, 3, 12, 8);
    const f = fitTraceToPlot(1600, 900, b);
    expect(f.x + (1600 * f.scale) / 2).toBeCloseTo(2 + 6);
    expect(f.y + (900 * f.scale) / 2).toBeCloseTo(3 + 4);
  });

  it("covers the whole bbox, including its larger side", () => {
    for (const [iw, ih, w, h] of [
      [1600, 900, 12, 8],
      [900, 1600, 12, 8],
      [1000, 1000, 10, 20],
      [400, 1200, 30, 6],
    ]) {
      const b = box(0, 0, w, h);
      const f = fitTraceToPlot(iw, ih, b);
      expect(iw * f.scale).toBeGreaterThanOrEqual(w - 1e-9);
      expect(ih * f.scale).toBeGreaterThanOrEqual(h - 1e-9);
      expect(f.x).toBeLessThanOrEqual(1e-9);
      expect(f.y).toBeLessThanOrEqual(1e-9);
      expect(f.x + iw * f.scale).toBeGreaterThanOrEqual(w - 1e-9);
      expect(f.y + ih * f.scale).toBeGreaterThanOrEqual(h - 1e-9);
      // tight: one axis matches exactly
      expect(Math.min(iw * f.scale - w, ih * f.scale - h)).toBeCloseTo(0);
    }
  });

  it("square image on a 12x12 plot maps 1:1 onto it", () => {
    const f = fitTraceToPlot(1200, 1200, box(0, 0, 12, 12));
    expect(f).toEqual({ x: 0, y: 0, scale: 0.01 });
  });

  it("survives degenerate sizes", () => {
    const f = fitTraceToPlot(0, 0, box(0, 0, 0, 0));
    expect(Number.isFinite(f.scale) && f.scale > 0).toBe(true);
    expect(Number.isFinite(f.x) && Number.isFinite(f.y)).toBe(true);
  });
});

describe("traceStorageKey", () => {
  it("formats scope and home id", () => {
    expect(traceStorageKey("u1:p1", "home42")).toBe("vastu_trace:u1:p1:home42");
  });
  it("uses 'draft' when there is no home id", () => {
    expect(traceStorageKey("u1:p1", null)).toBe("vastu_trace:u1:p1:draft");
  });
});
