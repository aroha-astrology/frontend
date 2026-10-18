import { test, expect, type Page } from "@playwright/test";
import { mockApi, passStatus } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// What the "Create Profile" row of the profile switcher says it costs (switch money.freeProfiles):
// the old price while the offer is off; with it on, the free slots first, then free with an Aroha
// Pass, then the extra price. It must say what the server will charge.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const EXTRA = { enabled: true, pricePaise: 9900, originalPricePaise: null };

async function openSwitcher(
  page: Page,
  opts: { features?: Record<string, unknown>; freeProfilesLeft?: number; withPass?: boolean },
) {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: {
      features: { ...opts.features },
      ...(opts.freeProfilesLeft !== undefined ? { freeProfilesLeft: opts.freeProfilesLeft } : {}),
    } as never,
    overrides: opts.withPass
      ? {
          "GET /v1/pass": () => ({
            json: passStatus({
              pass: {
                tier: "gold",
                source: "google_play",
                variant: "B",
                pricePaise: 29900,
                periodEnd: "2099-01-01T00:00:00Z",
                autoRenew: true,
                questionsLeft: 30,
                questionsPerPeriod: 30,
                voiceFreeMinutes: 15,
                reportDiscountPct: 20,
                features: ["timeline", "bonds"],
              },
            }),
          }),
        }
      : {},
  });
  await signIn(page, "/");
  await page.getByRole("button", { name: "Switch Profile" }).click();
  await expect(page.getByRole("heading", { name: "Switch Profile" })).toBeVisible();
}

const createRow = (page: Page) => page.getByRole("button", { name: /Create Profile/ });

test.describe("what a new profile costs", () => {
  test("with the offer off it is the old price, whatever the free-slot count says", async ({ page }) => {
    await openSwitcher(page, { freeProfilesLeft: 3 });
    await expect(createRow(page)).toContainText("Charges ₹200");
  });

  test("with the offer on, a free slot is used first and the row says how many are left", async ({ page }) => {
    await openSwitcher(page, {
      features: { "money.freeProfiles": ON, "money.profileExtra": EXTRA },
      freeProfilesLeft: 3,
    });
    await expect(createRow(page)).toContainText("3 free left");
    await expect(createRow(page)).not.toContainText("Charges");
  });

  test("with the free slots used up and no Pass it is the extra price (99)", async ({ page }) => {
    await openSwitcher(page, {
      features: { "money.freeProfiles": ON, "money.profileExtra": EXTRA },
      freeProfilesLeft: 0,
    });
    await expect(createRow(page)).toContainText("Charges ₹99");
  });

  test("with the free slots used up, a Pass member adds a profile free", async ({ page }) => {
    await openSwitcher(page, {
      features: { "money.freeProfiles": ON, "money.profileExtra": EXTRA, "nav.arohaPass": ON, "paid.arohaPassB": ON },
      freeProfilesLeft: 0,
      withPass: true,
    });
    await expect(createRow(page)).toContainText("Free with Aroha Pass");
  });

  test("in coins mode the extra price is written in coins", async ({ page }) => {
    await openSwitcher(page, {
      features: { "money.coins": ON, "money.freeProfiles": ON, "money.profileExtra": EXTRA },
      freeProfilesLeft: 0,
    });
    await expect(createRow(page)).toContainText("Charges 🪙 99");
  });
});
