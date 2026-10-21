import { test, expect, type Page } from "@playwright/test";
import { mockApi, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Bugs the owner found on the phone on 2026-10-15:
 * - Gita cards showed only "धृतराष्ट्र उवाच" (the speaker line), nothing else.
 * - Gita Play played in place beside a second repeat icon; it should open the
 *   chant screen with the bead counter, and the old verse page should go.
 * - The Yogas/Doshas boxes were closed, with nothing saying they open.
 * - The menu said "Version 0.1.0".
 */

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

const VERSES = [
  {
    id: "ch1-v1",
    chapter: 1,
    verse: 1,
    sanskrit: "धृतराष्ट्र उवाच\n\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।\n\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय॥",
    mainCategory: "कथाप्रसङ्गः",
    tags: [],
  },
  {
    id: "ch2-v47",
    chapter: 2,
    verse: 47,
    sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\n\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    mainCategory: "कर्मयोग",
    tags: ["anxiety"],
  },
];

const GITA_API: Handlers = { "GET /v1/gita/verses": () => ({ json: { verses: VERSES } }) };

async function open(page: Page, path: string, overrides: Handlers = {}) {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { features: { "nav.shlokas": ON, "nav.gita": ON } }, overrides: { ...GITA_API, ...overrides } });
  await signIn(page, path);
}

test.describe("Gita list", () => {
  test("a card shows the verse and who speaks, not only the speaker line", async ({ page }) => {
    await open(page, "/shlokas");
    await page.getByRole("button", { name: "Gita" }).click();

    const first = page.getByTestId("gita-row").first();
    await expect(first).toContainText("धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः");
    await expect(first.getByTestId("gita-speaker")).toHaveText("Dhritarashtra says");
    await expect(first).toContainText("Narrative & Context");
    await expect(first.locator("img")).toHaveAttribute("src", "/shlokas/img/gita-47.webp");
  });

  test("Play opens the chant screen with the bead counter; no second icon", async ({ page }) => {
    await open(page, "/shlokas");
    await page.getByRole("button", { name: "Gita" }).click();

    const row = page.getByTestId("gita-row").nth(1);
    await expect(row.getByRole("button")).toHaveCount(0);
    await expect(row.getByRole("link", { name: "Chant this" })).toHaveCount(1);

    await row.getByRole("link", { name: "Chant this" }).click();
    await page.waitForURL((url) => url.pathname === "/shlokas/mala" && url.searchParams.get("verse") === "ch2-v47");
    await expect(page.getByText("Tap the Rudraksha to chant").or(page.getByText("Current Mantra")).first()).toBeVisible();
    await expect(page.getByText("कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।").first()).toBeVisible();
    // This screen is the verse's page now; there is nowhere else to go.
    await expect(page.getByRole("link", { name: "View full verse" })).toHaveCount(0);
  });

  test("the old verse page forwards to the chant screen", async ({ page }) => {
    await open(page, "/gita/ch2-v47");
    await page.waitForURL((url) => url.pathname === "/shlokas/mala" && url.searchParams.get("verse") === "ch2-v47");
    expect(new URL(page.url()).searchParams.get("type")).toBe("gita");
  });
});

test("Kundli opens with the yoga and dosha lists showing", async ({ page }) => {
  await open(page, "/kundli", {
    "GET /v1/kundli": () => ({
      json: {
        status: "ready",
        chart: { planets: [], houses: [] },
        dasha: null,
        yogas: {
          yogas: [
            { name: "Gaja Kesari Yoga", present: true, strength: "strong", description: "Jupiter and the Moon support each other." },
            { name: "Budha Aditya Yoga", present: true, strength: "medium", description: "The Sun and Mercury sit together." },
          ],
        },
        doshas: { mangal: { present: true, severity: "low", description: "A mild Mars placement." } },
      },
    }),
  });

  await expect(page.getByText("2 Yogas found")).toBeVisible();
  await expect(page.getByText("Yogas Detected")).toBeVisible();
  await expect(page.getByText("Gaja Kesari Yoga")).toBeVisible();
  await expect(page.getByText("Doshas Detected")).toBeVisible();
});

test("the menu shows the app version, not 0.1.0", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page);
  await signIn(page, "/");

  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByText(/^Version /)).toHaveText("Version 1.16.0");
});
