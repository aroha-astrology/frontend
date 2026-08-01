import { describe, it, expect } from "vitest";
import { diffNameParts } from "./name-diff";

describe("diffNameParts", () => {
  it("highlights a trailing addition", () => {
    expect(diffNameParts("Priya", "Priyaa")).toEqual(["Priya", "a", ""]);
  });

  it("highlights a leading addition", () => {
    expect(diffNameParts("Rohan", "hRohan")).toEqual(["", "h", "Rohan"]);
  });

  it("highlights a middle substitution", () => {
    expect(diffNameParts("Priya", "Preeya")).toEqual(["Pr", "ee", "ya"]);
  });

  it("highlights nothing when the names are identical", () => {
    expect(diffNameParts("Aarav", "Aarav")).toEqual(["Aarav", "", ""]);
  });

  it("shows no highlight for a pure trailing removal — the dropped letter isn't in the variant string to highlight", () => {
    expect(diffNameParts("Sharmaa", "Sharma")).toEqual(["Sharma", "", ""]);
  });

  it("never lets the prefix and suffix walks overlap on a fully-different name", () => {
    const [before, changed, after] = diffNameParts("Aarav", "Zzzzz");
    expect(before + changed + after).toBe("Zzzzz");
  });
});
