import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, passStatus, PASS_REQUIRED } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const PRIYA = "11111111-1111-4111-8111-111111111111";
const MA = "22222222-2222-4222-8222-222222222222";
const RAVI = "33333333-3333-4333-8333-333333333333";
const ASHA = "44444444-4444-4444-8444-444444444444";

const GUNA = {
  kind: "guna",
  score: 26.5,
  max: 36,
  pct: 74,
  label: "good",
  kootas: [
    { koota: "GrahaMaitri", score: 5, max: 5 },
    { koota: "Nadi", score: 8, max: 8 },
  ],
};
const HARMONY = {
  kind: "harmony",
  score: 22,
  max: 100,
  pct: 22,
  label: "poor",
  kootas: [{ koota: "GrahaMaitri", score: 1, max: 5 }],
};

const LIST = {
  bonds: [
    { profileId: PRIYA, name: "Priya", relationship: "spouse", category: "romantic", gender: "female", ready: true, compatibility: GUNA, phase: "active" },
    { profileId: MA, name: "Ma", relationship: "parent", category: "family", gender: "female", ready: false, compatibility: null, phase: null },
    { profileId: RAVI, name: "Ravi", relationship: "business_partner", category: "professional", gender: "male", ready: true, compatibility: HARMONY, phase: "testing" },
    { profileId: ASHA, name: "Asha", relationship: "travel_buddy", category: "social", gender: "female", ready: true, compatibility: { ...HARMONY, pct: 81, score: 81, label: "excellent" }, phase: "steady" },
  ],
};

/** Dates a little way ahead of today, so the bars always fall on the three-year scale. */
const ahead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const DETAIL = {
  ...LIST.bonds[0],
  phaseDetail: {
    tone: "active",
    lords: ["Moon", "Venus"],
    themes: [
      { planet: "Moon", house: 7, theme: "relationships" },
      { planet: "Venus", house: 10, theme: "career" },
    ],
    why: [
      { kind: "lordship", planet: "Venus", house: 7, effect: 1, textKey: "bonds.why.theirRules", params: { planet: "Venus", house: 7, name: "Priya" } },
      { kind: "transit", planet: "Saturn", house: 7, sign: "Pisces", effect: -1, textKey: "bonds.why.theirTransit", params: { planet: "Saturn", house: 7, sign: "Pisces", name: "Priya" } },
    ],
  },
  detail: {
    upcoming: [
      { who: "you", start: ahead(60), end: ahead(300), tone: "good", lords: ["Jupiter", "Jupiter"], why: [] },
      {
        who: "them",
        start: ahead(200),
        end: ahead(520),
        tone: "care",
        lords: ["Saturn", "Mars"],
        why: [{ kind: "lordship", planet: "Mars", house: 7, effect: 1, textKey: "bonds.why.theirRules", params: { planet: "Mars", house: 7, name: "Priya" } }],
      },
    ],
    shared: [{ start: ahead(700), end: ahead(760), tone: "good" }],
    horizon: ahead(1095),
    communication: [{ kind: "house", planet: "Moon", effect: 1, textKey: "bonds.comm.moonSame", params: { name: "Priya" } }],
    relate: [
      { key: "emotion", score: 82, level: "high", parts: [{ part: "grahaMaitri", score: 100, weight: 0.4 }, { part: "bhakoot", score: 100, weight: 0.3 }, { part: "moonElement", score: 40, weight: 0.3 }] },
      { key: "communication", score: 52, level: "mid", parts: [{ part: "mercury", score: 52, weight: 1 }] },
      {
        key: "spark",
        score: 31,
        level: "low",
        parts: [
          { part: "yoni", score: 25, weight: 0.4 },
          { part: "venusMars", score: 40, weight: 0.2 },
          { part: "marsVenus", score: 40, weight: 0.2 },
          { part: "venus", score: 25, weight: 0.2 },
        ],
      },
    ],
    mangal: { you: false, them: true, status: "oneSided" },
    dates: [
      { date: ahead(20), kind: "birthday" },
      { date: ahead(60), kind: "windowGood" },
      { date: ahead(200), kind: "theirCare" },
      { date: ahead(700), kind: "sharedGood" },
    ],
  },
};

const FRIEND_DETAIL = {
  ...LIST.bonds[3],
  phaseDetail: { tone: "steady", lords: ["Mercury", "Jupiter"], themes: [null, null], why: [] },
  detail: {
    upcoming: [],
    shared: [],
    horizon: ahead(1095),
    communication: [],
    relate: [
      { key: "emotion", score: 80, level: "high", parts: [{ part: "moonElement", score: 100, weight: 1 }] },
      { key: "communication", score: 75, level: "high", parts: [{ part: "mercury", score: 75, weight: 1 }] },
      { key: "vibe", score: 88, level: "high", parts: [{ part: "lords11", score: 100, weight: 0.3 }, { part: "tara", score: 100, weight: 0.3 }, { part: "moonElement", score: 75, weight: 0.4 }] },
    ],
    mangal: null,
    dates: [],
  },
};

const BONDS_ON = { "nav.bonds": ON, "home.bondsCard": ON };

function bondApi(extra: Record<string, unknown> = {}) {
  return {
    "GET /v1/bonds": () => ({ json: LIST }),
    "GET /v1/bonds/:id": (c: { path: string }) =>
      c.path.endsWith(MA)
        ? { json: { ...LIST.bonds[1], phaseDetail: null, detail: null } }
        : c.path.endsWith(RAVI)
          ? { json: { ...LIST.bonds[2], phaseDetail: null, detail: null } }
          : c.path.endsWith(ASHA)
            ? { json: FRIEND_DETAIL }
            : { json: DETAIL },
    ...extra,
  };
}

const sidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

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
    const api = await mockApi(page, { user: { features: BONDS_ON }, overrides: bondApi() });
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
    await expect(view.getByRole("link", { name: /Ask Aroha about Priya/ })).toHaveAttribute("href", new RegExp(`/ai-chat\\?q=.+&profile=${PRIYA}`));

    await expect(view.getByText("Priya's birthday")).toBeVisible();
    await expect(view.getByRole("button", { name: /Unlock/ })).toHaveCount(0);
    expect(callsTo(api, "POST /v1/bonds/" + PRIYA + "/unlock")).toHaveLength(0);
  });

  test("reads both people: each one's period, their transit, and the Mangal line", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: BONDS_ON }, overrides: bondApi() });
    await signIn(page, `/bonds?id=${PRIYA}`);

    const phase = page.getByTestId("bond-phase");
    await expect(phase.getByText("You · Moon period")).toBeVisible();
    await expect(phase.getByText("7th house (partnership)", { exact: true })).toBeVisible();
    await expect(phase.getByText("Priya · Venus period")).toBeVisible();
    await expect(phase.getByText("10th house (career)", { exact: true })).toBeVisible();
    await expect(phase.getByText("Your periods are about different parts of life. Give each other room for that.")).toBeVisible();
    await expect(phase.getByText("Saturn is moving through Pisces, Priya's 7th house (partnership) counted from their Moon.")).toBeVisible();

    const mangal = page.getByTestId("bond-mangal");
    await expect(
      mangal.getByText("Priya has Mangal Dosha in force and you do not. Tradition counts that as a mismatch in marriage matching."),
    ).toBeVisible();

    const dates = page.getByText("A period to go carefully begins for Priya");
    await expect(dates).toBeVisible();
    await expect(page.getByText("A supportive stretch for both of you begins")).toBeVisible();
  });

  test("How you relate: a graph, three meters, and what went into each", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: BONDS_ON }, overrides: bondApi() });
    await signIn(page, `/bonds?id=${PRIYA}`);

    const relate = page.getByTestId("bond-relate");
    await expect(relate.getByText("How you relate")).toBeVisible();
    for (const name of ["Overall", "Emotion", "Communication", "Spark"]) {
      await expect(relate.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(relate.getByText("You feel things in a similar way, so it is easy to be understood.")).toBeVisible();
    await expect(relate.getByText("Attraction is not the strong side of this bond. It rests on other things.")).toBeVisible();

    // Closed until tapped; a row and its point on the graph open the same thing.
    await expect(page.getByTestId("relate-parts-spark")).toHaveCount(0);
    await page.getByTestId("relate-row-spark").click();
    const parts = page.getByTestId("relate-parts-spark");
    await expect(parts.getByText("Yoni")).toBeVisible();
    await expect(parts.getByText("Your Venus with their Mars")).toBeVisible();
    await expect(parts.getByText("Venus signs")).toBeVisible();

    await relate.getByRole("button", { name: "Emotion 82", exact: true }).click();
    await expect(page.getByTestId("relate-parts-spark")).toHaveCount(0);
    await expect(page.getByTestId("relate-parts-emotion").getByText("Elements of your Moon signs")).toBeVisible();
  });

  test("Periods ahead: a row of bars for each person, and a tap opens the reasons", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: BONDS_ON }, overrides: bondApi() });
    await signIn(page, `/bonds?id=${PRIYA}`);

    const periods = page.getByTestId("bond-periods");
    await expect(periods.getByTestId("period-bar-you")).toHaveCount(1);
    await expect(periods.getByTestId("period-bar-them")).toHaveCount(1);
    await expect(periods.getByTestId("period-row")).toHaveCount(2);
    await expect(periods.getByText("You · Supportive period")).toBeVisible();
    await expect(periods.getByText("Priya · Go carefully")).toBeVisible();
    await expect(periods.getByText("Supportive for both of you")).toBeVisible();

    // The first period is open; tapping the other person's bar opens theirs.
    await expect(periods.getByTestId("period-detail").getByText("Jupiter–Jupiter")).toBeVisible();
    await periods.getByTestId("period-bar-them").click();
    const detail = periods.getByTestId("period-detail");
    await expect(detail.getByText("Saturn–Mars")).toBeVisible();
    await expect(detail.getByText("Mars rules Priya's 7th house (partnership).")).toBeVisible();
  });

  test("tabs sort people by group, and a low score is called challenging", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: BONDS_ON }, overrides: bondApi() });
    await signIn(page, "/bonds");

    await expect(page.getByTestId("bond-row")).toHaveCount(4);
    for (const tab of ["all", "romantic", "family", "professional", "social"]) {
      await expect(page.getByTestId(`bonds-tab-${tab}`)).toBeVisible();
    }
    await expect(page.getByTestId("bonds-tab-all")).toContainText("4");
    // A parent whose gender is known is named.
    await expect(page.getByRole("button", { name: /Ma/ })).toContainText("Mother");
    await expect(page.getByRole("button", { name: /Asha/ })).toContainText("Travel buddy");

    await page.getByTestId("bonds-tab-professional").click();
    await expect(page.getByTestId("bonds-tab-professional")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("bond-row")).toHaveCount(1);
    await expect(page.getByTestId("bond-row")).toContainText("Ravi");
    expect(new URL(page.url()).searchParams.get("tab")).toBe("professional");

    await page.getByTestId("bond-row").click();
    await expect(page.getByTestId("bond-detail").getByText("Challenging").first()).toBeVisible();
  });

  test("no tabs while everyone is in one group", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: BONDS_ON },
      overrides: bondApi({ "GET /v1/bonds": () => ({ json: { bonds: [LIST.bonds[0]] } }) }),
    });
    await signIn(page, "/bonds");
    await expect(page.getByTestId("bond-row")).toHaveCount(1);
    await expect(page.getByRole("tablist")).toHaveCount(0);
  });

  test("a friend gets the Vibe meter and no Mangal line", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: BONDS_ON }, overrides: bondApi() });
    await signIn(page, `/bonds?id=${ASHA}`);

    const relate = page.getByTestId("bond-relate");
    await expect(relate.getByText("Vibe", { exact: true })).toBeVisible();
    await expect(relate.getByText("Time together is easy and you relax around each other.")).toBeVisible();
    await expect(page.getByTestId("bond-mangal")).toHaveCount(0);
    await expect(page.getByTestId("bond-periods").getByText("No stand-out periods in the next three years.")).toBeVisible();
  });

  test("without the Pass, the page and the Home card are locked behind the subscription", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: {
        features: { ...BONDS_ON, "nav.arohaPass": ON, "paid.arohaPassB": { ...ON, pricePaise: 29900 } },
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
    await expect(homeLock.getByRole("link", { name: "Get Aroha Pass" })).toHaveAttribute("href", "/pass?tier=silver");
    await expect(page.getByTestId("bonds-card")).toHaveCount(0);

    await page.goto(`/bonds?id=${PRIYA}`);
    await expect(page.getByTestId("pass-lock").getByText("Aroha Bonds is part of Aroha Pass")).toBeVisible();
    await expect(page.getByTestId("bond-detail")).toHaveCount(0);
  });

  test("a person without a birth time asks for it", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: { "nav.bonds": ON } }, overrides: bondApi() });
    await signIn(page, `/bonds?id=${MA}`);
    await expect(page.getByText("Add Ma's birth time and place to compare charts.")).toBeVisible();

    await page.goto(`/bonds?id=${PRIYA}`);
    await expect(page.getByTestId("bond-detail").getByText("26.5 of 36")).toBeVisible();
  });

  test("a failed load says so and can be tried again", async ({ page }) => {
    await skipLaunchOverlays(page);
    let fail = true;
    await mockApi(page, {
      user: { features: BONDS_ON },
      overrides: bondApi({
        "GET /v1/bonds": () => (fail ? { status: 500, json: { error: { code: "INTERNAL", message: "boom" } } } : { json: LIST }),
      }),
    });
    await signIn(page, "/bonds");
    const error = page.getByTestId("bonds-error");
    await expect(error.getByText("Couldn't load your bonds. Please try again.")).toBeVisible();
    fail = false;
    await error.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("bond-row")).toHaveCount(4);
  });

  test("an older API without the new fields still shows the bond", async ({ page }) => {
    await skipLaunchOverlays(page);
    const old = {
      profileId: PRIYA,
      name: "Priya",
      relationship: "spouse",
      ready: true,
      compatibility: GUNA,
      phase: "active",
      phaseDetail: { tone: "active", lords: ["Moon", "Venus"], why: [] },
      detail: {
        upcoming: [{ start: ahead(60), end: ahead(300), tone: "good", lords: ["Jupiter", "Jupiter"], why: [] }],
        communication: [{ kind: "house", planet: "Moon", effect: 1, textKey: "bonds.comm.moonSame", params: { name: "Priya" } }],
        dates: [{ date: ahead(20), kind: "birthday" }],
      },
    };
    await mockApi(page, {
      user: { features: BONDS_ON },
      overrides: { "GET /v1/bonds": () => ({ json: { bonds: [old] } }), "GET /v1/bonds/:id": () => ({ json: old }) },
    });
    await signIn(page, `/bonds?id=${PRIYA}`);
    const view = page.getByTestId("bond-detail");
    await expect(view.getByText("26.5 of 36")).toBeVisible();
    await expect(view.getByText("You and Priya feel things in a very similar way.")).toBeVisible();
    await expect(view.getByTestId("period-bar-you")).toHaveCount(1);
    await expect(view.getByText("You · Moon period")).toBeVisible();
  });
});

test.describe("Aroha Bonds on a 360px phone", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("the list and a bond's page never scroll sideways", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: BONDS_ON }, overrides: bondApi() });
    await signIn(page, "/bonds");
    await expect(page.getByTestId("bond-row")).toHaveCount(4);
    expect(await sidewaysScroll(page)).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: /Priya/ }).click();
    await expect(page.getByTestId("bond-periods")).toBeVisible();
    await page.getByTestId("relate-row-spark").click();
    await expect(page.getByTestId("relate-parts-spark")).toBeVisible();
    expect(await sidewaysScroll(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("Adding a person while Aroha Bonds is on", () => {
  test("the relationship is picked in two steps: the group, then the bond", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: BONDS_ON } });
    await signIn(page, "/onboarding?mode=new-profile");

    // The form opens on the language tiles, then asks the name.
    await page.getByRole("button", { name: /English/ }).first().click();
    const nameBox = page.getByRole("textbox").first();
    await nameBox.fill("Asha");
    await nameBox.press("Enter");

    const picker = page.getByTestId("relationship-picker");
    await expect(picker.getByTestId("relationship-group-romantic")).toBeVisible();
    await expect(picker.getByTestId("relationship-situationship")).toHaveCount(0);

    await picker.getByTestId("relationship-group-romantic").click();
    for (const r of ["spouse", "fiance", "partner", "situationship", "crush", "first_love", "soulmate", "fwb", "ex"]) {
      await expect(picker.getByTestId(`relationship-${r}`)).toBeVisible();
    }
    await picker.getByRole("button", { name: "Change group" }).click();
    await picker.getByTestId("relationship-group-family").click();
    await expect(picker.getByTestId("relationship-mother_in_law")).toHaveText("Mother-in-law");

    await picker.getByTestId("relationship-mother_in_law").click();
    await expect(page.getByTestId("relationship-picker")).toHaveCount(0);
    await expect(page.getByText("Mother-in-law")).toBeVisible();
  });
});
