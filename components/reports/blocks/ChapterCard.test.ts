import { describe, it, expect } from "vitest";
import { resolveChapterAccent } from "./ChapterCard";

describe("resolveChapterAccent", () => {
  it("defaults to the theme-reactive gold CSS var when no accent is given", () => {
    expect(resolveChapterAccent()).toBe("var(--gold)");
    expect(resolveChapterAccent(undefined)).toBe("var(--gold)");
  });

  it("resolves a known named palette key to its literal color", () => {
    expect(resolveChapterAccent("rose")).toBe("#f43f5e");
    expect(resolveChapterAccent("emerald")).toBe("#10b981");
    expect(resolveChapterAccent("gold")).toBe("var(--gold)");
  });

  it("passes through any other value untouched (hex/rgb/css var), for callers with their own color", () => {
    expect(resolveChapterAccent("#123456")).toBe("#123456");
    expect(resolveChapterAccent("rgb(1,2,3)")).toBe("rgb(1,2,3)");
    expect(resolveChapterAccent("var(--some-other-token)")).toBe("var(--some-other-token)");
  });
});
