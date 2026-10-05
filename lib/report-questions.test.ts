import { describe, it, expect } from "vitest";
import { REPORT_QUESTIONS } from "./report-questions";
import { resources } from "@/i18n/resources";

type Tree = Record<string, unknown>;

/** Looks an i18n key up in one language's translation tree, as i18next would. */
function lookup(language: string, key: string): unknown {
  const root = (resources as unknown as Record<string, { translation: Tree }>)[language]?.translation;
  return key.split(".").reduce<unknown>(
    (node, part) => (node && typeof node === "object" ? (node as Tree)[part] : undefined),
    root,
  );
}

const LANGUAGES = Object.keys(resources);

/** Every i18n key a report's question step can show: each label and each option. */
function keysFor(reportKey: string): string[] {
  return (REPORT_QUESTIONS[reportKey] ?? []).flatMap((q) => [
    q.labelKey,
    ...(q.options ?? []).map((o) => o.labelKey),
  ]);
}

describe("REPORT_QUESTIONS", () => {
  it("has English text for every question and option of every report", () => {
    for (const reportKey of Object.keys(REPORT_QUESTIONS)) {
      for (const key of keysFor(reportKey)) {
        expect(typeof lookup("en", key), `${reportKey}: ${key}`).toBe("string");
      }
    }
  });

  // The questions about the reader's real situation are asked so the report does not describe a
  // life they do not have; a question shown in English to a Tamil reader is one they may skip.
  it("has the reader-situation questions translated in every app language", () => {
    const reports = ["wealth", "true_love", "progeny", "career_monthly", "finance_monthly", "relationship_monthly"];
    const situationKeys = reports
      .flatMap(keysFor)
      .filter((key) => /\.(wealth|relationshipNow|workNow|children)\./.test(key));
    expect(situationKeys.length).toBeGreaterThan(15);
    for (const language of LANGUAGES) {
      for (const key of situationKeys) {
        expect(typeof lookup(language, key), `${language}: ${key}`).toBe("string");
      }
    }
  });

  it("asks each report only about what it writes about", () => {
    const ids = (reportKey: string) => (REPORT_QUESTIONS[reportKey] ?? []).map((q) => q.id);
    expect(ids("wealth")).toEqual(["incomeToday", "ownsProperty", "concern"]);
    expect(ids("true_love")).toEqual(["relationshipNow"]);
    expect(ids("progeny")).toEqual(["children"]);
    expect(ids("career_monthly")).toEqual(["workNow", "concern"]);
    expect(ids("finance_monthly")).toEqual(["incomeToday", "concern"]);
    expect(ids("relationship_monthly")).toEqual(["relationshipNow", "concern"]);
  });
});
