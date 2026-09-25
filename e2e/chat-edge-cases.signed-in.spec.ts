import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, sseBody, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { primaryProfile } from "./fixtures/data";

const NEW_SESSION = "11111111-1111-4111-8111-111111111111";
const OLD_SESSION = "33333333-3333-4333-8333-333333333333";

const reply = (text: string) => ({
  contentType: "text/event-stream",
  body: sseBody([
    ["session_id", { sessionId: NEW_SESSION }],
    ["token", { content: text }],
    ["done", { status: "complete" }],
  ]),
});
/** The backend's answer for a sessionId it doesn't hold for the active profile (checked before any charge). */
const sessionNotFound = { status: 404, json: { error: { code: "NOT_FOUND", message: "Chat session not found" } } };
const sentSessionId = (body: unknown) => (body as { sessionId?: string }).sessionId;

async function ask(page: Page, question: string) {
  const input = page.getByPlaceholder("Ask your astrologer...");
  await input.fill(question);
  await input.press("Enter");
}

test.describe("AI chat edge cases", () => {
  test("a server 'not enough credits' shows the recharge reply, not a connection error", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: {
        "POST /v1/chat": () => ({ status: 409, json: { error: { code: "CONFLICT", message: "Not enough credits to ask a question" } } }),
      },
    });
    await signIn(page, "/ai-chat");

    await ask(page, "Will I travel this year?");

    await expect(page.getByText("You're out of balance. Recharge to continue this conversation.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Recharge", exact: true })).toHaveAttribute("href", "/payment");
    await expect(page.getByText("Failed to connect to the astrologer")).toHaveCount(0);
  });

  test("a saved chat that can't be opened says so, and the next message starts a new chat", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      overrides: {
        "GET /v1/chat/sessions/:id": () => sessionNotFound,
        "POST /v1/chat": () => reply("A fresh answer."),
      },
    });
    await signIn(page, `/ai-chat?sessionId=${OLD_SESSION}`);

    await expect(page.getByTestId("chat-unavailable")).toHaveText(
      "This chat couldn't be opened, so your next message will start a new one.",
    );
    await expect(page).not.toHaveURL(new RegExp(OLD_SESSION));

    await ask(page, "Will I travel this year?");
    await expect(page.getByText("A fresh answer.")).toBeVisible();
    await expect(page.getByTestId("chat-unavailable")).toHaveCount(0);
    const sent = callsTo(api, "POST /v1/chat");
    expect(sent).toHaveLength(1);
    expect(sentSessionId(sent[0]!.body)).toBeUndefined();
  });

  test("if the chat is gone when you send, the question stays in the box and sending again starts a new chat", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      overrides: {
        "GET /v1/chat/sessions/:id": () => ({
          json: {
            history: [
              { role: "user", content: "Old question?" },
              { role: "assistant", content: "An old answer." },
            ],
          },
        }),
        "POST /v1/chat": (c) => (sentSessionId(c.body) ? sessionNotFound : reply("A fresh answer.")),
      },
    });
    await signIn(page, `/ai-chat?sessionId=${OLD_SESSION}`);
    await expect(page.getByText("An old answer.")).toBeVisible();

    await ask(page, "And next year?");
    await expect(page.getByTestId("chat-unavailable")).toBeVisible();
    await expect(page.getByPlaceholder("Ask your astrologer...")).toHaveValue("And next year?");
    await expect(page.getByText("Failed to connect to the astrologer")).toHaveCount(0);

    await page.getByPlaceholder("Ask your astrologer...").press("Enter");
    await expect(page.getByText("A fresh answer.")).toBeVisible();
    const sent = callsTo(api, "POST /v1/chat");
    expect(sent.map((c) => sentSessionId(c.body))).toEqual([OLD_SESSION, undefined]);
  });

  test("switching profile mid-chat starts a fresh conversation for the new profile", async ({ page }) => {
    await skipLaunchOverlays(page);
    const ravi = { ...primaryProfile, id: "44444444-4444-4444-8444-444444444444", isPrimary: false, isActive: false, displayName: "Ravi", relationship: "spouse" };
    let activeId = primaryProfile.id;
    const profiles = () => [primaryProfile, ravi].map((p) => ({ ...p, isActive: p.id === activeId }));
    const sessions: Record<string, string> = {};
    const chat: Handlers[string] = (c) => {
      const sid = sentSessionId(c.body);
      // Like the server: a session only continues under the profile it was started with.
      if (sid && sessions[sid] !== activeId) return sessionNotFound;
      const id = sid ?? `5555555${Object.keys(sessions).length}-5555-4555-8555-555555555555`;
      sessions[id] = activeId;
      return {
        contentType: "text/event-stream",
        body: sseBody([
          ["session_id", { sessionId: id }],
          ["token", { content: `Answer for ${activeId === ravi.id ? "Ravi" : "Asha"}.` }],
          ["done", { status: "complete" }],
        ]),
      };
    };
    const api = await mockApi(page, {
      overrides: {
        "GET /v1/profiles": () => ({ json: profiles() }),
        "POST /v1/profiles/:id/activate": (c) => {
          activeId = c.path.split("/")[3]!;
          return { json: profiles().find((p) => p.id === activeId) };
        },
        "POST /v1/chat": chat,
      },
    });
    await signIn(page, "/ai-chat");

    await ask(page, "What about my career?");
    await expect(page.getByText("Answer for Asha.")).toBeVisible();

    await page.getByRole("button", { name: "Menu", exact: true }).first().click();
    await page.getByRole("button", { name: "Add Profile", exact: true }).click();
    await page.getByRole("button", { name: /Ravi/ }).click();
    await expect.poll(() => activeId).toBe(ravi.id);
    await page.keyboard.press("Escape");

    await expect(page.getByText("What about my career?")).toHaveCount(0);
    await expect(page.getByText("Answer for Asha.")).toHaveCount(0);
    await expect(page).not.toHaveURL(/sessionId=/);

    await ask(page, "And for my husband?");
    await expect(page.getByText("Answer for Ravi.")).toBeVisible();
    await expect(page.getByText("Failed to connect to the astrologer")).toHaveCount(0);
    const sent = callsTo(api, "POST /v1/chat");
    expect(sent).toHaveLength(2);
    expect(sentSessionId(sent[1]!.body)).toBeUndefined();
  });
});
