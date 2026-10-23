// The i18n parity check (run in CI as its own step: `pnpm i18n:parity`).
//
// All 15 app languages must carry every string English has, with the same {{placeholders}} and nothing
// empty, and no language may carry a key English does not know. A string added in English without its
// translations fails here, in the pull request, instead of showing a reader an English line or a raw
// {{placeholder}} in production. Strings that are English-only on purpose are listed, with a reason, in
// scripts/i18n-parity.ts (KNOWN_EXCEPTIONS).
import { describe, expect, it } from "vitest";
import { COSMIC_COPY } from "../i18n/skin-copy";
import { ALL_LANGS, KNOWN_EXCEPTIONS, computeParity, languageStrings, placeholders } from "./i18n-parity";

describe("i18n parity across the 15 app languages", () => {
  it("covers exactly the 15 languages the app ships", () => {
    expect(ALL_LANGS).toHaveLength(15);
    expect(new Set(ALL_LANGS).size).toBe(15);
  });

  it("every English-only exception states its reason", () => {
    for (const [key, reason] of Object.entries(KNOWN_EXCEPTIONS)) {
      expect(reason.length, key).toBeGreaterThan(10);
    }
  });

  it("every language has every string, with matching placeholders, none empty, none unknown", async () => {
    const report = await computeParity();
    expect(report).toHaveLength(14);
    const summary = report.map((p) => ({
      lang: p.code,
      missing: p.missing.length,
      badPlaceholders: p.badPlaceholders.length,
      empty: p.empty.length,
      unknown: p.unknown.length,
    }));
    // The first few keys of any problem, so a failing run says what to translate.
    const detail = report.flatMap((p) => [
      ...p.missing.slice(0, 5).map((k) => `${p.code}: missing ${k}`),
      ...p.badPlaceholders.slice(0, 5).map((k) => `${p.code}: placeholders differ ${k}`),
      ...p.empty.slice(0, 5).map((k) => `${p.code}: empty ${k}`),
      ...p.unknown.slice(0, 5).map((k) => `${p.code}: unknown key ${k}`),
    ]);
    expect(detail, JSON.stringify(summary)).toEqual([]);
  });

  it("the Cosmic wording replaces only strings that exist, keeping their placeholders", async () => {
    const en = await languageStrings("en");
    for (const [lang, copy] of Object.entries(COSMIC_COPY)) {
      const own = await languageStrings(lang as (typeof ALL_LANGS)[number]);
      for (const [key, value] of Object.entries(copy)) {
        expect(own[key], `${lang}: Cosmic wording for unknown key ${key}`).toBeDefined();
        expect(placeholders(value).join(), `${lang}:${key}`).toBe(placeholders(own[key]!).join());
        expect(en[key], key).toBeDefined();
      }
    }
  });
});
