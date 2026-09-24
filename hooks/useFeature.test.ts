import { describe, it, expect } from "vitest";
import { resolveFeature, OPEN_FEATURE_STATE, CLOSED_FEATURE_STATE } from "./useFeature";

describe("resolveFeature", () => {
  it("returns the exact entry when the key is present", () => {
    const features = { "nav.vastu": { enabled: false, pricePaise: null, originalPricePaise: null } };
    expect(resolveFeature(features, "nav.vastu")).toEqual({ enabled: false, pricePaise: null, originalPricePaise: null });
  });

  it("returns a price when the entry carries one", () => {
    const features = { "paid.gemstone": { enabled: true, pricePaise: 12345, originalPricePaise: null } };
    expect(resolveFeature(features, "paid.gemstone")).toEqual({ enabled: true, pricePaise: 12345, originalPricePaise: null });
  });

  it("fails open (enabled, no price) when the key is absent from an otherwise-populated map", () => {
    const features = { "nav.vastu": { enabled: false, pricePaise: null, originalPricePaise: null } };
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

describe("resolveFeature — failClosed (new, ship-dark features)", () => {
  it("treats a key the backend hasn't sent yet as OFF", () => {
    expect(resolveFeature({ "nav.home": { enabled: true, pricePaise: null, originalPricePaise: null } }, "home.astroWeather", { failClosed: true })).toEqual(CLOSED_FEATURE_STATE);
  });

  it("treats a signed-out user (no features) as OFF", () => {
    expect(resolveFeature(undefined, "home.astroWeather", { failClosed: true }).enabled).toBe(false);
  });

  it("still honours an explicit entry, on or off", () => {
    const on = { enabled: true, pricePaise: 4900, originalPricePaise: null };
    expect(resolveFeature({ "paid.decisionWindow": on }, "paid.decisionWindow", { failClosed: true })).toEqual(on);
  });
});
