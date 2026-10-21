import { test, expect } from "@playwright/test";
import { mockApi, callsTo, sseBody, type MockState } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Dussehra 2026 gift: every user's next 2 questions are on us until 21 Oct
 * 11:59 PM. The chat says so above the input, counts down after each answer
 * (the backend spends the gift first; refresh() refetches /v1/me), and a user
 * with an empty wallet can still ask while the gift runs.
 */

const REPLY = {
  contentType: "text/event-stream",
  body: sseBody([
    ["session_id", { sessionId: "11111111-1111-4111-8111-111111111111" }],
    ["token", { content: "Jupiter enters Leo on 31 October 2026." }],
    ["done", { status: "complete" }],
  ]),
};

function gift(questionsLeft: number, validUntil: string) {
  return { campaign: "dussehra_2026", questionsLeft, questionsTotal: 2, validUntil };
}

/** Answers a question and spends one gift question, as question-billing.ts does. */
function spendGift(_c: unknown, s: MockState) {
  const g = s.user.chatGift as ReturnType<typeof gift> | null;
  if (g) s.user.chatGift = g.questionsLeft > 1 ? { ...g, questionsLeft: g.questionsLeft - 1 } : null;
  return REPLY;
}

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

test("the gift shows above the chat, counts down, and lets an empty wallet ask", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { walletBalancePaise: 0, chatGift: gift(2, FUTURE) },
    overrides: { "POST /v1/chat": spendGift },
  });
  await signIn(page, "/ai-chat");

  const banner = page.getByTestId("chat-gift");
  await expect(banner).toContainText("Dussehra gift: your next 2 questions are on us");
  await expect(banner).toContainText("till");

  const input = page.getByPlaceholder("Ask your astrologer...");
  await input.fill("When does Jupiter enter Leo?");
  await input.press("Enter");
  await expect(page.getByText("Jupiter enters Leo on 31 October 2026.")).toBeVisible();
  // Asked for real (not the out-of-credit canned reply), and the count went down.
  expect(callsTo(api, "POST /v1/chat")).toHaveLength(1);
  await expect(banner).toContainText("1 more question on us");

  await input.fill("And Saturn?");
  await input.press("Enter");
  await expect(page.getByText("Jupiter enters Leo on 31 October 2026.")).toHaveCount(2);
  expect(callsTo(api, "POST /v1/chat")).toHaveLength(2);
  // Gift used up and the wallet is empty: the banner goes and the usual recharge line is back.
  await expect(banner).toHaveCount(0);
  await expect(page.getByText(/Not enough balance to ask/i)).toBeVisible();
});

test("an ended gift is not shown and does not let an empty wallet ask", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { walletBalancePaise: 0, chatGift: gift(2, new Date(Date.now() - 60_000).toISOString()) },
    overrides: { "POST /v1/chat": spendGift },
  });
  await signIn(page, "/ai-chat");

  await expect(page.getByPlaceholder("Ask your astrologer...")).toBeVisible();
  await expect(page.getByTestId("chat-gift")).toHaveCount(0);
  const input = page.getByPlaceholder("Ask your astrologer...");
  await input.fill("Hello?");
  await input.press("Enter");
  await expect(page.getByText("Hello?")).toBeVisible();
  expect(callsTo(api, "POST /v1/chat")).toHaveLength(0);
});
