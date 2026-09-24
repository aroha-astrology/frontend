import { test, expect } from "@playwright/test";
import { mockApi, callsTo, sseBody } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

test("asking the astrologer streams the reply into the chat", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: {
      "POST /v1/chat": () => ({
        contentType: "text/event-stream",
        body: sseBody([
          ["session_id", { sessionId: "11111111-1111-4111-8111-111111111111" }],
          ["token", { content: "Travel looks likely in March, " }],
          ["token", { content: "when Jupiter supports your ninth house." }],
          ["done", { status: "complete" }],
        ]),
      }),
    },
  });
  await signIn(page, "/ai-chat");

  const input = page.getByPlaceholder("Ask your astrologer...");
  await input.fill("Will I travel this year?");
  await input.press("Enter");

  await expect(page.getByText(/Travel looks likely in March, when Jupiter supports your ninth house\./)).toBeVisible();
  const sent = callsTo(api, "POST /v1/chat");
  expect(sent).toHaveLength(1);
  expect(JSON.stringify(sent[0]!.body)).toContain("Will I travel this year?");
});
