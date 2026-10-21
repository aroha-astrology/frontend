import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Chat History lists voice calls as calls: when, how long, and a few sentences
 * on what was talked about. Tapping one opens what was said, like any chat.
 */

const CHAT = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "What does Saturn mean for me?",
  summary: null,
  createdAt: "2026-10-11T09:00:00.000Z",
  updatedAt: "2026-10-11T09:05:00.000Z",
  call: null,
};

const CALL = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  title: "When will I get a new job?",
  summary: null,
  createdAt: "2026-10-12T10:12:05.000Z",
  updatedAt: "2026-10-12T10:12:05.000Z",
  call: {
    startedAt: "2026-10-12T10:00:00.000Z",
    durationSeconds: 724,
    recap: "You asked when a new job will come. You were told March to May 2027 is the window.",
  },
};

const sessions = (list: unknown[]) => ({ "GET /v1/chat/sessions": () => ({ json: list }) });

test("a voice call is listed as a call, with its length and what was discussed", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { overrides: sessions([CALL, CHAT]) });
  await signIn(page, "/chat-history");

  const call = page.getByTestId("history-call");
  await expect(call).toHaveCount(1);
  await expect(call.getByText("When will I get a new job?")).toBeVisible();
  // 724 seconds reads as 12 minutes.
  await expect(call.getByText("Voice call · 12 min")).toBeVisible();
  // The day and the time it began, on a line of their own so a phone shows both.
  await expect(call.getByTestId("history-call-when")).toHaveText(/2026.*\d{1,2}:\d{2}/);
  await expect(call.getByTestId("history-call-recap")).toHaveText(
    "You asked when a new job will come. You were told March to May 2027 is the window.",
  );

  // The text chat next to it is unchanged: no call label, no note.
  const chat = page.getByTestId("history-chat");
  await expect(chat).toHaveCount(1);
  await expect(chat.getByText("What does Saturn mean for me?")).toBeVisible();
  await expect(chat.getByText("Voice call")).toHaveCount(0);
});

test("the Calls filter shows only calls, Chats only chats", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { overrides: sessions([CALL, CHAT]) });
  await signIn(page, "/chat-history");

  await page.getByRole("button", { name: "Calls", exact: true }).click();
  await expect(page.getByTestId("history-call")).toHaveCount(1);
  await expect(page.getByTestId("history-chat")).toHaveCount(0);

  await page.getByRole("button", { name: "Chats", exact: true }).click();
  await expect(page.getByTestId("history-call")).toHaveCount(0);
  await expect(page.getByTestId("history-chat")).toHaveCount(1);

  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByTestId("history-call")).toHaveCount(1);
  await expect(page.getByTestId("history-chat")).toHaveCount(1);
});

test("a call whose note is not written yet, and a very short one, still read as calls", async ({ page }) => {
  await skipLaunchOverlays(page);
  const fresh = { ...CALL, call: { ...CALL.call, durationSeconds: 8, recap: null } };
  await mockApi(page, { overrides: sessions([fresh]) });
  await signIn(page, "/chat-history");

  const call = page.getByTestId("history-call");
  await expect(call.getByText("Voice call · 1 min")).toBeVisible();
  await expect(page.getByTestId("history-call-recap")).toHaveCount(0);
  // Only calls in the list: nothing to filter between.
  await expect(page.getByRole("button", { name: "Calls", exact: true })).toHaveCount(0);
});

test("a list from a server that does not mark calls yet shows as plain chats", async ({ page }) => {
  await skipLaunchOverlays(page);
  const { call: _call, ...oldShape } = CALL;
  await mockApi(page, { overrides: sessions([oldShape, CHAT]) });
  await signIn(page, "/chat-history");

  await expect(page.getByTestId("history-chat")).toHaveCount(2);
  await expect(page.getByTestId("history-call")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Calls", exact: true })).toHaveCount(0);
});

test("tapping a call opens what was said in it", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    overrides: {
      ...sessions([CALL, CHAT]),
      "GET /v1/chat/sessions/:id": () => ({
        json: {
          id: CALL.id,
          history: [
            { role: "user", content: "When will I get a new job?" },
            { role: "assistant", content: "Beta, March to May 2027 is your window." },
          ],
        },
      }),
    },
  });
  await signIn(page, "/chat-history");

  await page.getByTestId("history-call").click();

  await expect(page).toHaveURL(new RegExp(`/ai-chat\\?sessionId=${CALL.id}`));
  await expect(page.getByText("Beta, March to May 2027 is your window.")).toBeVisible();
});
