import { describe, expect, it } from "vitest";
import { stepsDone } from "./VarshikWaiting";

describe("VarshikWaiting steps", () => {
  it("follows the API's own done and total (6 groups since C3)", () => {
    expect(stepsDone(undefined)).toBe(0);
    expect(stepsDone({ done: 0, total: 6 })).toBe(0);
    expect(stepsDone({ done: 3, total: 6 })).toBe(3);
  });

  it("never ticks the last step while the report is still being written", () => {
    expect(stepsDone({ done: 5, total: 6 })).toBe(5);
    expect(stepsDone({ done: 6, total: 6 })).toBe(5);
  });

  it("scales a different total onto the named steps instead of assuming one", () => {
    expect(stepsDone({ done: 4, total: 8 })).toBe(3);
    expect(stepsDone({ done: 7, total: 8 })).toBe(5);
    expect(stepsDone({ done: 2, total: 0 })).toBe(0);
  });
});
