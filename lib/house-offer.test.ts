import { describe, expect, it } from "vitest";
import { bundleSavingPaise, housePricePaise, houseState, showBundle, type HouseOfferInfo } from "./house-offer";

// What the house-unlock screen shows for each house under the offer (switch money.houseOffer):
// house 1 and the Mahadasha house free, the rest the single price, all of what is left in a bundle.

const offer = (over: Partial<HouseOfferInfo> = {}): HouseOfferInfo => ({
  enabled: true,
  freeHouses: [1, 7],
  singlePaise: 2500,
  bundlePaise: 14900,
  bundleDuePaise: 14900,
  lockedPaidHouses: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12],
  unlockedHouses: [],
  ...over,
});

describe("houseState", () => {
  it("is unlocked for a house already unlocked, even a free one", () => {
    expect(houseState(offer({ unlockedHouses: [4, 1] }), 4)).toBe("unlocked");
    expect(houseState(offer({ unlockedHouses: [1] }), 1)).toBe("unlocked");
  });

  it("is free for a free house that is not unlocked yet, while the offer is on", () => {
    expect(houseState(offer(), 1)).toBe("free");
    expect(houseState(offer(), 7)).toBe("free");
  });

  it("is paid for every other house", () => {
    expect(houseState(offer(), 2)).toBe("paid");
  });

  it("with the offer off nothing is free, whatever the list says", () => {
    expect(houseState(offer({ enabled: false }), 1)).toBe("paid");
  });
});

describe("housePricePaise", () => {
  it("is 0 for an unlocked or a free house", () => {
    expect(housePricePaise(offer({ unlockedHouses: [4] }), 4, 5000)).toBe(0);
    expect(housePricePaise(offer(), 7, 5000)).toBe(0);
  });

  it("is the single price for a paid house while the offer is on", () => {
    expect(housePricePaise(offer(), 2, 5000)).toBe(2500);
  });

  it("is the old one-price house price with the offer off", () => {
    expect(housePricePaise(offer({ enabled: false }), 2, 5000)).toBe(5000);
    expect(housePricePaise(offer({ enabled: false }), 1, 5000)).toBe(5000);
  });
});

describe("showBundle", () => {
  it("shows while the offer is on, something is due and at least two houses are left", () => {
    expect(showBundle(offer())).toBe(true);
    expect(showBundle(offer({ lockedPaidHouses: [2, 3], bundleDuePaise: 5000 }))).toBe(true);
  });

  it("hides with the offer off", () => {
    expect(showBundle(offer({ enabled: false }))).toBe(false);
  });

  it("hides when only one house is left, or nothing is due", () => {
    expect(showBundle(offer({ lockedPaidHouses: [2], bundleDuePaise: 2500 }))).toBe(false);
    expect(showBundle(offer({ lockedPaidHouses: [], bundleDuePaise: 0 }))).toBe(false);
    expect(showBundle(offer({ bundleDuePaise: 0 }))).toBe(false);
  });
});

describe("bundleSavingPaise", () => {
  it("is what buying the locked houses one by one would cost, less the bundle", () => {
    expect(bundleSavingPaise(offer())).toBe(10 * 2500 - 14900);
  });

  it("is 0 when the bundle is no cheaper, and never negative", () => {
    expect(bundleSavingPaise(offer({ lockedPaidHouses: [2, 3], bundleDuePaise: 5000 }))).toBe(0);
    expect(bundleSavingPaise(offer({ lockedPaidHouses: [2], bundleDuePaise: 5000 }))).toBe(0);
  });

  it("is 0 with the offer off", () => {
    expect(bundleSavingPaise(offer({ enabled: false }))).toBe(0);
  });
});
