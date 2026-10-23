import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, type MockState } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { primaryProfile } from "./fixtures/data";

// Owner, 2026-10-23: a demo photo before every shot, five photos, and no lines drawn on the
// result: the reader's own photos are swiped through like a carousel.

const READING = "33333333-3333-4333-8333-333333333333";
const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

async function openWizard(page: Page): Promise<MockState> {
  await skipLaunchOverlays(page);
  // No camera in the test browser: the guide must still come first, ahead of the camera message.
  await page.context().grantPermissions([]);
  const api = await mockApi(page, {
    user: { gender: "male", features: { "home.palmReading": ON } },
    overrides: {
      "GET /v1/profiles": () => ({ json: [{ ...primaryProfile, gender: "male" }] }),
      "GET /v1/palm/readings": () => ({ json: { readings: [] } }),
      "POST /v1/palm/readings": () => ({ json: { readingId: READING, primaryHand: "right" } }),
    },
  });
  await signIn(page, "/palm");
  await page.getByRole("button", { name: /Start a New Reading/ }).click();
  return api;
}

test.describe("Palm capture: a demo photo before every shot", () => {
  test("the first step shows the front-of-palm example, its tip and the hand to use", async ({ page }) => {
    await openWizard(page);
    const guide = page.getByTestId("palm-step-guide");
    await expect(guide).toBeVisible();
    await expect(guide.getByText("Photo 1 of 5")).toBeVisible();
    await expect(page.getByTestId("palm-guide-title")).toHaveText("Front of your palm");
    await expect(guide.getByText("Open your hand flat, palm facing the camera", { exact: false })).toBeVisible();
    await expect(guide.getByText("Example", { exact: true })).toBeVisible();
    await expect(page.getByTestId("palm-guide-image")).toHaveAttribute("src", "/palm-guide/front.jpg");
    // The picture itself loads (a missing file would show a broken image).
    await expect
      .poll(() => page.getByTestId("palm-guide-image").evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  });

  test("Got it closes the guide, and the example stays one tap away", async ({ page }) => {
    await openWizard(page);
    await page.getByTestId("palm-guide-ready").click();
    await expect(page.getByTestId("palm-step-guide")).toHaveCount(0);
    // No camera here, so the thumbnail (which only shows over a live camera) is not offered, and
    // the reader is not stuck: they can still upload a photo.
    await expect(page.getByRole("button", { name: "Upload a photo instead" })).toBeVisible();
  });

  test("every one of the five demo photos exists", async ({ page, request, baseURL }) => {
    await openWizard(page);
    for (const name of ["front", "side", "fingertips", "thumb", "mounts"]) {
      const res = await request.get(`${baseURL}/palm-guide/${name}.jpg`);
      expect(res.status(), name).toBe(200);
      expect(res.headers()["content-type"], name).toContain("image/jpeg");
    }
  });
});

test.describe("Palm result: the reader's photos in a carousel, nothing drawn on them", () => {
  const frames = Object.fromEntries(
    ["primaryFront", "primaryPercussion", "primaryFingertips", "primaryThumb", "primaryMounts"].map((s) => [s, { path: s }]),
  );

  async function openResult(page: Page, status: "observed" | "ready") {
    await skipLaunchOverlays(page);
    await page.addInitScript(() => window.localStorage.setItem("aroha:sharePromptSeen:v1", "1"));
    // A one-pixel JPEG answers every frame download.
    const pixel = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      "base64",
    );
    await page.route("**/v1/palm/readings/*/frames/*", (route) =>
      route.fulfill({ status: 200, contentType: "image/jpeg", body: pixel, headers: { "access-control-allow-origin": "*" } }),
    );
    const api = await mockApi(page, {
      user: { features: { "home.palmReading": ON } },
      overrides: {
        "GET /v1/palm/readings/:id": () => ({
          json: {
            id: READING,
            status,
            primaryHand: "right",
            frames,
            unlocked: status === "ready",
            confidenceScore: 85,
            observations: {
              primary: {
                handType: { element: "Earth" },
                imageQuality: { lineVisibility: 8 },
                // A line that WOULD have been drawn before: it must not appear now.
                majorLines: { lifeLine: { present: true, polyline: [[0.2, 0.2], [0.4, 0.6]], trace: { drawable: true } } },
              },
            },
            events: [{ kind: "marriage", source: "marriageLine", anchor: null, ages: [{ age: 27, palmAge: 26, agreement: "match", past: false }] }],
            ...(status === "observed" ? { allowance: { passMember: false, left: 0 } } : { sections: [{ heading: "Life", paragraphs: ["Steady."] }], scores: {} }),
          },
        }),
      },
    });
    await signIn(page, `/palm/${READING}`);
    return api;
  }

  test("all five photos are slides, labelled, with dots to jump between them", async ({ page }) => {
    await openResult(page, "observed");
    const carousel = page.getByTestId("palm-carousel");
    await expect(carousel).toBeVisible();
    for (const [slot, label] of [
      ["primaryFront", "Front of your palm"],
      ["primaryPercussion", "Side edge of your hand"],
      ["primaryFingertips", "Your four fingertips"],
      ["primaryThumb", "Your thumb"],
      ["primaryMounts", "Palm mounts, low angle"],
    ] as const) {
      await expect(page.getByTestId(`palm-slide-${slot}`)).toContainText(label);
    }
    const dots = page.getByTestId("palm-carousel-dots").getByRole("button");
    await expect(dots).toHaveCount(5);
    await dots.nth(2).click();
    await expect(dots.nth(2)).toHaveAttribute("aria-current", "true");
  });

  test("no line, no mount circle and no save-image button is drawn over the photos", async ({ page }) => {
    await openResult(page, "observed");
    await expect(page.getByTestId("palm-carousel")).toBeVisible();
    await expect(page.locator("svg path[stroke]")).toHaveCount(0);
    await expect(page.locator("svg circle[stroke-dasharray]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Save image/i })).toHaveCount(0);
  });

  test("the events are plain cards: ages locked on the free scan, shown once unlocked", async ({ page }) => {
    await openResult(page, "observed");
    const locked = page.getByTestId("palm-events");
    await expect(locked).toContainText("Marriage");
    await expect(locked).not.toContainText("27");
  });

  test("a paid reading shows the age on the card", async ({ page }) => {
    await openResult(page, "ready");
    await expect(page.getByTestId("palm-events")).toContainText("27");
  });
});

export { callsTo };
