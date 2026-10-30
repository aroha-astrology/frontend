import { describe, expect, it } from "vitest";
import { ANSWER_BODY, SNOOZE_MS, shouldAskBirthTime } from "./birth-time-ask";

/**
 * Audit M7: 388 readers with a ready chart never said how sure their birth time is, so chat, voice and
 * reports treat it as exact. The sheet asks them once; answering saves the accuracy and ends the question.
 */
const NOW = Date.parse("2026-10-30T10:00:00Z");
const reader = { profileCompletedAt: "2026-09-01T00:00:00Z", timeOfBirth: "10:15:00", birthTimeAccuracy: null };
const on = { enabled: true, snoozedUntil: null, now: NOW };

describe("shouldAskBirthTime", () => {
  it("asks a finished profile with a typed time and no accuracy", () => {
    expect(shouldAskBirthTime(reader, on)).toBe(true);
  });

  it("never asks when the switch is off", () => {
    expect(shouldAskBirthTime(reader, { ...on, enabled: false })).toBe(false);
  });

  it("never asks someone who already answered, whatever they answered", () => {
    for (const birthTimeAccuracy of ["exact", "approximate", "unknown"] as const) {
      expect(shouldAskBirthTime({ ...reader, birthTimeAccuracy }, on), birthTimeAccuracy).toBe(false);
    }
  });

  it("does not ask before onboarding is finished, or when there is no time to be unsure about", () => {
    expect(shouldAskBirthTime({ ...reader, profileCompletedAt: null }, on)).toBe(false);
    expect(shouldAskBirthTime({ ...reader, timeOfBirth: null }, on)).toBe(false);
    expect(shouldAskBirthTime(null, on)).toBe(false);
  });

  it("stays quiet while 'Not now' is still running, and asks again after it", () => {
    expect(shouldAskBirthTime(reader, { ...on, snoozedUntil: NOW + 1000 })).toBe(false);
    expect(shouldAskBirthTime(reader, { ...on, snoozedUntil: NOW - 1 })).toBe(true);
    expect(SNOOZE_MS).toBe(14 * 24 * 3600 * 1000);
  });
});

describe("ANSWER_BODY", () => {
  it("maps the three answers onto the accuracy and source the server already accepts", () => {
    expect(ANSWER_BODY.record).toEqual({ birthTimeAccuracy: "exact", birthTimeSource: "birth_certificate" });
    expect(ANSWER_BODY.family).toEqual({ birthTimeAccuracy: "approximate", birthTimeSource: "family_memory" });
    expect(ANSWER_BODY.unsure).toEqual({ birthTimeAccuracy: "unknown", birthTimeSource: "unknown" });
  });
});
