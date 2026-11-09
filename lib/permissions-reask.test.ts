import { describe, expect, it } from "vitest";
import { PERMISSIONS_REASK_MS, permissionsReaskDue } from "./permissions-reask";

const now = Date.UTC(2026, 10, 9);
const day = 24 * 60 * 60 * 1000;

describe("permissionsReaskDue (native and web)", () => {
  it("asks when it never asked", () => {
    expect(permissionsReaskDue(0, now)).toBe(true);
  });
  it("stays quiet for 7 days after Not now", () => {
    expect(PERMISSIONS_REASK_MS).toBe(7 * day);
    expect(permissionsReaskDue(now - 1 * day, now)).toBe(false);
    expect(permissionsReaskDue(now - 6 * day, now)).toBe(false);
  });
  it("asks again after 7 days", () => {
    expect(permissionsReaskDue(now - 7 * day, now)).toBe(true);
    expect(permissionsReaskDue(now - 30 * day, now)).toBe(true);
  });
});
