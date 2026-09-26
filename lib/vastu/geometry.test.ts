import { describe, expect, it } from "vitest";
import type { Plan, Room } from "./types";
import {
  bearingToDir8,
  fixtureFacing,
  pointInPolygon,
  polygonCentroid,
  polygonSelfIntersects,
  roomDirection,
  roomInsidePlot,
  roomsOverlap,
} from "./geometry";

const square = [
  { x: 0, y: 0 },
  { x: 12, y: 0 },
  { x: 12, y: 12 },
  { x: 0, y: 12 },
];
// An L: the top-right 6x6 quarter is cut away.
const lShape = [
  { x: 0, y: 0 },
  { x: 6, y: 0 },
  { x: 6, y: 6 },
  { x: 12, y: 6 },
  { x: 12, y: 12 },
  { x: 0, y: 12 },
];

const room = (x: number, y: number, w = 2, h = 2, type = "kitchen"): Room => ({ id: `${type}-${x}-${y}`, type, x, y, w, h, fixtures: [] });
const plan = (rooms: Room[], northOffsetDeg = 0, plot = square): Plan => ({ plot, northOffsetDeg, rooms });

describe("directions", () => {
  it("places a room by its centre relative to the plot centre (north up)", () => {
    expect(roomDirection(room(0, 0), plan([]))).toBe("NW");
    expect(roomDirection(room(10, 0), plan([]))).toBe("NE");
    expect(roomDirection(room(10, 10), plan([]))).toBe("SE");
    expect(roomDirection(room(0, 10), plan([]))).toBe("SW");
    expect(roomDirection(room(5, 0), plan([]))).toBe("N");
  });

  it("marks a room over the centre as Brahmasthan", () => {
    expect(roomDirection(room(5, 5), plan([]))).toBe("C");
  });

  it("rotating north re-rates every room", () => {
    // Screen-up points east: the top-right corner is really south-east.
    expect(roomDirection(room(10, 0), plan([], 90))).toBe("SE");
    expect(fixtureFacing("top", plan([], 90))).toBe("E");
    expect(fixtureFacing("left", plan([], 180))).toBe("E");
  });

  it("snaps bearings to the nearest of 8 directions", () => {
    expect(bearingToDir8(0)).toBe("N");
    expect(bearingToDir8(22)).toBe("N");
    expect(bearingToDir8(23)).toBe("NE");
    expect(bearingToDir8(359)).toBe("N");
    expect(bearingToDir8(-45)).toBe("NW");
  });

  it("uses the area-weighted centre of an irregular plot", () => {
    const c = polygonCentroid(lShape);
    // Mass sits lower-left of the bounding-box centre (6, 6).
    expect(c.x).toBeLessThan(6);
    expect(c.y).toBeGreaterThan(6);
  });
});

describe("containment", () => {
  it("point in polygon, boundary inclusive", () => {
    expect(pointInPolygon({ x: 3, y: 3 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 9, y: 3 }, lShape)).toBe(false);
    expect(pointInPolygon({ x: 6, y: 3 }, lShape)).toBe(true);
  });

  it("a room in the cut-away corner of an L is outside, though inside its bounding box", () => {
    expect(roomInsidePlot(room(8, 1), lShape)).toBe(false);
    expect(roomInsidePlot(room(1, 1), lShape)).toBe(true);
  });

  it("a room straddling the inner corner of an L is outside", () => {
    // All four corners avoid the notch, but the notch's corner (6,6) pokes in.
    expect(roomInsidePlot(room(5, 5, 2, 2), lShape)).toBe(false);
  });

  it("a room flush against the outline is inside", () => {
    expect(roomInsidePlot(room(0, 0, 12, 12), square)).toBe(true);
    expect(roomInsidePlot(room(6, 6, 6, 6), lShape)).toBe(true);
  });

  it("a room crossed by a thin notch is outside", () => {
    // A slot cut from the top edge down to y=10, between x=5 and x=7.
    const slotted = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 10 },
      { x: 7, y: 10 },
      { x: 7, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 12 },
      { x: 0, y: 12 },
    ];
    expect(roomInsidePlot(room(3, 2, 6, 2), slotted)).toBe(false);
  });
});

describe("overlap and outline", () => {
  it("rooms sharing only a wall do not overlap", () => {
    expect(roomsOverlap(room(0, 0), room(2, 0))).toBe(false);
    expect(roomsOverlap(room(0, 0), room(1, 1))).toBe(true);
  });

  it("detects a self-crossing outline", () => {
    expect(polygonSelfIntersects(square)).toBe(false);
    expect(polygonSelfIntersects(lShape)).toBe(false);
    const bowtie = [
      { x: 0, y: 0 },
      { x: 12, y: 12 },
      { x: 12, y: 0 },
      { x: 0, y: 12 },
    ];
    expect(polygonSelfIntersects(bowtie)).toBe(true);
  });
});
