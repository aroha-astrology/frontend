import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Admin -> Features: every feature shows which section it is for (Everyone, the Indian look or the
// international look), the owner can change it per feature, and filter the board by it.

type Audience = "all" | "classic" | "cosmic";
type Feature = {
  key: string;
  label: string;
  group: string;
  enabled: boolean;
  pricePaise: number | null;
  originalPricePaise: number | null;
  model: string | null;
  modelOptions: string[];
  tag: string | null;
  audience: Audience;
  defaultAudience: Audience;
};

const feature = (key: string, label: string, audience: Audience, group = "home"): Feature => ({
  key,
  label,
  group,
  enabled: false,
  pricePaise: null,
  originalPricePaise: null,
  model: null,
  modelOptions: [],
  tag: "new",
  audience,
  defaultAudience: audience,
});

/** A small stand-in for the backend: keeps the rows, applies a PUT like updateFeature does. */
function featureServer() {
  let rows: Feature[] = [
    feature("home.kundliRahasya", "Kundli Rahasya scrolls", "classic"),
    feature("home.cosmicReceipts", "Cosmic Receipts", "cosmic"),
    feature("home.circles", "Cosmic Circles", "all"),
    feature("money.coins", "Show Aroha Coins instead of ₹", "all", "money"),
  ];
  const handlers: Handlers = {
    "GET /v1/admin/features": () => ({ json: { features: rows } }),
    "PUT /v1/admin/features": (c) => {
      const body = c.body as { key: string; enabled: boolean; audience?: Audience };
      rows = rows.map((r) =>
        r.key === body.key ? { ...r, enabled: body.enabled, audience: body.audience ?? r.audience } : r,
      );
      return { json: rows.find((r) => r.key === body.key) };
    },
  };
  return { handlers, rows: () => rows };
}

test.describe("Admin → Features: who sees a feature", () => {
  test("shows each feature's section, filters by it, and lets the owner open a feature to the other section", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await skipLaunchOverlays(page);
    const server = featureServer();
    const api = await mockApi(page, { user: { isAdmin: true }, overrides: server.handlers });
    await signIn(page, "/admin/features");

    // The new Money group is on the board, and every row says who it is for.
    await expect(page.getByRole("heading", { name: "Money & Coins" })).toBeVisible();
    const rahasya = page.getByTestId("audience-home.kundliRahasya");
    await expect(rahasya.getByRole("button", { name: "Indian", pressed: true })).toBeVisible();
    await expect(page.getByTestId("audience-home.cosmicReceipts").getByRole("button", { name: "International", pressed: true })).toBeVisible();
    await expect(page.getByTestId("audience-home.circles").getByRole("button", { name: "Everyone", pressed: true })).toBeVisible();

    // Filter chips count and narrow the board.
    const filter = page.getByTestId("audience-filter");
    await expect(filter.getByRole("button", { name: /^All \(4\)/ })).toBeVisible();
    await filter.getByRole("button", { name: /^Indian only \(1\)/ }).click();
    await expect(page.getByText("Kundli Rahasya scrolls")).toBeVisible();
    await expect(page.getByText("Cosmic Receipts")).toHaveCount(0);
    await filter.getByRole("button", { name: /^International only \(1\)/ }).click();
    await expect(page.getByText("Cosmic Receipts")).toBeVisible();
    await expect(page.getByText("Kundli Rahasya scrolls")).toHaveCount(0);
    await filter.getByRole("button", { name: /^All \(4\)/ }).click();

    // Open the Indian-only feature to everyone: one PUT that only changes the audience.
    await rahasya.getByRole("button", { name: "Everyone" }).click();
    await expect(rahasya.getByRole("button", { name: "Everyone", pressed: true })).toBeVisible();
    await expect(rahasya).toContainText("changed (started as Indian)");
    const put = callsTo(api, "PUT /v1/admin/features")[0]!.body as Record<string, unknown>;
    expect(put).toMatchObject({ key: "home.kundliRahasya", enabled: false, audience: "all" });
    expect(server.rows().find((r) => r.key === "home.kundliRahasya")!.audience).toBe("all");

    // Flipping a switch does not touch the audience (the PUT leaves it out).
    await page.getByRole("switch", { name: "Toggle Cosmic Receipts" }).click();
    const toggle = callsTo(api, "PUT /v1/admin/features")[1]!.body as Record<string, unknown>;
    expect(toggle.audience).toBeUndefined();
    expect(server.rows().find((r) => r.key === "home.cosmicReceipts")!.audience).toBe("cosmic");

    // Nothing pushes the page sideways at phone width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
