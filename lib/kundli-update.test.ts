import { describe, expect, it } from "vitest";
import { KUNDLI_UPDATE_SNOOZE_MS, kundliUpdateView } from "./kundli-update";

const now = 1_800_000_000_000;
const base = { pathname: "/", snoozedUntil: null as number | null, now };
const outdated = { kundliOutdated: true, kundliUpdating: false };

describe("kundliUpdateView", () => {
  it("shows 'outdated' on Home for a reader whose chart is old", () => {
    expect(kundliUpdateView(outdated, base)).toBe("outdated");
  });

  it("shows 'updating' while the old chart is being rebuilt", () => {
    expect(kundliUpdateView({ kundliOutdated: false, kundliUpdating: true }, base)).toBe("updating");
  });

  it("shows nothing once the chart is current", () => {
    expect(kundliUpdateView({ kundliOutdated: false, kundliUpdating: false }, base)).toBeNull();
  });

  it("shows nothing on any page but Home", () => {
    for (const pathname of ["/kundli", "/chat", "/reports/abc", "/onboarding", "/profile"]) {
      expect(kundliUpdateView(outdated, { ...base, pathname })).toBeNull();
    }
  });

  it("shows nothing for a signed-out reader or an older API that sends no flag", () => {
    expect(kundliUpdateView(null, base)).toBeNull();
    expect(kundliUpdateView({}, base)).toBeNull();
  });

  it("'Later' hides it for a day, then it comes back", () => {
    expect(kundliUpdateView(outdated, { ...base, snoozedUntil: now + 1000 })).toBeNull();
    expect(kundliUpdateView(outdated, { ...base, snoozedUntil: now - 1 })).toBe("outdated");
    expect(KUNDLI_UPDATE_SNOOZE_MS).toBe(24 * 3600 * 1000);
  });
});
