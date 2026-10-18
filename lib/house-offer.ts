export type HouseState = "unlocked" | "free" | "paid";

export interface HouseOfferInfo {
  enabled: boolean;
  freeHouses: number[];
  singlePaise: number;
  bundlePaise: number;
  bundleDuePaise: number;
  lockedPaidHouses: number[];
  unlockedHouses: number[];
}

// Function to determine the state of a house
// 1. If the house is in unlockedHouses, return "unlocked"
// 2. If enabled and the house is in freeHouses, return "free"
// 3. Otherwise, return "paid"
export function houseState(offer: HouseOfferInfo, house: number): HouseState {
  if (offer.unlockedHouses.includes(house)) {
    return "unlocked";
  } else if (offer.enabled && offer.freeHouses.includes(house)) {
    return "free";
  } else {
    return "paid";
  }
}

// Function to calculate the price in paise for a house
// 2. If the houseState is "unlocked" or "free", return 0
// 3. If enabled, return singlePaise
// 4. Otherwise, return legacyPaise
export function housePricePaise(offer: HouseOfferInfo, house: number, legacyPaise: number): number {
  const state = houseState(offer, house);
  if (state === "unlocked" || state === "free") {
    return 0;
  } else if (offer.enabled) {
    return offer.singlePaise;
  } else {
    return legacyPaise;
  }
}

// Function to determine if the bundle should be shown
// 3. Return true only when enabled, bundleDuePaise > 0, and lockedPaidHouses has at least 2 houses
export function showBundle(offer: HouseOfferInfo): boolean {
  return (offer.enabled && offer.bundleDuePaise > 0 && offer.lockedPaidHouses.length >= 2);
}

// Function to calculate the bundle saving in paise
// 4. If enabled, compute lockedPaidHouses.length * singlePaise - bundleDuePaise, but never less than 0
export function bundleSavingPaise(offer: HouseOfferInfo): number {
  if (!offer.enabled) {
    return 0;
  }
  const total = offer.lockedPaidHouses.length * offer.singlePaise;
  return Math.max(total - offer.bundleDuePaise, 0);
}
