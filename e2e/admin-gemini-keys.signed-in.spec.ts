import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

type Row = {
  id: string;
  name: string;
  tier: "free" | "paid";
  source: "env" | "admin";
  enabled: boolean;
  paidPosition: number | null;
  last4: string;
  available: boolean;
  coolingDown: boolean;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  createdAt: string;
};

const row = (id: string, name: string, tier: Row["tier"], last4: string): Row => ({
  id,
  name,
  tier,
  source: "env",
  enabled: true,
  paidPosition: null,
  last4,
  available: true,
  coolingDown: false,
  lastTestedAt: null,
  lastTestOk: null,
  lastTestMessage: null,
  createdAt: "2026-10-17T00:00:00Z",
});

/** A tiny stand-in for the backend: keeps the list, renumbers paid keys like the server does. */
function keyServer() {
  let keys: Row[] = [
    row("k-free-1", "free-1", "free", "aaa1"),
    row("k-subir2", "subir2", "paid", "bbb2"),
    row("k-subir1719", "subir1719", "paid", "ccc3"),
  ];
  const list = () => {
    let n = 0;
    keys = keys.map((k) => ({ ...k, paidPosition: k.tier === "paid" ? ++n : null }));
    return { keys };
  };
  const idOf = (path: string) => path.split("/")[4]!;
  const handlers: Handlers = {
    "GET /v1/admin/gemini-keys": () => ({ json: list() }),
    "POST /v1/admin/gemini-keys": (c) => {
      const body = c.body as { name: string; tier: Row["tier"]; key: string };
      const added = { ...row("k-new", body.name, body.tier, body.key.slice(-4)), source: "admin" as const };
      keys.push(added);
      return { json: list().keys.find((k) => k.id === "k-new") };
    },
    "PATCH /v1/admin/gemini-keys/:id": (c) => {
      const id = idOf(c.path);
      keys = keys.map((k) => (k.id === id ? { ...k, ...(c.body as Partial<Row>) } : k));
      return { json: list().keys.find((k) => k.id === id) };
    },
    "POST /v1/admin/gemini-keys/:id/use-first": (c) => {
      const id = idOf(c.path);
      const chosen = keys.find((k) => k.id === id)!;
      keys = [...keys.filter((k) => k.tier === "free"), chosen, ...keys.filter((k) => k.tier === "paid" && k.id !== id)];
      return { json: list() };
    },
    "POST /v1/admin/gemini-keys/:id/test": (c) => {
      const id = idOf(c.path);
      const ok = id !== "k-new";
      const message = ok ? "Works — answered in 420 ms on gemini-test" : "Key rejected (400): API key not valid.";
      keys = keys.map((k) => (k.id === id ? { ...k, lastTestOk: ok, lastTestMessage: message } : k));
      return { json: { ok, status: ok ? 200 : 400, latencyMs: 420, message } };
    },
  };
  return handlers;
}

function paidNames(page: import("@playwright/test").Page) {
  return page.getByTestId("gemini-keys-paid").getByTestId("gemini-key-name").allTextContents();
}

test.describe("Admin → Gemini Keys", () => {
  test("shows the keys by tier, reorders paid keys, switches one off, tests and adds", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { isAdmin: true }, overrides: keyServer() });
    await signIn(page, "/admin/gemini-keys");

    await expect(page.getByRole("heading", { name: "Gemini Keys" })).toBeVisible();
    await expect(page.getByTestId("gemini-keys-free")).toContainText("free-1");
    await expect.poll(() => paidNames(page)).toEqual(["subir2", "subir1719"]);
    // Only the last 4 characters of a key are ever shown.
    await expect(page.getByTestId("gemini-key-k-subir2")).toContainText("••••bbb2");

    // Use subir1719 first.
    await page.getByTestId("gemini-key-k-subir1719").getByRole("button", { name: "Use this first" }).click();
    await expect.poll(() => paidNames(page)).toEqual(["subir1719", "subir2"]);
    expect(callsTo(api, "POST /v1/admin/gemini-keys/k-subir1719/use-first")).toHaveLength(1);

    // Switch subir2 off.
    const subir2 = page.getByTestId("gemini-key-k-subir2");
    await subir2.getByRole("button", { name: "Switch off" }).click();
    await expect(subir2.getByRole("button", { name: "Switch on" })).toBeVisible();
    expect(callsTo(api, "PATCH /v1/admin/gemini-keys/k-subir2")[0]!.body).toEqual({ enabled: false });

    // Test free-1.
    const free1 = page.getByTestId("gemini-key-k-free-1");
    await free1.getByRole("button", { name: "Test" }).click();
    await expect(free1).toContainText("Works — answered in 420 ms");

    // Add a paid key; it is tested straight away and the failure is shown on its card.
    await page.getByRole("button", { name: "Add key" }).click();
    await page.getByPlaceholder("e.g. subir3").fill("subir3");
    await page.getByRole("button", { name: "Paid tier" }).click();
    await page.getByPlaceholder("Paste the key from Google AI Studio").fill("AIzaPastedKeyForTest_zzz9");
    await page.getByRole("button", { name: "Add key" }).last().click();
    expect(callsTo(api, "POST /v1/admin/gemini-keys")[0]!.body).toEqual({
      name: "subir3",
      tier: "paid",
      key: "AIzaPastedKeyForTest_zzz9",
    });
    await expect.poll(() => paidNames(page)).toEqual(["subir1719", "subir2", "subir3"]);
    await expect(page.getByTestId("gemini-key-k-new")).toContainText("Key rejected (400): API key not valid.");

    // Nothing on the page pushes it sideways at phone width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
