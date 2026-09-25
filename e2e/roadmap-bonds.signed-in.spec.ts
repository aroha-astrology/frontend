import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
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

function detail(unlocked: boolean) {
  return {
    ...LIST.bonds[0],
    phaseDetail: {
      tone: "active",
      lords: ["Moon", "Venus"],
      why: [
        { kind: "lordship", planet: "Venus", house: 7, effect: 1, textKey: "bonds.why.theirRules", params: { planet: "Venus", house: 7, name: "Priya" } },
      ],
    },
    unlock: unlocked ? { unlocked: true, via: "purchase", pricePaise: 0 } : { unlocked: false, via: null, pricePaise: 4900 },
    detail: unlocked
      ? {
          upcoming: [{ start: "2029-01-07", end: "2029-09-23", tone: "good", lords: ["Jupiter", "Jupiter"], why: [] }],
          communication: [{ kind: "house", planet: "Moon", effect: 1, textKey: "bonds.comm.moonSame", params: { name: "Priya" } }],
          dates: [{ date: "2026-11-03", kind: "birthday" }],
        }
      : null,
  };
}

test.describe("Aroha Bonds (roadmap step 7)", () => {
  test("the page and Home card stay hidden while the flags are off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/bonds");
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByTestId("bonds-card")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/bonds")).toHaveLength(0);
  });

  test("Home card → list → a bond, then unlock the detail once", async ({ page }) => {
    await skipLaunchOverlays(page);
    let unlocked = false;
    const api = await mockApi(page, {
      user: { features: { "nav.bonds": ON, "home.bondsCard": ON, "paid.bondInsight": { ...ON, pricePaise: 4900 } } },
      overrides: {
        "GET /v1/bonds": () => ({ json: LIST }),
        "GET /v1/bonds/:id": () => ({ json: detail(unlocked) }),
        "POST /v1/bonds/:id/unlock": () => {
          unlocked = true;
          return { json: { unlocked: true, via: "purchase", pricePaise: 0 } };
        },
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

    await view.getByRole("button", { name: "Unlock for ₹49" }).click();
    await expect(view.getByText("You and Priya feel things in a very similar way.")).toBeVisible();
    await expect(view.getByText("Priya's birthday")).toBeVisible();
    await expect(view.getByText("Supportive period")).toBeVisible();
    expect(callsTo(api, "POST /v1/bonds/" + PRIYA + "/unlock")).toHaveLength(1);
  });

  test("a person without a birth time asks for it, and the unlock hides while paid.bondInsight is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "nav.bonds": ON } },
      overrides: {
        "GET /v1/bonds": () => ({ json: LIST }),
        "GET /v1/bonds/:id": (c) =>
          c.path.endsWith(MA)
            ? { json: { ...LIST.bonds[1], phaseDetail: null, unlock: { unlocked: false, via: null, pricePaise: 4900 }, detail: null } }
            : { json: detail(false) },
      },
    });
    await signIn(page, `/bonds?id=${MA}`);
    await expect(page.getByText("Add Ma's birth time and place to compare charts.")).toBeVisible();

    await page.goto(`/bonds?id=${PRIYA}`);
    await expect(page.getByTestId("bond-detail").getByText("26.5 of 36")).toBeVisible();
    await expect(page.getByRole("button", { name: /Unlock/ })).toHaveCount(0);
  });
});
