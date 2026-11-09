import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Admin → Varshik Pricing: the three tiers' price and card text, saved with no deploy.

const tier = (tierSlug: string, displayName: string, pricePaise: number, originalPricePaise: number, pageCount: number, sortOrder: number) => ({
  tierSlug,
  displayName,
  subtitle: `${displayName} subtitle`,
  badgeText: null,
  pricePaise,
  originalPricePaise,
  pageCount,
  shortDescription: `${displayName} description`,
  features: ["One", "Two"],
  excludes: [],
  isPopular: tierSlug === "gold",
  isActive: true,
  sortOrder,
  updatedAt: "2026-11-09T10:00:00Z",
});

test("the owner changes a tier's price and the change is sent to the server in paise", async ({ page }) => {
  await skipLaunchOverlays(page);
  const tiers = [tier("basic", "Varshik Snapshot", 29900, 49900, 20, 1), tier("gold", "Varshik Gold", 59900, 99900, 34, 2), tier("complete", "Varshik Sampoorna", 99900, 199900, 59, 3)];
  const api = await mockApi(page, {
    user: { isAdmin: true },
    overrides: {
      "GET /v1/admin/varshik-tiers": () => ({ json: { tiers } }),
      "PUT /v1/admin/varshik-tiers/gold": () => ({ json: { ...tiers[1], pricePaise: 64900 } }),
    },
  });
  await signIn(page, "/admin/varshik-pricing");
  const gold = page.getByTestId("varshik-tier-gold");
  await expect(gold).toBeVisible();
  await expect(page.getByTestId("varshik-tier-basic")).toBeVisible();
  await expect(page.getByTestId("varshik-tier-complete")).toBeVisible();

  const price = gold.getByLabel(/^Price \(₹\)/);
  await expect(price).toHaveValue("599");
  await price.fill("649");
  await gold.getByRole("button", { name: "Save" }).click();
  await expect(gold.getByText(/Saved\./)).toBeVisible();
  const [call] = callsTo(api, "PUT /v1/admin/varshik-tiers/gold");
  expect(call!.body).toMatchObject({ pricePaise: 64900, originalPricePaise: 99900, isActive: true });
});

test("a struck-out price lower than the price is refused before anything is sent", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { isAdmin: true },
    overrides: { "GET /v1/admin/varshik-tiers": () => ({ json: { tiers: [tier("basic", "Varshik Snapshot", 29900, 49900, 20, 1)] } }) },
  });
  await signIn(page, "/admin/varshik-pricing");
  const basic = page.getByTestId("varshik-tier-basic");
  await basic.getByLabel(/^Price \(₹\)/).fill("600");
  await basic.getByRole("button", { name: "Save" }).click();
  await expect(basic.getByText(/struck-out price must be/)).toBeVisible();
  expect(callsTo(api, "PUT /v1/admin/varshik-tiers/basic")).toHaveLength(0);
});
