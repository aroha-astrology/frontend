import { describe, it, expect } from "vitest";
import { REPORT_QUESTIONS, answeredNone, questionsFor } from "./report-questions";
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

describe("questionsFor — the gender a report's maths needs", () => {
  it("asks only when the profile has no male/female on file", () => {
    for (const key of ["numerology", "name_change", "progeny", "kundli_milan", "marriage"]) {
      expect(questionsFor(key, null).some((q) => q.id === "readerGender"), key).toBe(true);
      expect(questionsFor(key, "other").some((q) => q.id === "readerGender"), key).toBe(true);
      expect(questionsFor(key, "female").some((q) => q.id === "readerGender"), key).toBe(false);
    }
  });

  it("does not add it to reports whose maths ignores gender", () => {
    expect(questionsFor("wealth", null).some((q) => q.id === "readerGender")).toBe(false);
  });

  it("is skippable without the general-report warning", () => {
    expect(answeredNone(questionsFor("name_change", null), {})).toBe(false);
  });

  it("has text in every app language", () => {
    const q = questionsFor("name_change", null).find((x) => x.id === "readerGender")!;
    expect(q.options).toHaveLength(2);
  });
});

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

describe("answeredNone (the general-report warning)", () => {
  it("warns on every report that asks about the reader when nothing is answered", () => {
    for (const [reportKey, questions] of Object.entries(REPORT_QUESTIONS)) {
      if (reportKey === "numerology") continue;
      expect(answeredNone(questions, {}), reportKey).toBe(true);
    }
  });

  it("stops warning once any one question is answered, a typed note included", () => {
    const wealth = REPORT_QUESTIONS.wealth!;
    expect(answeredNone(wealth, { incomeToday: "salaried" })).toBe(false);
    expect(answeredNone(wealth, { concern: "a loan" })).toBe(false);
  });

  it("treats an unselected chip or a blank note as unanswered", () => {
    expect(answeredNone(REPORT_QUESTIONS.wealth!, { incomeToday: "", concern: "   " })).toBe(true);
  });

  // The phone number only overrides the one already on the account; skipping it changes nothing.
  it("never warns on numerology or on a report with no questions", () => {
    expect(answeredNone(REPORT_QUESTIONS.numerology!, {})).toBe(false);
    expect(answeredNone([], {})).toBe(false);
  });

  it("has the note and the warning translated in every app language", () => {
    const keys = ["title", "whyAsk", "skipTitle", "skipBody", "skipAnswer", "skipContinue"];
    for (const language of LANGUAGES) {
      for (const key of keys) {
        const text = lookup(language, `reports.questions.${key}`);
        expect(typeof text, `${language}: ${key}`).toBe("string");
        if (language !== "en") expect(text, `${language}: ${key}`).not.toBe(lookup("en", `reports.questions.${key}`));
      }
    }
  });
});
