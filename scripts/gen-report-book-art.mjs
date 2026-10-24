// One-off generator for the report book's artwork (public/report-book/*.svg).
//
// Oxion (oxionai.com/v1) has no image endpoint, so its strongest text model draws the art as SVG.
// The result is committed and served as static files: every user's book reuses the same cover and
// chapter art, so nothing is generated per user (the reader's name is laid over the cover in the
// app). Re-run only to redraw: `node scripts/gen-report-book-art.mjs [name ...]`.
// Key: OXION_API_KEY in the environment, or `oxionai=` in ../backend/.env.

import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../public/report-book");
const MODEL = "claude-opus-5";

function oxionKey() {
  if (process.env.OXION_API_KEY) return process.env.OXION_API_KEY;
  const env = fs.readFileSync(path.resolve(import.meta.dirname, "../../backend/.env"), "utf8");
  return env.match(/^oxionai=(.*)$/m)[1].trim().replace(/^"|"$/g, "");
}

const THEME = `Palette (use ONLY these): deep navy #0f1633 and #1b2550, gold #dfb564, light gold #fbe09b, dark gold #a67c00, rose-gold #c99a8b, soft white #f3ecd9. Style: elegant Indian-astrology temple art — fine gold line work, lotus petals, mandala rings, stars, crescent moons, zodiac-wheel ticks, delicate dots. Flat vector, no gradients except simple linear/radial ones, no text or letters anywhere, no photographs, no people's faces. Every piece belongs to one family: same line weight (1.2 to 2.2), same gold, same ornament vocabulary.`;

const SPECS = {
  "cover-art": {
    box: "0 0 600 800",
    brief: `The full-bleed front cover background of a premium astrology book. Deep navy sky (radial gradient #1b2550 centre to #0f1633 edges) with a scatter of small gold stars. A double gold border frame inset 24px with ornate lotus-petal corners. Large concentric mandala / zodiac rings in thin gold centred at (300,330): outer ring radius about 235 with 12 evenly spaced tick marks and small star dots, a ring of 16 lotus petals inside (every petal outlined in gold with a #1b2550 fill, never black), and keep a CLEAR empty circle of radius 120 at the centre (the brand logo is placed there). Below y=560 keep the artwork calm and sparse (just stars and a thin gold flourish line near y=740) because the title text is placed there.`,
  },
  "back-art": {
    box: "0 0 600 800",
    brief: `The back cover background. Same navy sky with sparse small gold stars and the same double gold border frame with lotus-petal corners. A small, centred mandala (radius about 90) at (300,400) made of 8 lotus petals, a ring of dots and a tiny eight-pointed star in the middle. Nothing else; quiet and symmetrical.`,
  },
  divider: {
    box: "0 0 600 40",
    brief: `A thin horizontal ornamental divider on a transparent background: a centred tiny lotus flanked by a gold line that fades out to both sides with small diamond and dot ornaments.`,
  },
  "chapter-love": {
    box: "0 0 600 300",
    brief: `Chapter art on a transparent background for LOVE & RELATIONSHIPS: two LARGE lotus flowers (each about 170px wide, filling the left and right thirds of the canvas) leaning toward each other, their inner petals almost touching in the centre where a glowing eight-pointed star sits inside a small heart-shaped ring of dots, a crescent moon above and a few stars. Gold outlines with soft-white and rose-gold petal fills.`,
  },
  "chapter-career": {
    box: "0 0 600 300",
    brief: `Chapter art on a transparent background for CAREER & ACHIEVEMENT: a sun rising behind seven ascending steps / a mountain with a flag-less peak, rays fanning out, a bright eight-pointed star above.`,
  },
  "chapter-money": {
    box: "0 0 600 300",
    brief: `Chapter art on a transparent background for WEALTH & PROSPERITY: a kalash (pot) overflowing with gold coins and lotus petals, with a few gold coins around and tiny stars.`,
  },
  "chapter-health": {
    box: "0 0 600 300",
    brief: `Chapter art on a transparent background for HEALTH & VITALITY: a tree of life with spreading roots and branches, leaves in gold, a lotus at its base, a small sun and moon either side.`,
  },
  "chapter-spirit": {
    box: "0 0 600 300",
    brief: `Chapter art on a transparent background for SPIRITUAL GROWTH: a large open lotus with concentric rays and a ring of small dots, a small eight-pointed star at its centre, and a halo of tiny stars. Do NOT draw the Om symbol or any text.`,
  },
  "chapter-family": {
    box: "0 0 600 300",
    brief: `Chapter art on a transparent background for FAMILY & HOME: a banyan-like tree sheltering a small temple-style house, with lotus petals along the ground and a crescent moon and stars above.`,
  },
  "chapter-timing": {
    box: "0 0 600 300",
    brief: `Chapter art on a transparent background for TIMING & LIFE PERIODS: a zodiac wheel (12 segments with tick marks and tiny star symbols, no letters) with the eight phases of the moon in an arc above it.`,
  },
  "chapter-general": {
    box: "0 0 600 300",
    brief: `Chapter art on a transparent background, general purpose: a sun and a crescent moon facing each other with a bright eight-pointed star between them, ringed by a thin mandala line and tiny stars.`,
  },
};

function extractSvg(text) {
  const m = text.match(/<svg[\s\S]*<\/svg>/i);
  if (!m) throw new Error("no <svg> in the answer");
  const svg = m[0];
  if (/<script|<foreignObject|\son\w+\s*=|javascript:|<image|href\s*=\s*["']https?:/i.test(svg)) {
    throw new Error("unsafe svg");
  }
  return svg.replace(/<\?xml[\s\S]*?\?>/g, "");
}

async function draw(name, spec) {
  const prompt = `Draw one SVG illustration.\n\n${THEME}\n\nCanvas: viewBox="${spec.box}" (set width/height attributes to the viewBox's width and height, no other size).\n\nBrief: ${spec.brief}\n\nReturn ONLY the SVG markup, starting with <svg and ending with </svg>. No markdown fences, no explanation. Keep it under 14 KB: use <defs>/<use> for repeated petals and ticks.`;
  const res = await fetch("https://oxionai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${oxionKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 24000, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(280_000),
  });
  if (!res.ok) throw new Error(`oxion ${res.status}`);
  const json = await res.json();
  const svg = extractSvg(json.choices?.[0]?.message?.content ?? "");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg);
  return svg.length;
}

const wanted = process.argv.slice(2);
const names = Object.keys(SPECS).filter((n) => wanted.length === 0 || wanted.includes(n));
const queue = [...names];
async function worker() {
  while (queue.length) {
    const name = queue.shift();
    const t0 = Date.now();
    try {
      const bytes = await draw(name, SPECS[name]);
      console.log(`${name}: ${bytes} bytes in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    } catch (e) {
      console.log(`${name}: FAILED ${String(e).slice(0, 100)}`);
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
