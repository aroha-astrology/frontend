import { describe, it, expect } from "vitest";
import {
  billedAgentCostPaise,
  cacheHitPercent,
  estimateLlmCostPaise,
  estimateVoiceCostPaise,
  GEMINI_LIVE_AUDIO_USD_PER_MINUTE,
  listAgentCostPaise,
} from "./admin-format";

// Audit Sprint 6 (L9, L10): the cost view shows how much input Gemini served from its cache, and
// prices voice per minute of audio instead of leaving it out.

describe("cacheHitPercent", () => {
  it("is cached input over the input of the calls that reported a cache figure", () => {
    expect(
      cacheHitPercent({ cachedTokensIn: 600, tokensInOfCacheReportedCalls: 1000, cacheReportedCalls: 3 }),
    ).toBe(60);
  });
  it("is null (not 0%) when no call has reported yet, so old rows never read as 'no caching'", () => {
    expect(
      cacheHitPercent({ cachedTokensIn: 0, tokensInOfCacheReportedCalls: 0, cacheReportedCalls: 0 }),
    ).toBeNull();
  });
  it("is null when the backend is older and sends nothing", () => {
    expect(cacheHitPercent({})).toBeNull();
  });
  it("never goes above 100", () => {
    expect(
      cacheHitPercent({ cachedTokensIn: 5000, tokensInOfCacheReportedCalls: 1000, cacheReportedCalls: 1 }),
    ).toBe(100);
  });
  it("rounds to a whole percent", () => {
    expect(
      cacheHitPercent({ cachedTokensIn: 1, tokensInOfCacheReportedCalls: 3, cacheReportedCalls: 1 }),
    ).toBe(33);
  });
});

describe("estimateVoiceCostPaise", () => {
  it("prices a minute at the audio-in plus audio-out per-minute rate (an upper bound)", () => {
    // Google's Live page, 2026-11-05: $0.005/min audio in, $0.018/min audio out.
    expect(GEMINI_LIVE_AUDIO_USD_PER_MINUTE).toBeCloseTo(0.023, 6);
    expect(estimateVoiceCostPaise(60, 100)).toBeCloseTo(0.023 * 100 * 100, 4);
  });
  it("is 0 for no audio, and for a missing figure", () => {
    expect(estimateVoiceCostPaise(0, 95)).toBe(0);
    expect(estimateVoiceCostPaise(undefined, 95)).toBe(0);
  });
  it("scales with the minutes", () => {
    expect(estimateVoiceCostPaise(600, 95)).toBeCloseTo(10 * estimateVoiceCostPaise(60, 95), 6);
  });
});

describe("billed and list cost per agent row", () => {
  it("a token row costs what it always did", () => {
    const row = { paidTokensIn: 1_000_000, paidTokensOut: 1_000_000 };
    expect(billedAgentCostPaise(row, 95)).toBeCloseTo(estimateLlmCostPaise(row, 95), 6);
  });
  it("a voice row bills only the paid-key minutes, and lists all of them", () => {
    const row = { tokensIn: 0, tokensOut: 0, audioSeconds: 180, paidAudioSeconds: 60 };
    expect(billedAgentCostPaise(row, 95)).toBeCloseTo(estimateVoiceCostPaise(60, 95), 6);
    expect(listAgentCostPaise(row, 95)).toBeCloseTo(estimateVoiceCostPaise(180, 95), 6);
  });
  it("an old backend row without voice fields is unchanged", () => {
    expect(billedAgentCostPaise({ paidTokensIn: 0, paidTokensOut: 0 }, 95)).toBe(0);
    expect(listAgentCostPaise({ tokensIn: 0, tokensOut: 0 }, 95)).toBe(0);
  });
});
