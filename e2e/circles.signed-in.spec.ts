import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { primaryProfile } from "./fixtures/data";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { Circle, CircleMember } from "../lib/circles";

// Cosmic Circles (switches circles.circles / circles.invite): the people the reader keeps close, each
// with today's pulse; an invite link that links two accounts.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const FEATURES = { "circles.circles": ON, "circles.invite": ON };
const CODE = "ABCDEFGHJK";

const profile = (id: string, name: string, relationship: string) => ({
  ...primaryProfile,
  id,
  isPrimary: false,
  isActive: false,
  relationship,
  displayName: name,
});

const MAA = profile("p-maa", "Maa", "parent");
const RAVI = profile("p-ravi", "Ravi", "friend");

const member = (id: string, name: string, over: Partial<CircleMember> = {}): CircleMember => ({
  id,
  kind: "profile",
  profileId: null,
  name,
  relationship: null,
  pulse: { score: 80, tone: "glow" },
  ...over,
});

const circle = (members: CircleMember[], over: Partial<Circle> = {}): Circle => ({
  localDate: "2026-10-23",
  max: 12,
  members,
  openInvites: 0,
  ...over,
});

/** A stand-in for the backend: adds and removes members, and refuses a repeat the way the server does. */
function circleServer(start: Circle) {
  let state = start;
  const handlers: Handlers = {
    "GET /v1/profiles": () => ({ json: [primaryProfile, MAA, RAVI] }),
    "GET /v1/circles": () => ({ json: state }),
    "POST /v1/circles/members": (c) => {
      const profileId = (c.body as { profileId: string }).profileId;
      if (state.members.some((m) => m.profileId === profileId)) {
        return { status: 409, json: { error: { code: "CONFLICT", message: "ALREADY_IN_CIRCLE" } } };
      }
      const who = profileId === "p-maa" ? MAA : RAVI;
      const added = member(`m-${profileId}`, who.displayName!, { profileId, relationship: who.relationship, pulse: { score: 61, tone: "steady" } });
      state = { ...state, members: [...state.members, added] };
      return { json: added };
    },
    "DELETE /v1/circles/members/:id": (c) => {
      const id = c.path.split("/").pop();
      state = { ...state, members: state.members.filter((m) => m.id !== id) };
      return { json: { removed: true } };
    },
    "POST /v1/circles/invites": () => ({
      json: { code: CODE, path: `/circle/invite/${CODE}`, expiresAt: "2026-11-06T00:00:00.000Z" },
    }),
  };
  return { handlers };
}

test.describe("the circle", () => {
  test("Home shows the people and the brightest day; the page shows each pulse and the Family Shield", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = circleServer(
      circle([
        member("m1", "Maa", { profileId: "p-maa", relationship: "parent", pulse: { score: 84, tone: "glow" } }),
        member("m2", "Ravi", { kind: "linked", pulse: { score: 30, tone: "care" } }),
        member("m3", "Tara", { profileId: "p-tara", pulse: null }),
      ]),
    );
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/");

    const card = page.getByTestId("circles-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("circles-card-member")).toHaveCount(3);
    await expect(page.getByTestId("circles-card-bright")).toHaveText("Maa's day looks bright");

    await card.click();
    await expect(page).toHaveURL(/\/circles$/);
    const rows = page.getByTestId("circle-member");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Maa");
    await expect(rows.nth(0).getByTestId("circle-tone")).toHaveText("A bright day between you");
    await expect(rows.nth(1).getByTestId("circle-tone")).toHaveText("Go gently today");
    await expect(rows.nth(1)).toContainText("On Aroha");
    await expect(rows.nth(2).getByTestId("circle-tone")).toHaveText("Not enough birth details to read this pulse yet.");
    await expect(page.getByText("not a prediction of what anyone feels")).toBeVisible();
    await expect(page.getByTestId("circle-shield")).toHaveAttribute("href", "/shlokas/rama-raksha-stotram");
  });

  test("an empty circle invites the reader to add someone", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: FEATURES }, overrides: circleServer(circle([])).handlers });
    await signIn(page, "/");
    await expect(page.getByTestId("circles-card")).toContainText("Add someone you keep close to see today's pulse.");
  });

  test("adds a saved person, hides the ones already in, and says so when someone is already there", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = circleServer(circle([member("m-p-maa", "Maa", { profileId: "p-maa", relationship: "parent" })]));
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/circles");

    await page.getByTestId("circle-add").click();
    const picker = page.getByTestId("circle-picker");
    await expect(picker).toBeVisible();
    // Maa is already in; only Ravi can be added (the owner's own profile never shows).
    await expect(page.getByTestId("circle-pick-p-maa")).toHaveCount(0);
    await page.getByTestId("circle-pick-p-ravi").click();
    await expect(page.getByTestId("circle-member")).toHaveCount(2);
    expect(callsTo(api, "POST /v1/circles/members")[0]!.body).toEqual({ profileId: "p-ravi" });
    await expect(page.getByText("2 of 12 people")).toBeVisible();
  });

  test("a refused add shows the server's reason in words", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: FEATURES },
      overrides: {
        ...circleServer(circle([])).handlers,
        "POST /v1/circles/members": () => ({ status: 409, json: { error: { code: "CONFLICT", message: "CIRCLE_FULL" } } }),
      },
    });
    await signIn(page, "/circles");
    await page.getByTestId("circle-add").click();
    await page.getByTestId("circle-pick-p-maa").click();
    await expect(page.getByTestId("circles-problem")).toHaveText("Your circle is full.");
  });

  test("removing someone asks first and keeps the others", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = circleServer(circle([member("m1", "Maa", { profileId: "p-maa" }), member("m2", "Ravi", { profileId: "p-ravi" })]));
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/circles");

    let asked = "";
    page.once("dialog", (d) => {
      asked = d.message();
      void d.accept();
    });
    await page.getByTestId("circle-member").first().getByRole("button", { name: "Remove" }).click();
    await expect(page.getByTestId("circle-member")).toHaveCount(1);
    expect(asked).toBe("Take Maa out of your circle? Their saved profile stays.");
    expect(callsTo(api, "DELETE /v1/circles/members/m1")).toHaveLength(1);
    await expect(page.getByTestId("circle-member")).toContainText("Ravi");
  });

  test("an invite link is made on request and shown to share", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: circleServer(circle([])).handlers });
    await signIn(page, "/circles");
    await page.getByTestId("circle-invite-make").click();
    await expect(page.getByTestId("circle-invite-link")).toHaveText(new RegExp(`/circle/invite/${CODE}$`));
    expect(callsTo(api, "POST /v1/circles/invites")).toHaveLength(1);
    await expect(page.getByTestId("circle-invite")).toContainText("good for 14 days");
  });

  test("without the invite switch there is no invite button", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "circles.circles": ON, "circles.invite": { ...ON, enabled: false } } },
      overrides: circleServer(circle([])).handlers,
    });
    await signIn(page, "/circles");
    await expect(page.getByTestId("circle-add")).toBeVisible();
    await expect(page.getByTestId("circle-invite")).toHaveCount(0);
  });

  test("with the switch off there is no card and no request", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "circles.circles": { ...ON, enabled: false } } },
      overrides: circleServer(circle([])).handlers,
    });
    await signIn(page, "/");
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByTestId("circles-card")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/circles")).toHaveLength(0);
  });
});

test.describe("the invite link", () => {
  const preview = (over: Record<string, unknown> = {}) => ({ json: { inviterName: "Anita", state: "open", ...over } });

  test("a signed-out friend can read the card and is sent to sign in, keeping the code", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { overrides: { [`GET /v1/public/circle-invites/${CODE}`]: () => preview() } });
    await page.goto(`/circle/invite/${CODE}`);

    await expect(page.getByTestId("circle-invite-page")).toContainText("Anita invited you to their circle");
    await expect(page.getByTestId("circle-invite-page")).toContainText("Your birth details stay private");
    await page.getByTestId("circle-invite-signin").click();
    await expect(page).toHaveURL(/\/sign-in/);
    expect(await page.evaluate(() => window.localStorage.getItem("aroha:pendingCircleInvite:v1"))).toBe(CODE);
  });

  test("a signed-in friend taps Join once: the two accounts link", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: FEATURES },
      overrides: {
        [`GET /v1/public/circle-invites/${CODE}`]: () => preview(),
        [`POST /v1/circles/invites/${CODE}/accept`]: () => ({ json: { inviterName: "Anita" } }),
        "GET /v1/circles": () => ({ json: circle([]) }),
      },
    });
    await signIn(page, `/circle/invite/${CODE}`);
    await page.getByTestId("circle-invite-accept").click();
    await expect(page.getByTestId("circle-invite-done")).toHaveText("You are now in Anita's circle.");
    expect(callsTo(api, `POST /v1/circles/invites/${CODE}/accept`)).toHaveLength(1);
    expect(await page.evaluate(() => window.localStorage.getItem("aroha:pendingCircleInvite:v1"))).toBeNull();
  });

  test("a refused join says why", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: FEATURES },
      overrides: {
        [`GET /v1/public/circle-invites/${CODE}`]: () => preview(),
        [`POST /v1/circles/invites/${CODE}/accept`]: () => ({ status: 409, json: { error: { code: "CONFLICT", message: "CIRCLE_FULL" } } }),
      },
    });
    await signIn(page, `/circle/invite/${CODE}`);
    await page.getByTestId("circle-invite-accept").click();
    await expect(page.getByTestId("circle-invite-problem")).toHaveText("Your circle is full.");
  });

  test("a used or expired link says so and offers no Join", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: FEATURES }, overrides: { [`GET /v1/public/circle-invites/${CODE}`]: () => preview({ state: "expired" }) } });
    await signIn(page, `/circle/invite/${CODE}`);
    await expect(page.getByTestId("circle-invite-closed")).toHaveText("This invite link has expired.");
    await expect(page.getByTestId("circle-invite-accept")).toHaveCount(0);
  });

  test("a code that is not one, or that the server does not know, is not valid", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: { [`GET /v1/public/circle-invites/${CODE}`]: () => ({ status: 404, json: { error: { code: "NOT_FOUND", message: "This invite link is not valid" } } }) },
    });
    await page.goto("/circle/invite/short");
    await expect(page.getByTestId("circle-invite-invalid")).toBeVisible();
    await page.goto(`/circle/invite/${CODE}`);
    await expect(page.getByTestId("circle-invite-invalid")).toBeVisible();
  });

  test("a reader who signed up after opening the link is brought back to it from Home", async ({ page }) => {
    await skipLaunchOverlays(page);
    await page.addInitScript((code) => window.localStorage.setItem("aroha:pendingCircleInvite:v1", code), CODE);
    await mockApi(page, {
      user: { features: FEATURES },
      overrides: { [`GET /v1/public/circle-invites/${CODE}`]: () => preview(), "GET /v1/circles": () => ({ json: circle([]) }) },
    });
    await signIn(page, "/");
    await expect(page).toHaveURL(new RegExp(`/circle/invite/${CODE}$`));
    await expect(page.getByTestId("circle-invite-accept")).toBeVisible();
  });
});
