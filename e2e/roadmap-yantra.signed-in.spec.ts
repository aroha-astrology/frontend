import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

const PREVIEW = {
  planet: "Jupiter",
  colours: { primary: "#F4C430", accent: "#FFE8A3", background: "#2A2106" },
  nakshatra: "Pushya",
  magicSum: 27,
  why: [
    { kind: "dasha", planet: "Jupiter", level: "mahadasha", effect: 0, textKey: "yantra.why.dasha", params: { planet: "Jupiter", until: "2039-01-01" } },
  ],
};
const SPEC = {
  ...PREVIEW,
  grid: [
    [10, 5, 12],
    [11, 9, 7],
    [6, 13, 8],
  ],
  mantra: { devanagari: "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः", iast: "oṃ grāṃ grīṃ grauṃ saḥ gurave namaḥ" },
  affirmationKey: "yantra.affirmation.jupiter",
};

test.describe("Digital Yantras & Wallpapers (roadmap step 11)", () => {
  test("the page stays hidden while nav.digitalYantra is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/yantra");
    await page.waitForURL((url) => url.pathname === "/");
    expect(callsTo(api, "GET /v1/yantra")).toHaveLength(0);
  });

  test("previews the graha and why, then buying reveals the square, mantra and a download", async ({ page }) => {
    await skipLaunchOverlays(page);
    let owned = false;
    const api = await mockApi(page, {
      user: { features: { "nav.digitalYantra": ON } },
      overrides: {
        "GET /v1/yantra": () => ({
          json: owned
            ? { preview: PREVIEW, owned: { yantra: true, wallpaper: false }, spec: SPEC, prices: { yantra: 4900, wallpaper: 2900 } }
            : { preview: PREVIEW, owned: { yantra: false, wallpaper: false }, spec: null, prices: { yantra: 4900, wallpaper: 2900 } },
        }),
        "POST /v1/yantra/:kind/buy": () => {
          owned = true;
          return {
            json: { preview: PREVIEW, owned: { yantra: true, wallpaper: false }, spec: SPEC, prices: { yantra: 4900, wallpaper: 2900 } },
          };
        },
      },
    });
    await signIn(page, "/yantra");

    const card = page.getByTestId("yantra-card");
    await expect(card.getByText("Jupiter Yantra")).toBeVisible();
    await expect(card.getByText("Birth nakshatra: Pushya")).toBeVisible();
    await expect(card.getByText(/You're in your Jupiter Mahadasha until .*2039; this yantra works with it\./)).toBeVisible();
    await expect(page.getByTestId("yantra-drawing")).toHaveCount(0);

    await page.getByRole("button", { name: "Get the yantra · ₹49" }).click();
    await expect(page.getByTestId("yantra-drawing")).toBeVisible();
    await expect(card.getByText("Every row, column and diagonal adds up to 27")).toBeVisible();
    const mantra = page.getByTestId("yantra-mantra");
    await expect(mantra.getByText("ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः")).toBeVisible();
    await expect(mantra.getByText("I grow in wisdom and share it generously.")).toBeVisible();
    expect(callsTo(api, "POST /v1/yantra/yantra/buy")).toHaveLength(1);

    // The yantra is owned, the wallpaper still for sale; the download renders a PNG.
    await expect(page.getByRole("button", { name: "Get the phone wallpaper · ₹29" })).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download yantra" }).click();
    expect((await download).suggestedFilename()).toBe("aroha-jupiter-yantra.png");
  });
});
