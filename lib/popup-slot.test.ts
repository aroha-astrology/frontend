import { describe, expect, it } from "vitest";
import { canOpenPopup, POPUP_ORDER, type PopupId } from "./popup-slot";

const none = new Set<PopupId>();

describe("one pop-up per app open", () => {
  it("lists the priority order from the L1 spec", () => {
    expect(POPUP_ORDER).toEqual(["update", "permissions", "welcome", "varshik-launch", "festival-gift", "rate-us"]);
  });
  it("opens when nothing holds the slot and nothing above is pending", () => {
    expect(canOpenPopup("rate-us", { holder: null, pending: none })).toBe(true);
  });
  it("a promo waits while a higher-priority pop-up is still deciding", () => {
    expect(canOpenPopup("festival-gift", { holder: null, pending: new Set<PopupId>(["varshik-launch"]) })).toBe(false);
    expect(canOpenPopup("rate-us", { holder: null, pending: new Set<PopupId>(["festival-gift"]) })).toBe(false);
  });
  it("a lower-priority pending pop-up never blocks a higher one", () => {
    expect(canOpenPopup("varshik-launch", { holder: null, pending: new Set<PopupId>(["rate-us"]) })).toBe(true);
  });
  it("once one promo has the slot, no other promo opens this visit", () => {
    expect(canOpenPopup("rate-us", { holder: "varshik-launch", pending: none })).toBe(false);
    expect(canOpenPopup("festival-gift", { holder: "varshik-launch", pending: none })).toBe(false);
    expect(canOpenPopup("varshik-launch", { holder: "varshik-launch", pending: none })).toBe(true);
  });
  it("a promo does not open after a first-run pop-up has shown", () => {
    expect(canOpenPopup("varshik-launch", { holder: "welcome", pending: none })).toBe(false);
    expect(canOpenPopup("rate-us", { holder: "permissions", pending: none })).toBe(false);
  });
  it("the first-run pop-ups keep their own sequence (permissions, then welcome)", () => {
    expect(canOpenPopup("welcome", { holder: "permissions", pending: none })).toBe(true);
    expect(canOpenPopup("permissions", { holder: "update", pending: none })).toBe(true);
  });
  it("a first-run pop-up never waits on another first-run one still deciding (they sequence themselves)", () => {
    expect(canOpenPopup("welcome", { holder: null, pending: new Set<PopupId>(["update", "permissions"]) })).toBe(true);
    expect(canOpenPopup("permissions", { holder: null, pending: new Set<PopupId>(["update"]) })).toBe(true);
  });
  it("a promo still waits for every first-run pop-up that is deciding", () => {
    expect(canOpenPopup("varshik-launch", { holder: null, pending: new Set<PopupId>(["welcome"]) })).toBe(false);
    expect(canOpenPopup("rate-us", { holder: null, pending: new Set<PopupId>(["update"]) })).toBe(false);
  });
  it("a first-run pop-up does not open after a promo", () => {
    expect(canOpenPopup("welcome", { holder: "rate-us", pending: none })).toBe(false);
  });
});
