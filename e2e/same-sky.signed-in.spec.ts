import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { AdminSkyItem, SkyPost, SkyRoom } from "../lib/same-sky";

// Same Sky rooms (switch community.sameSky): short posts in the room of the reader's own Moon sign.
// Every post is checked first, can be reported, its author can be blocked, and the admin queue has the
// last word. A stand-in server plays the backend's rules.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const FEATURES = { "community.sameSky": ON, "nav.decisions": ON };

const post = (id: string, body: string, over: Partial<SkyPost> = {}): SkyPost => ({
  id,
  handle: `Reader ${id.toUpperCase().padEnd(4, "0").slice(0, 4)}`,
  mine: false,
  body,
  status: null,
  createdAt: "2026-10-23T05:00:00.000Z",
  ...over,
});

function skyServer(start: SkyPost[], opts: { left?: number; outcome?: "APPROVED" | "PENDING" | "REJECTED"; limit?: boolean } = {}) {
  let posts = start;
  let left = opts.left ?? 3;
  const handlers: Handlers = {
    "GET /v1/sky": () => ({ json: { room: "taurus", posts, postsLeftToday: left } satisfies SkyRoom }),
    "POST /v1/sky/posts": (c) => {
      if (opts.limit) return { status: 429, json: { error: { code: "TOO_MANY_REQUESTS", message: "SKY_DAILY_LIMIT" } } };
      const outcome = opts.outcome ?? "APPROVED";
      const created = post("mine1", (c.body as { body: string }).body, { mine: true, status: outcome });
      posts = [created, ...posts];
      left -= 1;
      return { json: { post: created, outcome, reason: outcome === "APPROVED" ? "ok" : "x" } };
    },
    "POST /v1/sky/posts/:id/report": (c) => {
      const id = c.path.split("/").slice(-2)[0];
      posts = posts.filter((p) => p.id !== id);
      return { json: { ok: true, hidden: false } };
    },
    "POST /v1/sky/posts/:id/block": () => {
      posts = posts.filter((p) => p.handle !== "Reader B000");
      return { json: { ok: true } };
    },
    "DELETE /v1/sky/posts/:id": (c) => {
      const id = c.path.split("/").pop();
      posts = posts.filter((p) => p.id !== id);
      return { json: { ok: true } };
    },
  };
  return { handlers };
}

const OTHERS = [post("b000", "A gentle Moon this morning", { handle: "Reader B000" }), post("c000", "Quiet day, quiet mind", { handle: "Reader C000" })];

test.describe("the Same Sky room", () => {
  test("shows the reader's Moon-sign room with the others' posts and the Ask pill", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(OTHERS);
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");

    await expect(page.getByTestId("sky-room")).toHaveText("Readers with Moon in Taurus");
    await expect(page.getByTestId("sky-post-card")).toHaveCount(2);
    await expect(page.getByTestId("sky-left")).toHaveText("3 posts left today");
    // authors are never named, only a room handle
    await expect(page.getByTestId("sky-post-card").first()).toContainText("Reader B000");
  });

  test("a post that passes the check goes into the room", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(OTHERS, { outcome: "APPROVED" });
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");

    await page.getByTestId("sky-input").fill("Grateful for the slow evening light");
    await page.getByTestId("sky-post").click();
    await expect(page.getByTestId("sky-notice")).toHaveText("Your post is in the room.");
    await expect(page.getByTestId("sky-post-card")).toHaveCount(3);
    await expect(page.getByTestId("sky-left")).toHaveText("2 posts left today");
    expect(callsTo(api, "POST /v1/sky/posts")).toHaveLength(1);
  });

  test("a post the check is unsure about waits for a person, and only its author sees it so", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(OTHERS, { outcome: "PENDING" });
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");

    await page.getByTestId("sky-input").fill("Worried about money this month");
    await page.getByTestId("sky-post").click();
    await expect(page.getByTestId("sky-notice")).toHaveText("Your post is waiting to be looked at.");
    await expect(page.getByTestId("sky-status")).toHaveText("Waiting to be checked");
  });

  test("a rejected post says why in plain words", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(OTHERS, { outcome: "REJECTED" });
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");

    await page.getByTestId("sky-input").fill("call me on 98765 43210");
    await page.getByTestId("sky-post").click();
    await expect(page.getByTestId("sky-notice")).toContainText("no links or contact details");
  });

  test("the daily limit is explained and the Post button needs a few characters", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(OTHERS, { limit: true });
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");

    await expect(page.getByTestId("sky-post")).toBeDisabled();
    await page.getByTestId("sky-input").fill("one more thought");
    await page.getByTestId("sky-post").click();
    await expect(page.getByTestId("sky-notice")).toHaveText("You have posted 3 times today. Come back tomorrow.");
  });

  test("with no posts left the button is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(OTHERS, { left: 0 });
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");
    await page.getByTestId("sky-input").fill("a fourth thought today");
    await expect(page.getByTestId("sky-post")).toBeDisabled();
  });

  test("reporting a post asks for a reason and the post disappears for the reporter", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(OTHERS);
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");

    await page.getByTestId("sky-report").first().click();
    await page.getByTestId("sky-reason-spam").click();
    await expect(page.getByTestId("sky-notice")).toContainText("you will not see it again");
    await expect(page.getByTestId("sky-post-card")).toHaveCount(1);
    expect(callsTo(api, "POST /v1/sky/posts/b000/report")).toHaveLength(1);
    expect((callsTo(api, "POST /v1/sky/posts/b000/report")[0]!.body as { reason: string }).reason).toBe("spam");
  });

  test("blocking an author hides their posts", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(OTHERS);
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");

    await page.getByTestId("sky-block").first().click();
    await expect(page.getByTestId("sky-notice")).toHaveText("You will not see this reader's posts.");
    await expect(page.getByTestId("sky-post-card")).toHaveCount(1);
    expect(callsTo(api, "POST /v1/sky/posts/b000/block")).toHaveLength(1);
  });

  test("the author can delete their own post, and has no report or block buttons on it", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer([post("mine0", "My own thought", { mine: true, status: "APPROVED" }), ...OTHERS]);
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/sky");

    const mine = page.getByTestId("sky-post-card").filter({ hasText: "My own thought" });
    await expect(mine.getByTestId("sky-report")).toHaveCount(0);
    await expect(mine.getByTestId("sky-block")).toHaveCount(0);
    await mine.getByTestId("sky-delete").click();
    await expect(page.getByTestId("sky-post-card")).toHaveCount(2);
  });

  test("a reader whose chart is not ready has no room yet", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: FEATURES },
      overrides: { "GET /v1/sky": () => ({ json: { room: null, posts: [], postsLeftToday: 0 } }) },
    });
    await signIn(page, "/sky");
    await expect(page.getByTestId("sky-no-room")).toBeVisible();
    await expect(page.getByTestId("sky-input")).toHaveCount(0);
  });

  test("with the switch off /sky sends the reader home", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {});
    await signIn(page, "/");
    await page.goto("/sky");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("the admin queue", () => {
  const item = (id: string, over: Partial<AdminSkyItem> = {}): AdminSkyItem => ({
    id,
    room: "taurus",
    handle: "Reader B000",
    body: "Thinking about money a lot",
    status: "PENDING",
    checkReason: "model:money talk",
    reportCount: 0,
    reasons: [],
    createdAt: "2026-10-23T05:00:00.000Z",
    ...over,
  });

  test("approves, rejects and removes, and explains why each post is here", async ({ page }) => {
    await skipLaunchOverlays(page);
    let items = [
      item("w1"),
      item("w2", { body: "Another waiting post", checkReason: "policy:death" }),
      item("r1", { status: "APPROVED", body: "A reported post", checkReason: "reported", reportCount: 3, reasons: ["spam", "spam", "hate"] }),
    ];
    const handlers: Handlers = {
      "GET /v1/admin/sky/queue": () => ({ json: { total: items.length, items } }),
      "POST /v1/admin/sky/posts/:id/:action": (c) => {
        const parts = c.path.split("/");
        const id = parts[parts.length - 2];
        items = items.filter((i) => i.id !== id);
        return { json: { ok: true } };
      },
    };
    const api = await mockApi(page, { user: { isAdmin: true }, overrides: handlers });
    await signIn(page, "/admin/sky");

    await expect(page.getByTestId("admin-sky-total")).toHaveText("3 waiting");
    await expect(page.getByTestId("admin-sky-item")).toHaveCount(3);
    await expect(page.getByTestId("admin-sky-item").nth(0)).toContainText("Automatic check unsure: money talk");
    await expect(page.getByTestId("admin-sky-item").nth(1)).toContainText("Content policy: death");
    await expect(page.getByTestId("admin-sky-item").nth(2)).toContainText("Reported by 3 readers");
    await expect(page.getByTestId("admin-sky-item").nth(2)).toContainText("spam, spam, hate");

    await page.getByTestId("admin-sky-item").nth(0).getByTestId("admin-sky-approve").click();
    await expect(page.getByTestId("admin-sky-item")).toHaveCount(2);
    await page.getByTestId("admin-sky-item").nth(0).getByTestId("admin-sky-reject").click();
    await expect(page.getByTestId("admin-sky-item")).toHaveCount(1);
    await page.getByTestId("admin-sky-item").nth(0).getByTestId("admin-sky-remove").click();
    await expect(page.getByTestId("admin-sky-empty")).toBeVisible();

    expect(callsTo(api, "POST /v1/admin/sky/posts/w1/approve")).toHaveLength(1);
    expect(callsTo(api, "POST /v1/admin/sky/posts/w2/reject")).toHaveLength(1);
    expect(callsTo(api, "POST /v1/admin/sky/posts/r1/remove")).toHaveLength(1);
  });
});
