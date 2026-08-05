import { describe, it, expect } from "vitest";
import { isOlderBuild } from "./app-update";

describe("isOlderBuild", () => {
  it("flags an older installed build", () => {
    expect(isOlderBuild("9", 10)).toBe(true);
  });

  it("leaves current and newer builds alone", () => {
    expect(isOlderBuild("10", 10)).toBe(false);
    expect(isOlderBuild("11", 10)).toBe(false); // internal-track testers
  });

  it("stays quiet when the build string is unusable", () => {
    expect(isOlderBuild("", 10)).toBe(false);
    expect(isOlderBuild("unknown", 10)).toBe(false);
  });
});
