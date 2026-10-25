import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Guide personas (switch chat.personas): four guides for each look; the pick applies at once and the
// chat header and the Cosmic labels follow it.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

const CLASSIC = [
  { id: "yogi-baba", name: "Yogi Baba" },
  { id: "pandit-vikram", name: "Pandit Vikram" },
  { id: "gauri", name: "Gauri" },
  { id: "kavitha-ji", name: "Kavitha Ji" },
];
const COSMIC = [
  { id: "orion", name: "Orion" },
  { id: "soren", name: "Soren" },
  { id: "maya", name: "Maya" },
  { id: "elena", name: "Elena" },
];

function personaServer(look: "CLASSIC_VEDIC" | "MODERN_COSMIC", start: string) {
  let current = start;
  const options = look === "CLASSIC_VEDIC" ? CLASSIC : COSMIC;
  const handlers: Handlers = {
    "GET /v1/me/persona": () => ({ json: { look, current, options } }),
    "PUT /v1/me/persona": (c) => {
      const id = (c.body as { personaId: string }).personaId;
      if (!options.some((o) => o.id === id)) return { status: 422, json: { error: { code: "UNPROCESSABLE", message: "no" } } };
      current = id;
      return { json: { look, current, options } };
    },
  };
  return handlers;
}

test.describe("the guide", () => {
  test("Settings lists the four Classic guides, the pick applies at once and the chat header follows it", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "chat.personas": ON } },
      overrides: personaServer("CLASSIC_VEDIC", "yogi-baba"),
    });
    await signIn(page, "/settings");

    await expect(page.getByTestId("guide-row")).toContainText("Yogi Baba");
    await page.getByTestId("guide-row").click();
    for (const g of CLASSIC) await expect(page.getByTestId(`guide-option-${g.id}`)).toBeVisible();
    await expect(page.getByTestId("guide-option-orion")).toHaveCount(0);
    // Each guide shows their own face in the picker, and the picture really loads.
    const gauriFace = page.getByTestId("guide-option-gauri").locator("img");
    await expect(gauriFace).toHaveAttribute("src", "/guides/gauri.webp");
    await expect.poll(() => gauriFace.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByTestId("guide-option-yogi-baba").locator("img")).toHaveAttribute("src", "/yogi-baba.webp");

    await page.getByTestId("guide-option-gauri").click();
    await expect(page.getByTestId("guide-message")).toHaveText("Your guide is now Gauri.");
    expect(callsTo(api, "PUT /v1/me/persona")).toHaveLength(1);

    await page.goto("/ai-chat");
    await expect(page.getByTestId("chat-guide-name")).toHaveText("Gauri");
    await expect(page.locator("h1").filter({ has: page.getByTestId("chat-guide-name") }).locator("img")).toHaveAttribute(
      "src",
      "/guides/gauri.webp",
    );
  });

  test("a Cosmic reader gets the four Cosmic guides", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "chat.personas": ON } },
      overrides: personaServer("MODERN_COSMIC", "orion"),
    });
    await signIn(page, "/settings");
    await page.getByTestId("guide-row").click();
    for (const g of COSMIC) await expect(page.getByTestId(`guide-option-${g.id}`)).toBeVisible();
    await expect(page.getByTestId("guide-option-gauri")).toHaveCount(0);
    await expect(page.getByTestId("guide-option-orion")).toHaveAttribute("aria-pressed", "true");
  });

  test("Yogi Baba keeps his translated name in the chat header", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "chat.personas": ON } },
      overrides: personaServer("CLASSIC_VEDIC", "yogi-baba"),
    });
    await signIn(page, "/ai-chat");
    await expect(page.getByTestId("chat-guide-name")).toHaveText("Yogi Baba");
  });

  test("with the switch off there is no guide row", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {});
    await signIn(page, "/settings");
    await expect(page.getByTestId("guide-row")).toHaveCount(0);
  });

  test("a failed pick says so and keeps the old guide", async ({ page }) => {
    await skipLaunchOverlays(page);
    const handlers = personaServer("CLASSIC_VEDIC", "yogi-baba");
    handlers["PUT /v1/me/persona"] = () => ({ status: 500, json: { error: { code: "INTERNAL", message: "x" } } });
    await mockApi(page, { user: { features: { "chat.personas": ON } }, overrides: handlers });
    await signIn(page, "/settings");
    await page.getByTestId("guide-row").click();
    await page.getByTestId("guide-option-gauri").click();
    await expect(page.getByTestId("guide-message")).toHaveText("That did not work. Please try again.");
    await expect(page.getByTestId("guide-row")).toContainText("Yogi Baba");
  });
});

test("the opening greeting names the guide the reader chose, not Yogi Baba", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: { "chat.personas": ON } },
    overrides: personaServer("MODERN_COSMIC", "maya"),
  });
  await signIn(page, "/ai-chat");
  await expect(page.getByTestId("chat-guide-name")).toHaveText("Maya");
  await expect(page.getByText(/I am Maya/)).toBeVisible();
  await expect(page.getByText(/I am Yogi Baba/)).toHaveCount(0);
});
