/**
 * The report book: how a finished report becomes pages. Pure, so it is tested without a browser.
 *
 * A page is a fixed 3:4 box (grabfold turns real pages), so text is cut into pages by a character
 * budget rather than measured: the same report always breaks at the same place, and a page never
 * needs a scrollbar. The budget is deliberately low; the page also clips (never scrolls) as a net.
 */

import type { ReportSection } from "@/lib/reports-api";
import {
  humanizeKey,
  buildScoreFacts,
  isPlanetStrengthArray,
  isRankedWindowArray,
  isDecadeBandArray,
  type PlanetStrengthValue,
  type RankedWindow,
  type DecadeBand,
} from "@/lib/report-score-facts";

/* ------------------------------------------------------------------ art */

export type ChapterArt = "love" | "career" | "money" | "health" | "spirit" | "family" | "timing" | "general";

const BY_REPORT: Array<[RegExp, ChapterArt]> = [
  [/marriage|love|milan|match|bond|partner/i, "love"],
  [/career|job|work/i, "career"],
  [/wealth|finance|money|business/i, "money"],
  [/health|vitality/i, "health"],
  [/progeny|child|baby|family|home/i, "family"],
  [/dasha|timeline|life_so_far|yearly|monthly|forecast|timing|year/i, "timing"],
  [/past_life|spirit|remed|gem|mantra|dharma|karma/i, "spirit"],
];

const BY_HEADING: Array<[RegExp, ChapterArt]> = [
  [/love|marriage|relationship|partner|romance|spouse/i, "love"],
  [/career|work|profession|promotion|job/i, "career"],
  [/wealth|money|income|finance|prosper|invest/i, "money"],
  [/health|vitality|body|wellbeing|well-being/i, "health"],
  [/family|home|child|parent|mother|father/i, "family"],
  [/timing|period|dasha|year|month|window|when|forecast/i, "timing"],
  [/spirit|remed|karma|dharma|mantra|gem|growth|meditat/i, "spirit"],
];

/** Which chapter picture a section gets: its own heading first, then the report it belongs to. */
export function chapterArtFor(reportKey: string, heading: string): ChapterArt {
  for (const [re, art] of BY_HEADING) if (re.test(heading)) return art;
  for (const [re, art] of BY_REPORT) if (re.test(reportKey)) return art;
  return "general";
}

export const chapterArtSrc = (art: ChapterArt) => `/report-book/chapter-${art}.svg`;

/** Reports that already ship a picture of their own (public/reports/<key>.png, the one their
 * catalogue card and screen use). The book reuses it on the contents page. */
const REPORT_PICTURES = new Set([
  "baby_name", "career_monthly", "finance_monthly", "health_monthly", "kp_annual", "kundli_milan",
  "marriage", "match_report", "name_change", "numerology", "past_life", "progeny",
  "relationship_monthly", "remedies", "true_love", "wealth",
]);

export const reportPictureSrc = (reportKey: string): string | undefined =>
  REPORT_PICTURES.has(reportKey) ? `/reports/${reportKey}.png` : undefined;

/* ----------------------------------------------------------- pagination */

/** Characters of body text one full page holds at the book's type size (Latin script). */
const PAGE_CHARS = 560;
/** The first page of a chapter carries a picture and the heading, so it holds less. */
const OPENER_CHARS = 300;
/** What a paragraph break and a bullet cost, in characters. */
const PARAGRAPH_COST = 70;
const BULLET_COST = 40;
/** Scripts with wider glyphs (Devanagari, Bengali, Tamil, Japanese ...) fit fewer characters. */
const WIDE_SCRIPT = /[ऀ-෿぀-ヿ一-鿿]/;

export type BookPage =
  | { kind: "contents"; chapters: Array<{ heading: string; page: number }>; picture?: string }
  | { kind: "chart"; chart: BookChart }
  | {
      kind: "chapter";
      section: number;
      heading: string;
      art: ChapterArt;
      /** True on the first page of a chapter. */
      opener: boolean;
      hook?: string;
      paragraphs: string[];
      bullets: string[];
    }
  | { kind: "closing" };

export interface BookInput {
  reportKey: string;
  sections: Array<Pick<ReportSection, "heading" | "hook" | "paragraphs" | "bullets" | "items">>;
  scores: Record<string, unknown>;
  /** The reader-facing heading of section i (already translated by the caller). */
  headings: string[];
}

/** A raw machine id such as `at_a_glance` or `money_after_marriage` (lowercase words joined by _). */
const RAW_ID = /\b[a-z0-9]+(?:_[a-z0-9]+)+\b/gi;
const WHOLE_RAW_ID = /^[a-z0-9]+(?:_[a-z0-9]+)+$/i;

/**
 * Text as a reader should see it: a raw section id that leaked into prose or a heading (a report
 * written before ids were translated, a model echoing a key) never reaches a page. In prose the
 * underscores become spaces; a heading that IS an id is turned into a title ("at_a_glance" ->
 * "At A Glance"). Real words and numbers are never touched.
 */
export function tidyText(text: string): string {
  return text.replace(RAW_ID, (id) => id.replace(/_/g, " ")).replace(/[ \t]{2,}/g, " ").trim();
}

export function tidyHeading(heading: string): string {
  const h = heading.trim();
  return WHOLE_RAW_ID.test(h) ? humanizeKey(h) : tidyText(h);
}

const charsOf = (s: string) => s.length * (WIDE_SCRIPT.test(s) ? 1.6 : 1);

/** Splits one over-long paragraph at sentence ends so each piece fits `budget` characters. */
export function splitParagraph(text: string, budget: number): string[] {
  if (charsOf(text) <= budget) return [text];
  const sentences = text.match(/[^.!?।॥]+[.!?।॥]+["')\]]*\s*|[^.!?।॥]+$/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (cur && charsOf(`${cur} ${s}`) > budget) {
      out.push(cur);
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
    // A single sentence longer than a page is cut at a space, never mid-word.
    while (charsOf(cur) > budget) {
      const cut = cur.lastIndexOf(" ", Math.max(1, Math.floor(budget / (charsOf("a") || 1))));
      const at = cut > 20 ? cut : Math.floor(budget);
      out.push(cur.slice(0, at).trim());
      cur = cur.slice(at).trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

interface Piece {
  text: string;
  bullet: boolean;
}

function chapterPages(
  section: number,
  heading: string,
  art: ChapterArt,
  s: BookInput["sections"][number],
): BookPage[] {
  const bulletTexts = [
    ...(s.bullets ?? []),
    ...(s.items ?? []).map((i) => (i.badge ? `${i.title} (${i.badge})` : i.title)),
  ];
  const pieces: Piece[] = [
    ...s.paragraphs.filter((p) => p.trim()).flatMap((p) => splitParagraph(p.trim(), PAGE_CHARS - PARAGRAPH_COST).map((text) => ({ text, bullet: false }))),
    ...bulletTexts.filter((b) => b.trim()).map((text) => ({ text: text.trim(), bullet: true })),
  ];

  const pages: BookPage[] = [];
  let paras: string[] = [];
  let bullets: string[] = [];
  let used = 0;
  let opener = true;
  const budget = () => (opener ? OPENER_CHARS : PAGE_CHARS);
  const flush = () => {
    pages.push({
      kind: "chapter",
      section,
      heading,
      art,
      opener,
      ...(opener && s.hook ? { hook: s.hook } : {}),
      paragraphs: paras,
      bullets,
    });
    paras = [];
    bullets = [];
    used = 0;
    opener = false;
  };
  for (const piece of pieces) {
    const cost = charsOf(piece.text) + (piece.bullet ? BULLET_COST : PARAGRAPH_COST);
    if ((paras.length || bullets.length) && used + cost > budget()) flush();
    if (piece.bullet) bullets.push(piece.text);
    else paras.push(piece.text);
    used += cost;
  }
  if (paras.length || bullets.length || opener) flush();
  return pages;
}

/** Every page after the cover, in reading order. The cover and back cover are drawn by the book. */
export function buildBookPages(raw: BookInput): BookPage[] {
  // Every string that reaches a page is tidied once, here.
  const input: BookInput = {
    ...raw,
    headings: raw.sections.map((s, i) => tidyHeading(raw.headings[i] ?? s.heading)),
    sections: raw.sections.map((s) => ({
      heading: tidyHeading(s.heading),
      ...(s.hook ? { hook: tidyText(s.hook) } : {}),
      paragraphs: s.paragraphs.map(tidyText).filter(Boolean),
      ...(s.bullets ? { bullets: s.bullets.map(tidyText).filter(Boolean) } : {}),
      ...(s.items ? { items: s.items.map((i) => ({ ...i, title: tidyText(i.title), ...(i.badge ? { badge: tidyText(i.badge) } : {}) })) } : {}),
    })),
  };
  const chart = buildBookCharts(input.scores);
  const body: BookPage[] = [];
  input.sections.forEach((s, i) => {
    const heading = input.headings[i] ?? s.heading;
    body.push(...chapterPages(i, heading, chapterArtFor(input.reportKey, heading), s));
  });

  // Charts sit right after the contents ("your report at a glance"), before the first chapter.
  const front: BookPage[] = chart.map((c) => ({ kind: "chart", chart: c }));
  const pages: BookPage[] = [{ kind: "contents", chapters: [] }, ...front, ...body, { kind: "closing" }];

  const firstPageOf = new Map<number, number>();
  pages.forEach((p, i) => {
    if (p.kind === "chapter" && p.opener) firstPageOf.set(p.section, i + 1);
  });
  const picture = reportPictureSrc(input.reportKey);
  pages[0] = {
    kind: "contents",
    ...(picture ? { picture } : {}),
    chapters: input.sections.map((s, i) => ({
      heading: input.headings[i] ?? s.heading,
      page: firstPageOf.get(i) ?? 1,
    })),
  };
  return pages;
}

/**
 * Lays pages onto sheets. A spread (two pages) has text on both sides of a sheet; a single page
 * shows only fronts (grabfold's single layout skips backs), so each page takes a sheet of its own.
 * Returns, per sheet, [front, back] as indexes into `pages` (null = a blank side).
 */
export function layoutSheets(pageCount: number, layout: "spread" | "single"): Array<[number | null, number | null]> {
  if (layout === "single") return Array.from({ length: pageCount }, (_, i) => [i, null]);
  const sheets: Array<[number | null, number | null]> = [];
  for (let i = 0; i < pageCount; i += 2) sheets.push([i, i + 1 < pageCount ? i + 1 : null]);
  return sheets;
}

/** The page number printed on page index `i` (the contents page is page 1). */
export const printedPageNumber = (i: number) => i + 1;

/* --------------------------------------------------------------- charts */

export type BookChart =
  | { type: "radar"; title: string; points: Array<{ key: string; label: string; pct: number }> }
  | { type: "bars"; title: string; bars: Array<{ label: string; pct: number; note?: string }> }
  | { type: "windows"; title: string; windows: Array<{ start: string; end: string; level: "HIGH" | "MEDIUM" | "LOW"; score: number }> }
  | { type: "arc"; title: string; points: Array<{ label: string; score: number; tone: "challenging" | "mixed" | "favorable" }> };

export const CHART_TITLE_KEYS = {
  radar: "reports.book.chart.scores",
  bars: "reports.book.chart.planets",
  windows: "reports.book.chart.windows",
  arc: "reports.book.chart.arc",
} as const;

/**
 * Up to three charts, drawn from data the report already carries: its scored rings as a radar,
 * the planet strengths as bars, and the best timing windows (or the life arc) as a timeline.
 * Nothing is invented: a report without that data simply has no such chart.
 */
export function buildBookCharts(scores: Record<string, unknown>): BookChart[] {
  const charts: BookChart[] = [];
  const facts = buildScoreFacts(scores);

  const rings = facts.filter((f): f is Extract<typeof f, { type: "ring" }> => f.type === "ring" && Number.isFinite(f.pct));
  if (rings.length >= 3) {
    charts.push({
      type: "radar",
      title: CHART_TITLE_KEYS.radar,
      points: rings.slice(0, 8).map((r) => ({ key: r.key, label: r.label, pct: clampPct(r.pct) })),
    });
  }

  const strength = scores.planetStrength;
  if (isPlanetStrengthArray(strength) && strength.length >= 3) {
    charts.push({
      type: "bars",
      title: CHART_TITLE_KEYS.bars,
      bars: (strength as PlanetStrengthValue[]).map((p) => ({ label: p.planet, pct: clampPct(p.pct) })),
    });
  }

  const windows = Object.values(scores).find((v) => isRankedWindowArray(v)) as RankedWindow[] | undefined;
  if (windows && windows.length > 0) {
    charts.push({
      type: "windows",
      title: CHART_TITLE_KEYS.windows,
      windows: [...windows]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map((w) => ({ start: w.startDate, end: w.endDate, level: w.level, score: w.score })),
    });
  } else {
    const arc = Object.values(scores).find((v) => isDecadeBandArray(v)) as DecadeBand[] | undefined;
    if (arc && arc.length >= 3) {
      charts.push({
        type: "arc",
        title: CHART_TITLE_KEYS.arc,
        points: arc.slice(0, 10).map((b) => ({ label: b.label, score: b.score, tone: b.tone })),
      });
    }
  }
  return charts;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));
