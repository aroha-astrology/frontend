import { describe, expect, it } from "vitest";
import { PALM_MIN_BUILD, palmNeedsUpdate } from "./app-update";

describe("palmNeedsUpdate", () => {
  it("asks an older Android build to update once the new build is on Play", () => {
    expect(palmNeedsUpdate(19, PALM_MIN_BUILD)).toBe(true);
    expect(palmNeedsUpdate(PALM_MIN_BUILD - 1, PALM_MIN_BUILD)).toBe(true);
  });

  it("lets the new build and anything newer in", () => {
    expect(palmNeedsUpdate(PALM_MIN_BUILD, PALM_MIN_BUILD)).toBe(false);
    expect(palmNeedsUpdate(PALM_MIN_BUILD + 3, PALM_MIN_BUILD + 3)).toBe(false);
  });

  it("never blocks before the new build is published (nothing newer to send them to)", () => {
    expect(palmNeedsUpdate(19, PALM_MIN_BUILD - 1)).toBe(false);
    expect(palmNeedsUpdate(1, 14)).toBe(false);
  });

  it("never blocks the web, iOS or an unreadable build", () => {
    expect(palmNeedsUpdate(null, PALM_MIN_BUILD)).toBe(false);
  });
});
