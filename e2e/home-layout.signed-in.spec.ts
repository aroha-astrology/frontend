import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { HOME_CARDS, defaultHomeLayout, type HomeLayoutDoc, type StoredHomeLayout } from "../lib/home-cards";

// Admin → Home Layout: the owner moves cards, saves a draft, publishes and undoes. Home then follows
// the owner's order, but only while the switch is on.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

/** A small stand-in for the backend: keeps draft / published / previous like home-layout.service does. */
function layoutServer(initial: Partial<StoredHomeLayout> = {}) {
  let stored: StoredHomeLayout = { draft: null, published: null, previous: null, ...initial };
  const handlers: Handlers = {
    "GET /v1/admin/home-layout": () => ({ json: stored }),
    "PUT /v1/admin/home-layout/draft": (c) => {
      stored = { ...stored, draft: c.body as HomeLayoutDoc };
      return { json: stored };
    },
    "POST /v1/admin/home-layout/publish": () => {
      stored = { draft: stored.draft, published: stored.draft, previous: stored.published };
      return { json: stored };
    },
    "POST /v1/admin/home-layout/undo": () => {
      stored = { draft: stored.draft, published: stored.previous, previous: null };
      return { json: stored };
    },
    "DELETE /v1/admin/home-layout/draft": () => {
      stored = { ...stored, draft: null };
      return { json: stored };
    },
    "GET /v1/admin/features": () => ({
      json: {
        features: [
          {
            key: "experience.homeLayout",
            label: "Home order",
            group: "experience",
            enabled: false,
            pricePaise: null,
            originalPricePaise: null,
            model: null,
            modelOptions: [],
            tag: "new",
          },
          {
            key: "home.remedies",
            label: "Remedies",
            group: "home",
            enabled: false,
            pricePaise: null,
            originalPricePaise: null,
            model: null,
            modelOptions: [],
            tag: null,
          },
        ],
      },
    }),
  };
  return { handlers, stored: () => stored };
}

test.describe("Admin → Home Layout", () => {
  test("moves a card, saves a draft, publishes it, and undoes the publish", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await skipLaunchOverlays(page);
    const server = layoutServer();
    const api = await mockApi(page, { user: { isAdmin: true }, overrides: server.handlers });
    await signIn(page, "/admin/home-layout");

    const vedic = page.getByTestId("look-vedic");
    await expect(vedic.getByTestId("look-vedic-card-todayReading")).toBeVisible();
    // A card whose own switch is off is marked, but stays in the list.
    await expect(vedic.getByTestId("look-vedic-card-remedies")).toContainText("switched off");
    // Nothing to save yet.
    await expect(page.getByTestId("save-draft")).toBeDisabled();

    // Move "Remedies" (last) up one place, and pick a hero for the evening.
    await vedic.getByRole("button", { name: "Move Remedies up" }).click();
    await vedic.getByTestId("look-vedic-hero-evening").selectOption("remedies");
    await expect(page.getByTestId("save-draft")).toBeEnabled();
    await expect(page.getByTestId("publish")).toBeDisabled();

    await page.getByTestId("save-draft").click();
    await expect(page.getByText("Draft saved")).toBeVisible();

    const saved = server.stored().draft!;
    const ids = HOME_CARDS.map((c) => c.id);
    // Remedies was last; it is now second to last, and the card that was second to last took its place.
    expect(saved.vedic.order.slice(-2)).toEqual(["remedies", ids[ids.length - 2]]);
    expect(saved.vedic.heroBySlot.evening).toBe("remedies");
    // The other look is untouched.
    expect(saved.cosmic.order).toEqual(ids);
    expect(callsTo(api, "PUT /v1/admin/home-layout/draft")).toHaveLength(1);

    // Publish, then undo goes back to nothing published.
    await expect(page.getByTestId("publish")).toBeEnabled();
    await page.getByTestId("publish").click();
    await expect(page.getByText("Published.")).toBeVisible();
    expect(server.stored().published).not.toBeNull();
    await expect(page.getByTestId("undo")).toBeDisabled();
  });

  test("with a layout published before, undo brings it back", async ({ page }) => {
    await skipLaunchOverlays(page);
    const first = defaultHomeLayout();
    const second = defaultHomeLayout();
    second.vedic.order = [...second.vedic.order].reverse();
    const server = layoutServer({ draft: second, published: second, previous: first });
    await mockApi(page, { user: { isAdmin: true }, overrides: server.handlers });
    await signIn(page, "/admin/home-layout");

    await expect(page.getByTestId("undo")).toBeEnabled();
    await page.getByTestId("undo").click();
    await expect(page.getByText("Went back to the layout")).toBeVisible();
    expect(server.stored().published).toEqual(first);
    await expect(page.getByTestId("undo")).toBeDisabled();
  });
});

test.describe("Home follows the owner's layout", () => {
  const remediesFirst = (): HomeLayoutDoc => {
    const doc = defaultHomeLayout();
    doc.vedic.order = ["remedies", ...doc.vedic.order.filter((id) => id !== "remedies")];
    return doc;
  };

  async function yOf(page: import("@playwright/test").Page, tour: string): Promise<number> {
    const box = await page.locator(`[data-tour="${tour}"]`).first().boundingBox();
    if (!box) throw new Error(`${tour} is not on the page`);
    return box.y;
  }

  test("with the switch on, Remedies leads the page", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "home.remedies": ON, "home.kundliCard": ON, "experience.homeLayout": ON } },
      overrides: { "GET /v1/home-layout": () => ({ json: { layout: remediesFirst(), source: "published" } }) },
    });
    await signIn(page, "/");
    await expect(page.locator('[data-tour="remedies-card"]')).toBeVisible();
    await expect(page.locator('[data-tour="kundli-summary"]')).toBeVisible();
    // The layout arrives after first paint and regroups the cards, so wait for the order to settle.
    await expect
      .poll(async () => (await yOf(page, "remedies-card").catch(() => 1e9)) < (await yOf(page, "kundli-summary").catch(() => 0)))
      .toBe(true);
  });

  test("with the switch off, the built-in order stays and the layout is never asked for", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "home.remedies": ON, "home.kundliCard": ON } },
      overrides: { "GET /v1/home-layout": () => ({ json: { layout: remediesFirst(), source: "published" } }) },
    });
    await signIn(page, "/");
    await expect(page.locator('[data-tour="kundli-summary"]')).toBeVisible();
    await expect(page.locator('[data-tour="remedies-card"]')).toBeVisible();
    expect(await yOf(page, "kundli-summary")).toBeLessThan(await yOf(page, "remedies-card"));
    expect(callsTo(api, "GET /v1/home-layout")).toHaveLength(0);
  });
});
