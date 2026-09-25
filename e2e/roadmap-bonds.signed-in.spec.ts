import { test, expect } from "@playwright/test";
import { mockApi, callsTo, passStatus, PASS_REQUIRED } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const PRIYA = "11111111-1111-4111-8111-111111111111";
const MA = "22222222-2222-4222-8222-222222222222";

const LIST = {
  bonds: [
    {
      profileId: PRIYA,
      name: "Priya",
      relationship: "spouse",
      ready: true,
      compatibility: {
        kind: "guna",
        score: 26.5,
        max: 36,
        pct: 74,
        label: "good",
        kootas: [
          { koota: "GrahaMaitri", score: 5, max: 5 },
          { koota: "Nadi", score: 8, max: 8 },
        ],
      },
      phase: "active",
    },
    { profileId: MA, name: "Ma", relationship: "parent", ready: false, compatibility: null, phase: null },
  ],
};

const DETAIL = {
  ...LIST.bonds[0],
  phaseDetail: {
    tone: "active",
    lords: ["Moon", "Venus"],
    why: [
      { kind: "lordship", planet: "Venus", house: 7, effect: 1, textKey: "bonds.why.theirRules", params: { planet: "Venus", house: 7, name: "Priya" } },
    ],
  },
  detail: {
    upcoming: [{ start: "2029-01-07", end: "2029-09-23", tone: "good", lords: ["Jupiter", "Jupiter"], why: [] }],
    communication: [{ kind: "house", planet: "Moon", effect: 1, textKey: "bonds.comm.moonSame", params: { name: "Priya" } }],
    dates: [{ date: "2026-11-03", kind: "birthday" }],
  },
};

test.describe("Aroha Bonds (roadmap step 7)", () => {
  test("the page and Home card stay hidden while the flags are off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/bonds");
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByTestId("bonds-card")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/bonds")).toHaveLength(0);
  });

  test("with the Pass: Home card → list → a bond with its full detail, no unlock step", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "nav.bonds": ON, "home.bondsCard": ON } },
      overrides: {
        "GET /v1/bonds": () => ({ json: LIST }),
        "GET /v1/bonds/:id": () => ({ json: DETAIL }),
      },
    });
    await signIn(page, "/");

    const card = page.getByTestId("bonds-card");
    await expect(card.getByText("Priya")).toBeVisible();
    await expect(card.getByText("74%")).toBeVisible();
    await expect(card.getByText("Ma")).toHaveCount(0); // not ready yet, so not on Home
    await card.getByRole("link", { name: /See all/ }).click();
    await page.waitForURL("**/bonds");

    await expect(page.getByRole("button", { name: /Ma/ })).toBeVisible();
    await page.getByRole("button", { name: /Priya/ }).click();

    const view = page.getByTestId("bond-detail");
    await expect(view.getByText("26.5 of 36")).toBeVisible();
    await expect(view.getByText("Both your charts are putting this bond in focus right now.")).toBeVisible();
    await expect(view.getByText("Venus rules Priya's 7th house (partnership).")).toBeVisible();
    await expect(view.getByRole("link", { name: /Ask Aroha about Priya/ })).toHaveAttribute("href", /\/ai-chat\?q=/);

    await expect(view.getByText("You and Priya feel things in a very similar way.")).toBeVisible();
    await expect(view.getByText("Priya's birthday")).toBeVisible();
    await expect(view.getByText("Supportive period")).toBeVisible();
    await expect(view.getByRole("button", { name: /Unlock/ })).toHaveCount(0);
    expect(callsTo(api, "POST /v1/bonds/" + PRIYA + "/unlock")).toHaveLength(0);
  });

  test("without the Pass, the page and the Home card are locked behind the subscription", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: {
        features: { "nav.bonds": ON, "home.bondsCard": ON, "nav.arohaPass": ON, "paid.arohaPassB": { ...ON, pricePaise: 29900 } },
      },
      overrides: {
        "GET /v1/bonds": () => PASS_REQUIRED,
        "GET /v1/bonds/:id": () => PASS_REQUIRED,
        "GET /v1/pass": () => ({ json: passStatus() }),
      },
    });
    await signIn(page, "/");

    const homeLock = page.getByTestId("pass-lock");
    await expect(homeLock.getByText("Aroha Bonds is part of Aroha Pass")).toBeVisible();
    await expect(homeLock.getByRole("link", { name: "Subscribe to unlock" })).toHaveAttribute("href", "/pass");
    await expect(page.getByTestId("bonds-card")).toHaveCount(0);

    await page.goto(`/bonds?id=${PRIYA}`);
    await expect(page.getByTestId("pass-lock").getByText("Aroha Bonds is part of Aroha Pass")).toBeVisible();
    await expect(page.getByTestId("bond-detail")).toHaveCount(0);
  });

  test("a person without a birth time asks for it", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "nav.bonds": ON } },
      overrides: {
        "GET /v1/bonds": () => ({ json: LIST }),
        "GET /v1/bonds/:id": (c) =>
          c.path.endsWith(MA)
            ? { json: { ...LIST.bonds[1], phaseDetail: null, detail: null } }
            : { json: DETAIL },
      },
    });
    await signIn(page, `/bonds?id=${MA}`);
    await expect(page.getByText("Add Ma's birth time and place to compare charts.")).toBeVisible();

    await page.goto(`/bonds?id=${PRIYA}`);
    await expect(page.getByTestId("bond-detail").getByText("26.5 of 36")).toBeVisible();
  });
});
