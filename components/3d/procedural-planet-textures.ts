import * as THREE from "three";
import type { PlanetVisual } from "./planet-registry";

/**
 * Deterministic pseudo-random generator so textures look identical every render
 * (and across SSR/CSR) instead of flickering. Date.now()/Math.random() avoided.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PlanetTextures {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

const SIZE = 1024; // 2:1 not needed for our look; square wraps fine for craters

/** Draw the cratered (moon / rocky) surface. */
function drawCratered(
  ctx: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  v: PlanetVisual,
  rand: () => number
) {
  // Base fill
  ctx.fillStyle = v.base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  bump.fillStyle = "#808080"; // neutral height
  bump.fillRect(0, 0, SIZE, SIZE);

  // Maria — large soft dark patches
  const maria = 5;
  for (let i = 0; i < maria; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = SIZE * (0.12 + rand() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(v.shadow, 0.4));
    g.addColorStop(1, withAlpha(v.shadow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters — dark bowl + light rim, plus bump relief
  const craters = 220;
  for (let i = 0; i < craters; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = SIZE * (0.004 + rand() * 0.035);

    // color: dark interior
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(v.shadow, 0.55));
    g.addColorStop(0.7, withAlpha(v.shadow, 0.25));
    g.addColorStop(0.85, withAlpha(v.highlight, 0.35)); // lit rim
    g.addColorStop(1, withAlpha(v.shadow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // bump: depression with raised rim
    const bg = bump.createRadialGradient(x, y, 0, x, y, r);
    bg.addColorStop(0, "#4a4a4a");
    bg.addColorStop(0.75, "#6e6e6e");
    bg.addColorStop(0.9, "#bcbcbc");
    bg.addColorStop(1, "#808080");
    bump.fillStyle = bg;
    bump.beginPath();
    bump.arc(x, y, r, 0, Math.PI * 2);
    bump.fill();
  }

  addNoise(ctx, rand, 0.05);
}

/** Draw banded gas-giant style. */
function drawGaseous(
  ctx: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  v: PlanetVisual,
  rand: () => number
) {
  ctx.fillStyle = v.base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  bump.fillStyle = "#808080";
  bump.fillRect(0, 0, SIZE, SIZE);

  let y = 0;
  while (y < SIZE) {
    const h = SIZE * (0.02 + rand() * 0.06);
    const t = rand();
    const col =
      t < 0.4 ? v.shadow : t < 0.7 ? v.base : v.highlight;
    ctx.fillStyle = withAlpha(col, 0.5 + rand() * 0.4);
    ctx.fillRect(0, y, SIZE, h + 2);
    y += h;
  }
  // subtle swirl
  for (let i = 0; i < 40; i++) {
    const x = rand() * SIZE;
    const yy = rand() * SIZE;
    const r = SIZE * (0.02 + rand() * 0.05);
    const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
    g.addColorStop(0, withAlpha(v.highlight, 0.25));
    g.addColorStop(1, withAlpha(v.highlight, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, yy, r * 1.6, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  addNoise(ctx, rand, 0.03);
}

/** Draw turbulent fiery (sun) style. */
function drawFiery(
  ctx: CanvasRenderingContext2D,
  bump: CanvasRenderingContext2D,
  v: PlanetVisual,
  rand: () => number
) {
  ctx.fillStyle = v.base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  bump.fillStyle = "#808080";
  bump.fillRect(0, 0, SIZE, SIZE);

  for (let i = 0; i < 400; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = SIZE * (0.01 + rand() * 0.06);
    const t = rand();
    const col = t < 0.5 ? v.shadow : v.highlight;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(col, 0.5));
    g.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  addNoise(ctx, rand, 0.06);
}

function addNoise(ctx: CanvasRenderingContext2D, rand: () => number, amt: number) {
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 255 * amt;
    d[i] = clamp(d[i] + n);
    d[i + 1] = clamp(d[i + 1] + n);
    d[i + 2] = clamp(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

function clamp(x: number) {
  return x < 0 ? 0 : x > 255 ? 255 : x;
}

/** Convert a #rrggbb hex to rgba() with the given alpha. */
function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Saturn-style ring texture: a 1px-tall horizontal strip where x = radial
 * distance (inner → outer). Color + alpha vary across bands with a couple of
 * darker gaps (Cassini-like). Mapped onto a ring whose U coord we remap to radius.
 */
export function createRingTexture(v: PlanetVisual): THREE.CanvasTexture {
  const W = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32((SEEDS[v.id] ?? 1234) + 99);

  const img = ctx.createImageData(W, 1);
  const d = img.data;

  const base = hexToRgb(v.base);
  const shadow = hexToRgb(v.shadow);
  const highlight = hexToRgb(v.highlight);

  // Two prominent gaps (transparent) across the ring span.
  const gaps = [0.22, 0.58];

  for (let x = 0; x < W; x++) {
    const t = x / W; // 0 = inner edge, 1 = outer edge
    // banding: alternating brightness
    const band = 0.5 + 0.5 * Math.sin(t * 60 + rand() * 0.4);
    let alpha = 0.85;

    // inner/outer soft fade
    alpha *= Math.min(1, t / 0.06) * Math.min(1, (1 - t) / 0.08);

    // gaps
    for (const g of gaps) {
      const dist = Math.abs(t - g);
      if (dist < 0.025) alpha *= dist / 0.025;
    }

    // pick a tone per band
    const tone =
      band > 0.66 ? highlight : band > 0.33 ? base : shadow;
    const j = x * 4;
    d[j] = tone.r;
    d[j + 1] = tone.g;
    d[j + 2] = tone.b;
    d[j + 3] = Math.round(clamp(alpha * 255));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const SEEDS: Record<string, number> = {
  moon: 1337,
  sun: 700,
  mercury: 88,
  venus: 412,
  mars: 909,
  jupiter: 5150,
  saturn: 3030,
  rahu: 6006,
  ketu: 2002,
};

/** Build (and the caller should cache) the color + bump textures for a planet. */
export function createPlanetTextures(v: PlanetVisual): PlanetTextures {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = bumpCanvas.height = SIZE;
  const bump = bumpCanvas.getContext("2d")!;

  const rand = mulberry32(SEEDS[v.id] ?? 1234);

  if (v.texture === "gaseous") drawGaseous(ctx, bump, v, rand);
  else if (v.texture === "fiery") drawFiery(ctx, bump, v, rand);
  else drawCratered(ctx, bump, v, rand);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);

  return { map, bumpMap };
}
