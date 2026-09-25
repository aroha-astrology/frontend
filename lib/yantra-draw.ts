import type { YantraSpec } from "@/lib/yantra-api";

/**
 * Drawing the Digital Yantra from its spec — plain SVG strings, so the page
 * shows them inline and the same markup rasterises to a PNG for download.
 * The yantra follows the classical layout: a square enclosure with four
 * gates (bhupura), three circles, an eight-petal lotus, and the graha's
 * number square at the centre with a bindu.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The yantra itself, drawn in a `size`×`size` box (inner markup only, no <svg> wrapper). */
function yantraBody(spec: YantraSpec, size: number): string {
  const { primary, accent } = spec.colours;
  const c = size / 2;
  const stroke = Math.max(2, size / 220);
  const outer = size * 0.46;
  const gate = size * 0.09;

  // Bhupura: a square with a gate cut into the middle of each side.
  const s0 = c - outer;
  const s1 = c + outer;
  const g0 = c - gate;
  const g1 = c + gate;
  const bhupura = [
    `M${s0},${s0} L${g0},${s0} L${g0},${s0 - gate * 0.6} L${g1},${s0 - gate * 0.6} L${g1},${s0} L${s1},${s0}`,
    `L${s1},${g0} L${s1 + gate * 0.6},${g0} L${s1 + gate * 0.6},${g1} L${s1},${g1} L${s1},${s1}`,
    `L${g1},${s1} L${g1},${s1 + gate * 0.6} L${g0},${s1 + gate * 0.6} L${g0},${s1} L${s0},${s1}`,
    `L${s0},${g1} L${s0 - gate * 0.6},${g1} L${s0 - gate * 0.6},${g0} L${s0},${g0} Z`,
  ].join(" ");

  const circles = [0.4, 0.37, 0.34]
    .map((r) => `<circle cx="${c}" cy="${c}" r="${size * r}" fill="none" stroke="${accent}" stroke-width="${stroke}"/>`)
    .join("");

  // Eight lotus petals around the square.
  const petalR = size * 0.3;
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x = c + Math.cos(a) * petalR;
    const y = c + Math.sin(a) * petalR;
    const rot = (a * 180) / Math.PI + 90;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(size * 0.045).toFixed(1)}" ry="${(size * 0.09).toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${primary}" fill-opacity="0.35" stroke="${accent}" stroke-width="${stroke}"/>`;
  }).join("");

  // The number square.
  const cell = size * 0.12;
  const gx = c - cell * 1.5;
  const gy = c - cell * 1.5;
  let grid = `<rect x="${gx}" y="${gy}" width="${cell * 3}" height="${cell * 3}" fill="${primary}" fill-opacity="0.18" stroke="${accent}" stroke-width="${stroke}"/>`;
  for (let i = 1; i < 3; i++) {
    grid += `<line x1="${gx + cell * i}" y1="${gy}" x2="${gx + cell * i}" y2="${gy + cell * 3}" stroke="${accent}" stroke-width="${stroke}"/>`;
    grid += `<line x1="${gx}" y1="${gy + cell * i}" x2="${gx + cell * 3}" y2="${gy + cell * i}" stroke="${accent}" stroke-width="${stroke}"/>`;
  }
  spec.grid.forEach((row, r) =>
    row.forEach((n, col) => {
      grid += `<text x="${gx + cell * (col + 0.5)}" y="${gy + cell * (r + 0.5)}" font-family="Georgia, serif" font-size="${cell * 0.45}" fill="${accent}" text-anchor="middle" dominant-baseline="central">${n}</text>`;
    }),
  );

  return (
    `<path d="${bhupura}" fill="none" stroke="${primary}" stroke-width="${stroke * 2}"/>` +
    circles +
    petals +
    grid +
    `<circle cx="${c}" cy="${c}" r="${size * 0.012}" fill="${primary}"/>`
  );
}

/** The print-ready yantra: a square on the graha's background colour. */
export function yantraSvg(spec: YantraSpec, size = 2048): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" fill="${spec.colours.background}"/>` +
    yantraBody(spec, size) +
    `</svg>`
  );
}

export interface WallpaperText {
  title: string;
  mantra: string;
  mantraIast: string;
  nakshatra: string;
  affirmation: string;
}

/** The 1080×2340 phone wallpaper: yantra in the middle, mantra above, affirmation below. */
export function wallpaperSvg(spec: YantraSpec, text: WallpaperText, width = 1080, height = 2340): string {
  const { primary, accent, background } = spec.colours;
  const y0 = (height - width) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${background}"/><stop offset="1" stop-color="#000"/></linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#bg)"/>` +
    `<text x="${width / 2}" y="${y0 - 170}" font-family="serif" font-size="58" fill="${accent}" text-anchor="middle">${esc(text.title)}</text>` +
    `<text x="${width / 2}" y="${y0 - 80}" font-family="serif" font-size="44" fill="${primary}" text-anchor="middle">${esc(text.mantra)}</text>` +
    `<text x="${width / 2}" y="${y0 - 25}" font-family="serif" font-size="30" font-style="italic" fill="${accent}" fill-opacity="0.8" text-anchor="middle">${esc(text.mantraIast)}</text>` +
    `<g transform="translate(0 ${y0})">${yantraBody(spec, width)}</g>` +
    `<text x="${width / 2}" y="${y0 + width + 90}" font-family="sans-serif" font-size="40" fill="${accent}" text-anchor="middle">${esc(text.affirmation)}</text>` +
    `<text x="${width / 2}" y="${y0 + width + 160}" font-family="sans-serif" font-size="30" fill="${accent}" fill-opacity="0.7" text-anchor="middle">${esc(text.nakshatra)}</text>` +
    `</svg>`
  );
}

/** Devanagari → another Brahmic script, for the scripts whose Unicode block mirrors Devanagari's. */
const SCRIPT_OFFSET: Record<string, number> = { bn: 0x80, gu: 0x180, te: 0x300 };

/**
 * The beej mantra in the reader's own script. Hindi and Marathi read
 * Devanagari; Bengali, Gujarati and Telugu are a fixed offset away in
 * Unicode; Tamil and English get Devanagari (Tamil lacks the voiced
 * consonants these mantras need), with the IAST shown alongside. ॐ, the
 * danda and digits stay as they are.
 */
export function mantraInScript(devanagari: string, lang: string): string {
  const offset = SCRIPT_OFFSET[lang];
  if (!offset) return devanagari;
  let out = "";
  for (const ch of devanagari) {
    const cp = ch.codePointAt(0)!;
    // व has no Bengali letter of its own; Bengali writes it with ব.
    if (lang === "bn" && cp === 0x0935) {
      out += "ব";
      continue;
    }
    const shiftable = cp >= 0x0901 && cp <= 0x094d && cp !== 0x0950;
    out += shiftable ? String.fromCodePoint(cp + offset) : ch;
  }
  return out;
}

/** Rasterises an SVG string to a PNG data URL (browser only). */
export function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("svg render failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
