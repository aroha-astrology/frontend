import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import "@/i18n/config";
import { setMoneyMode } from "@/lib/money";
import type { HouseOfferInfo } from "@/lib/house-offer";
import HouseUnlockDrawer from "./HouseUnlockDrawer";

// The house-unlock sheet under the house offer (switch money.houseOffer): a free house says it is free,
// a paid one shows the single price, and "unlock all" appears with its price and saving. With the
// offer off nothing about the sheet changes.

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("@/hooks/useHouseInsight", () => ({ useHouseInsight: () => ({ state: "idle", data: null }) }));

afterEach(() => setMoneyMode("rupees"));

const house = { house: 4, sign: "Cancer", signIndex: 3, lord: "Moon", planets: [] as string[] };

const offer: HouseOfferInfo = {
  enabled: true,
  freeHouses: [1, 7],
  singlePaise: 2500,
  bundlePaise: 14900,
  bundleDuePaise: 14900,
  lockedPaidHouses: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12],
  unlockedHouses: [],
};

function render(over: Partial<React.ComponentProps<typeof HouseUnlockDrawer>> = {}) {
  return renderToStaticMarkup(
    <HouseUnlockDrawer
      isOpen
      onClose={() => {}}
      house={house}
      onUnlock={async () => {}}
      balancePaise={50_000}
      unlockCostPaise={2500}
      {...over}
    />,
  );
}

describe("HouseUnlockDrawer under the house offer", () => {
  it("offers 'unlock all' with its price and its saving", () => {
    const html = render({ bundle: { offer, onUnlockAll: async () => {} } });
    expect(html).toContain('data-testid="house-bundle"');
    expect(html).toContain("Unlock all 10 houses");
    expect(html).toContain("₹149");
    expect(html).toContain("Save ₹101");
  });

  it("shows the single price on the unlock button", () => {
    const html = render({ bundle: { offer, onUnlockAll: async () => {} } });
    expect(html).toContain("Unlock for ₹25");
  });

  it("a free house says it is free and offers a free unlock, with no price", () => {
    const html = render({ unlockCostPaise: 0, bundle: { offer, onUnlockAll: async () => {} } });
    expect(html).toContain("This house is free for you");
    expect(html).toContain("Unlock — it is free");
    expect(html).not.toContain("Unlock for ₹0");
  });

  it("writes every price in coins in coins mode", () => {
    setMoneyMode("coins");
    const html = render({ bundle: { offer, onUnlockAll: async () => {} } });
    expect(html).toContain("🪙 149");
    expect(html).toContain("Save 🪙 101");
    expect(html).toContain("Unlock for 🪙 25");
  });

  it("the bundle button is disabled when the balance cannot cover it", () => {
    const html = render({ balancePaise: 10_000, bundle: { offer, onUnlockAll: async () => {} } });
    expect(html).toMatch(/data-testid="house-bundle"[^>]*/);
    const button = html.match(/<button[^>]*data-testid="house-bundle"[^>]*>/)?.[0] ?? "";
    expect(button).toMatch(/\sdisabled=""/);
  });

  it("with only one house left there is no bundle, just the single unlock", () => {
    const html = render({
      bundle: { offer: { ...offer, lockedPaidHouses: [4], bundleDuePaise: 2500 }, onUnlockAll: async () => {} },
    });
    expect(html).not.toContain("house-bundle");
    expect(html).toContain("Unlock for ₹25");
  });
});

describe("HouseUnlockDrawer with the offer off", () => {
  it("is the one-price sheet it always was: no bundle, the old price", () => {
    const html = render({ unlockCostPaise: 5000 });
    expect(html).not.toContain("house-bundle");
    expect(html).toContain("Unlock for ₹50");
    expect(html).not.toContain("is free for you");
  });
});
