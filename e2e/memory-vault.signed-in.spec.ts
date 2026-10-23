import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { MemoryVault, VaultEntry } from "../lib/memory";

// Baba Ji memory (switches memory.vault / memory.rectifyChip / memory.babaMemory): the reader sees what
// the guide remembers, deletes one item or forgets everything, says "it happened", and the chat shows
// the free first reply after a check-in and the "Sharpen your birth time" chip.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const OFF = { enabled: false, pricePaise: null, originalPricePaise: null };

const entry = (id: string, text: string, over: Partial<VaultEntry> = {}): VaultEntry => ({
  id,
  text,
  toldByGuide: false,
  question: null,
  eventKind: null,
  eventDate: null,
  status: "ACTIVE",
  canConfirm: false,
  confirmed: false,
  createdAt: "2026-10-10T00:00:00.000Z",
  ...over,
});

/** A small stand-in for the backend vault: delete, forget everything, and "it happened". */
function vaultServer(start: VaultEntry[]) {
  let items = start;
  const handlers: Handlers = {
    "GET /v1/me/memory": () => ({ json: { items, freeReply: false } satisfies MemoryVault }),
    "DELETE /v1/me/memory/:id": (c) => {
      const id = c.path.split("/").pop();
      items = items.filter((i) => i.id !== id);
      return { json: { removed: 1 } };
    },
    "DELETE /v1/me/memory": () => {
      const removed = items.length;
      items = [];
      return { json: { removed } };
    },
    "POST /v1/me/memory/:id/happened": (c) => {
      const id = c.path.split("/").slice(-2)[0];
      const found = items.find((i) => i.id === id);
      if (found && !found.canConfirm) return { status: 409, json: { error: { code: "CONFLICT", message: "NOT_YET" } } };
      items = items.map((i) => (i.id === id ? { ...i, status: "DONE" as const, canConfirm: false, confirmed: true } : i));
      return { json: { ok: true } };
    },
  };
  return { handlers };
}

const ITEMS = [
  entry("e1", "has an exam", { eventKind: "exam", eventDate: "2026-10-01", canConfirm: true }),
  entry("e2", "has a trip", { eventKind: "travel", eventDate: "2027-01-10" }),
  entry("f1", "works as a designer"),
  entry("f2", "their job change window is January 2027", { toldByGuide: true, createdAt: "2026-10-12T00:00:00.000Z" }),
];

test.describe("Memory Vault", () => {
  test("lists dated things first and the rest under About you; the guide's own timings are labelled", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = vaultServer(ITEMS);
    await mockApi(page, { user: { features: { "memory.vault": ON } }, overrides: server.handlers });
    await signIn(page, "/memory");

    await expect(page.getByTestId("memory-events").getByTestId("memory-item")).toHaveCount(2);
    await expect(page.getByTestId("memory-facts").getByTestId("memory-item")).toHaveCount(2);
    await expect(page.getByTestId("memory-events")).toContainText("Exam");
    await expect(page.getByTestId("memory-facts")).toContainText("Your guide told you");
    // the internal marker never reaches the reader
    await expect(page.locator("body")).not.toContainText("PREVIOUSLY TOLD THEM");
  });

  test("deleting one item removes it from the list and from the server", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = vaultServer(ITEMS);
    const api = await mockApi(page, { user: { features: { "memory.vault": ON } }, overrides: server.handlers });
    page.on("dialog", (d) => d.accept());
    await signIn(page, "/memory");

    await page.getByTestId("memory-facts").getByTestId("memory-delete").first().click();
    await expect(page.getByTestId("memory-facts").getByTestId("memory-item")).toHaveCount(1);
    expect(callsTo(api, "DELETE /v1/me/memory/f2").length + callsTo(api, "DELETE /v1/me/memory/f1").length).toBe(1);
  });

  test("forget everything asks first, then empties the vault", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = vaultServer(ITEMS);
    const api = await mockApi(page, { user: { features: { "memory.vault": ON } }, overrides: server.handlers });
    await signIn(page, "/memory");

    await page.getByTestId("memory-forget-all").click();
    // nothing is sent until the reader confirms
    expect(callsTo(api, "DELETE /v1/me/memory")).toHaveLength(0);
    await page.getByTestId("memory-forget-all-confirm").click();
    await expect(page.getByTestId("memory-empty")).toBeVisible();
    await expect(page.getByTestId("memory-message")).toHaveText("Everything is forgotten.");
    expect(callsTo(api, "DELETE /v1/me/memory")).toHaveLength(1);
  });

  test("'It happened' is offered only for a day that has come, and marks the event confirmed", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = vaultServer(ITEMS);
    const api = await mockApi(page, { user: { features: { "memory.vault": ON } }, overrides: server.handlers });
    await signIn(page, "/memory");

    // only the exam (a past day) has the button; the trip (future) has "stop checking in" instead
    await expect(page.getByTestId("memory-happened")).toHaveCount(1);
    await expect(page.getByTestId("memory-dismiss")).toHaveCount(1);
    await page.getByTestId("memory-happened").click();
    await expect(page.getByTestId("memory-message")).toHaveText("Marked as happened.");
    await expect(page.getByTestId("memory-confirmed")).toHaveCount(1);
    await expect(page.getByTestId("memory-happened")).toHaveCount(0);
    expect(callsTo(api, "POST /v1/me/memory/e1/happened")).toHaveLength(1);
  });

  test("an empty vault says so", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = vaultServer([]);
    await mockApi(page, { user: { features: { "memory.vault": ON } }, overrides: server.handlers });
    await signIn(page, "/memory");
    await expect(page.getByTestId("memory-empty")).toBeVisible();
    await expect(page.getByTestId("memory-forget-all")).toHaveCount(0);
  });

  test("Settings links to the vault only while the switch is on", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: { "memory.vault": ON } } });
    await signIn(page, "/settings");
    await expect(page.getByTestId("memory-row")).toBeVisible();
    await page.getByTestId("memory-row").click();
    await expect(page).toHaveURL(/\/memory$/);
  });

  test("with the switch off there is no Settings row and /memory sends the reader home", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: { "memory.vault": OFF } } });
    await signIn(page, "/settings");
    await expect(page.getByTestId("memory-row")).toHaveCount(0);
    await page.goto("/memory");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("memory in the chat", () => {
  test("after a check-in the chat says the first reply is free; without one it does not", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "memory.babaMemory": ON } },
      overrides: { "GET /v1/me/memory/summary": () => ({ json: { freeReply: true, confirmedEvents: 0, suggestRectify: false } }) },
    });
    await signIn(page, "/ai-chat");
    await expect(page.getByTestId("free-reply-banner")).toHaveText("Your first reply is free");
  });

  test("no banner when there is no free reply", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "memory.babaMemory": ON } },
      overrides: { "GET /v1/me/memory/summary": () => ({ json: { freeReply: false, confirmedEvents: 0, suggestRectify: false } }) },
    });
    await signIn(page, "/ai-chat");
    await expect(page.getByTestId("chat-guide-name")).toBeVisible();
    await expect(page.getByTestId("free-reply-banner")).toHaveCount(0);
  });

  test("the 'Sharpen your birth time' chip appears after a confirmed event and opens the birth-time check", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "memory.rectifyChip": ON } },
      overrides: { "GET /v1/me/memory/summary": () => ({ json: { freeReply: false, confirmedEvents: 2, suggestRectify: true } }) },
    });
    await signIn(page, "/ai-chat");
    const chip = page.getByTestId("rectify-chip");
    await expect(chip).toHaveText("Sharpen your birth time");
    await chip.click();
    await expect(page).toHaveURL(/\/settings#birth-time$/);
  });

  test("the chip stays hidden when the server does not suggest it", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "memory.rectifyChip": ON } },
      overrides: { "GET /v1/me/memory/summary": () => ({ json: { freeReply: false, confirmedEvents: 0, suggestRectify: false } }) },
    });
    await signIn(page, "/ai-chat");
    await expect(page.getByTestId("chat-guide-name")).toBeVisible();
    await expect(page.getByTestId("rectify-chip")).toHaveCount(0);
  });
});
