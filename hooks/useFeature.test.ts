import { describe, it, expect } from "vitest";
import { resolveFeature, OPEN_FEATURE_STATE } from "./useFeature";

describe("resolveFeature", () => {
  it("returns the exact entry when the key is present", () => {
    const features = { "nav.vastu": { enabled: false, pricePaise: null } };
    expect(resolveFeature(features, "nav.vastu")).toEqual({ enabled: false, pricePaise: null });
  });

  it("returns a price when the entry carries one", () => {
    const features = { "paid.gemstone": { enabled: true, pricePaise: 12345 } };
    expect(resolveFeature(features, "paid.gemstone")).toEqual({ enabled: true, pricePaise: 12345 });
  });

  it("fails open (enabled, no price) when the key is absent from an otherwise-populated map", () => {
    const features = { "nav.vastu": { enabled: false, pricePaise: null } };
    expect(resolveFeature(features, "reports.marriage")).toEqual(OPEN_FEATURE_STATE);
  });

  it("fails open when features is undefined (e.g. signed-out user)", () => {
    expect(resolveFeature(undefined, "nav.home")).toEqual(OPEN_FEATURE_STATE);
  });

  it("fails open when features is null", () => {
    expect(resolveFeature(null, "nav.home")).toEqual(OPEN_FEATURE_STATE);
  });

  it("fails open when features is an empty object (old cached /v1/me response)", () => {
    expect(resolveFeature({}, "nav.home")).toEqual(OPEN_FEATURE_STATE);
  });
});
