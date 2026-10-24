import { describe, expect, it } from "vitest";
import {
  buildBookCharts,
  buildBookPages,
  chapterArtFor,
  tidyHeading,
  tidyText,
  layoutSheets,
  splitParagraph,
  type BookPage,
} from "./report-book";

const LONG =
  "The seventh house governs partnership and your chart places a calm, steady Jupiter there. " +
  "This favours a spouse who is older in outlook, patient, and respected by your family. " +
  "Marriage after twenty-eight tends to be happier than an early one, and the years that follow bring steady growth. ";

const chapters = (pages: BookPage[]) => pages.filter((p): p is Extract<BookPage, { kind: "chapter" }> => p.kind === "chapter");

describe("splitParagraph", () => {
  it("keeps a short paragraph whole", () => {
    expect(splitParagraph("Short one.", 400)).toEqual(["Short one."]);
  });

  it("cuts a long paragraph at sentence ends, losing no words", () => {
    const text = LONG.repeat(4).trim();
    const parts = splitParagraph(text, 300);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(300);
    expect(parts.join(" ").replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " "));
  });

  it("never cuts a single over-long sentence mid-word", () => {
    const words = Array.from({ length: 120 }, (_, i) => `word${i}`).join(" ");
    const parts = splitParagraph(words, 200);
    expect(parts.join(" ")).toBe(words);
    for (const p of parts) expect(p.endsWith(" ")).toBe(false);
  });
});

describe("chapterArtFor", () => {
  it("prefers the section heading, then the report it belongs to", () => {
    expect(chapterArtFor("career_monthly", "Money and savings")).toBe("money");
    expect(chapterArtFor("marriage", "Your strengths")).toBe("love");
    expect(chapterArtFor("health", "Overview")).toBe("health");
    expect(chapterArtFor("numerology", "Your numbers")).toBe("general");
  });
});

describe("buildBookPages", () => {
  const input = {
    reportKey: "marriage",
    scores: {},
    headings: ["Your partner", "Timing"],
    sections: [
      { heading: "h1", hook: "A steady heart.", paragraphs: [LONG.repeat(5), LONG], bullets: ["Be patient", "Listen first"] },
      { heading: "h2", paragraphs: ["Only one short paragraph."] },
    ],
  };

  it("starts with contents that point at each chapter's first page, and ends with a closing page", () => {
    const pages = buildBookPages(input);
    expect(pages[0]!.kind).toBe("contents");
    expect(pages[pages.length - 1]!.kind).toBe("closing");
    const contents = pages[0] as Extract<BookPage, { kind: "contents" }>;
    expect(contents.chapters.map((c) => c.heading)).toEqual(["Your partner", "Timing"]);
    for (const c of contents.chapters) {
      const page = pages[c.page - 1]!;
      expect(page.kind).toBe("chapter");
      expect((page as Extract<BookPage, { kind: "chapter" }>).opener).toBe(true);
    }
  });

  it("puts the report's own existing picture on the contents page when it has one", () => {
    const contents = buildBookPages(input)[0] as Extract<BookPage, { kind: "contents" }>;
    expect(contents.picture).toBe("/reports/marriage.png");
    const other = buildBookPages({ ...input, reportKey: "not_a_report" })[0] as Extract<BookPage, { kind: "contents" }>;
    expect(other.picture).toBeUndefined();
  });

  it("opens each chapter once, with the hook only on the opener, and spreads long text over pages", () => {
    const ch = chapters(buildBookPages(input));
    expect(ch.filter((p) => p.opener)).toHaveLength(2);
    expect(ch.filter((p) => p.hook)).toHaveLength(1);
    expect(ch.filter((p) => p.section === 0).length).toBeGreaterThan(2);
  });

  it("loses no text and keeps the order", () => {
    const ch = chapters(buildBookPages(input)).filter((p) => p.section === 0);
    const text = ch.flatMap((p) => p.paragraphs).join(" ").replace(/\s+/g, " ");
    expect(text).toBe([LONG.repeat(5).trim(), LONG.trim()].join(" ").replace(/\s+/g, " "));
    expect(ch.flatMap((p) => p.bullets)).toEqual(["Be patient", "Listen first"]);
  });

  it("never puts more than a page's worth of text on one page", () => {
    for (const p of chapters(buildBookPages(input))) {
      const chars = [...p.paragraphs, ...p.bullets].join("").length;
      expect(chars).toBeLessThanOrEqual(p.opener ? 520 : 760);
    }
  });

  it("fits fewer characters per page in a wide script", () => {
    const hindi = "यह एक बहुत लंबा अनुच्छेद है जो आपके जीवन के बारे में बताता है। ".repeat(20);
    const latin = "This is a long paragraph about your life and what it holds. ".repeat(20);
    const count = (t: string) => chapters(buildBookPages({ ...input, sections: [{ heading: "x", paragraphs: [t] }], headings: ["x"] })).length;
    expect(count(hindi)).toBeGreaterThan(count(latin));
  });
});

describe("layoutSheets", () => {
  it("uses both sides of a sheet in a spread, leaving the last back blank when odd", () => {
    expect(layoutSheets(5, "spread")).toEqual([[0, 1], [2, 3], [4, null]]);
  });
  it("gives every page its own sheet front on a single page (grabfold shows fronts only there)", () => {
    expect(layoutSheets(3, "single")).toEqual([[0, null], [1, null], [2, null]]);
  });
});

describe("buildBookCharts", () => {
  it("draws nothing for a report with no chartable data", () => {
    expect(buildBookCharts({})).toEqual([]);
  });

  it("builds a radar from scored rings, planet bars, and the best windows in date order", () => {
    const charts = buildBookCharts({
      marriageScore: 72,
      careerScore: 64,
      wealthScore: 80,
      planetStrength: [
        { planet: "Sun", pct: 110, isStrong: true, isRetrograde: false, isCombust: false },
        { planet: "Moon", pct: 60, isStrong: false, isRetrograde: false, isCombust: false },
        { planet: "Mars", pct: 85, isStrong: true, isRetrograde: false, isCombust: false },
      ],
      windows: [
        { startDate: "2027-03-01", endDate: "2027-09-01", score: 70, level: "MEDIUM", dashaLevel: "antardasha", reasoning: [] },
        { startDate: "2026-11-01", endDate: "2027-02-01", score: 90, level: "HIGH", dashaLevel: "antardasha", reasoning: [] },
      ],
    });
    const types = charts.map((c) => c.type);
    expect(types).toContain("bars");
    expect(types).toContain("windows");
    const bars = charts.find((c) => c.type === "bars")!;
    if (bars.type === "bars") expect(bars.bars.every((b) => b.pct <= 100)).toBe(true);
    const win = charts.find((c) => c.type === "windows")!;
    if (win.type === "windows") expect(win.windows.map((w) => w.start)).toEqual(["2026-11-01", "2027-03-01"]);
  });
});

describe("raw ids never reach a page", () => {
  it("turns a heading that is an id into a title, and leaves real headings alone", () => {
    expect(tidyHeading("at_a_glance")).toBe("At A Glance");
    expect(tidyHeading("money_after_marriage")).toBe("Money After Marriage");
    expect(tidyHeading("Your partner, in brief")).toBe("Your partner, in brief");
    expect(tidyHeading("Saturn_return")).toBe("Saturn Return");
  });

  it("replaces an id inside prose with plain words, leaving other text and numbers alone", () => {
    expect(tidyText("at_a_glance body. Venus in the 7th_house at 28.5 degrees.")).toBe(
      "at a glance body. Venus in the 7th house at 28.5 degrees.",
    );
    expect(tidyText("A normal sentence — nothing to change.")).toBe("A normal sentence — nothing to change.");
  });

  it("cleans every string of every page", () => {
    const pages = buildBookPages({
      reportKey: "marriage",
      scores: {},
      headings: ["at_a_glance", "timing_windows"],
      sections: [
        { heading: "at_a_glance", hook: "see_the_pattern", paragraphs: ["at_a_glance body. Fine."], bullets: ["do_this_first"] },
        { heading: "timing_windows", paragraphs: ["Steady."] },
      ],
    });
    const text = JSON.stringify(pages);
    expect(text).not.toMatch(/[a-z]_[a-z]/);
    expect(JSON.stringify(pages[0])).toContain("At A Glance");
  });
});
