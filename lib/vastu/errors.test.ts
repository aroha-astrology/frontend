import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { reportErrorKey } from "./errors";

describe("reportErrorKey", () => {
  it.each([
    [new ApiError(409, "CONFLICT", "INSUFFICIENT_CREDITS"), "INSUFFICIENT_CREDITS"],
    [new ApiError(429, "TOO_MANY_REQUESTS", "You've reached today's limit of 20 Vastu reports."), "vastu.reportErrors.dailyLimit"],
    [new ApiError(429, "TOO_MANY_REQUESTS", "Too many requests"), "vastu.reportErrors.tooFast"],
    [new ApiError(403, "FORBIDDEN", "Data processing consent required"), "vastu.reportErrors.consent"],
    [new ApiError(403, "FORBIDDEN", "FEATURE_DISABLED"), "vastu.reportErrors.unavailable"],
    [new ApiError(422, "VALIDATION", "roomLayout must contain at least one room"), "vastu.reportErrors.invalidPlan"],
    [new ApiError(0, "network_error", "Could not reach the server"), "vastu.reportErrors.offline"],
    [new ApiError(500, "INTERNAL", "boom"), "vastu.analysis.error"],
    [new Error("?"), "vastu.analysis.error"],
  ])("%s → %s", (err, key) => {
    expect(reportErrorKey(err)).toBe(key);
  });
});
