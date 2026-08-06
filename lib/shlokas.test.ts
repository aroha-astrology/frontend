import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/providers/language-provider";
import type { Localized, Shloka } from "@/lib/shlokas";

/**
 * The Shlokas library is 300KB of static content with no server behind it and
 * no runtime schema check — nothing else in the app would notice a missing
 * Tamil `meaning` or a typo'd image filename until a user hit that screen and
 * saw a blank card. These assertions are that missing check.
 */

const PUBLIC = join(process.cwd(), "public", "shlokas");
const shlokas: Shloka[] = JSON.parse(readFileSync(join(PUBLIC, "shlokas.json"), "utf8"));
const CODES = LANGUAGES.map((l) => l.code);

/** Filled by the size assertion so it only stats each distinct file once. */
const imgFiles = new Set(shlokas.map((s) => s.img));

describe("shlokas.json", () => {
  it("has 50 entries with ids 1-50 and unique slugs", () => {
    expect(shlokas).toHaveLength(50);
    expect(shlokas.map((s) => s.id)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(new Set(shlokas.map((s) => s.slug)).size).toBe(50);
  });

  it("has the language-independent fields on every entry", () => {
    for (const s of shlokas) {
      expect(s.sanskrit.trim(), `${s.slug}.sanskrit`).not.toBe("");
      expect(s.iast.trim(), `${s.slug}.iast`).not.toBe("");
      expect(s.img.trim(), `${s.slug}.img`).not.toBe("");
      expect(s.japCount, `${s.slug}.japCount`).toBeGreaterThan(0);
    }
  });

  it("has all 7 languages for every translated field", () => {
    const fields = ["title", "deity", "meaning", "whenToChant"] as const;
    for (const s of shlokas) {
      for (const field of fields) {
        const value = s[field] as Localized;
        for (const code of CODES) {
          expect(value?.[code]?.trim(), `${s.slug}.${field}.${code}`).toBeTruthy();
        }
      }
    }
  });

  it("points every img/audio filename at a file that actually exists", () => {
    for (const s of shlokas) {
      expect(existsSync(join(PUBLIC, "img", s.img)), `missing img for ${s.slug}: ${s.img}`).toBe(true);
      expect(existsSync(join(PUBLIC, "audio", s.audio!)), `missing audio for ${s.slug}: ${s.audio}`).toBe(true);
    }
  });

  it("has chant audio on every shloka, named <slug>.mp3", () => {
    // The whole naming contract in one assertion: the file is always the slug.
    // No lookup table exists anywhere, so this is what keeps it true.
    for (const s of shlokas) {
      expect(s.audio, `${s.slug} has no audio`).toBe(`${s.slug}.mp3`);
    }
  });

  it("has no silent-length audio (a truncated render reads as a tiny file)", () => {
    // The shortest legitimate clip is shiva-panchakshari ("om namah shivaya",
    // 5 syllables, ~1.4s / 12KB). Anything under 8KB is a failed render, not a
    // short mantra — vagdhenu emits a valid-but-near-empty file when a clip
    // fails rather than erroring, so file size is the cheap proxy for it.
    for (const s of shlokas) {
      const bytes = readFileSync(join(PUBLIC, "audio", s.audio!)).byteLength;
      expect(bytes, `${s.audio} is only ${bytes} bytes`).toBeGreaterThan(8 * 1024);
    }
  });

  it("keeps every committed image under 60KB", () => {
    // Sources were 120-670KB PNGs; anything near that size here means a raw
    // file was copied in without going through the WebP conversion step.
    for (const img of imgFiles) {
      const bytes = readFileSync(join(PUBLIC, "img", img)).byteLength;
      expect(bytes, `${img} is ${Math.round(bytes / 1024)}KB`).toBeLessThan(60 * 1024);
    }
  });
});
