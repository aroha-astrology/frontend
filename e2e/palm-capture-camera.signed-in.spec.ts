import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { primaryProfile } from "./fixtures/data";

// Owner, 2026-10-24: the live picture shows the whole frame (the saved photo used to look "zoomed
// out" next to a cropped preview), the fingertips shot is framed in a box and saved cut to it,
// and the camera screen offers a labelled flashlight.

const READING = "44444444-4444-4444-8444-444444444444";
const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

test.use({
  permissions: ["camera"],
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

async function openWizard(page: Page) {
  await skipLaunchOverlays(page);
  const uploaded: Array<{ slot: string; width: number; height: number }> = [];
  await mockApi(page, {
    user: { gender: "male", features: { "home.palmReading": ON } },
    overrides: {
      "GET /v1/profiles": () => ({ json: [{ ...primaryProfile, gender: "male" }] }),
      "GET /v1/palm/readings": () => ({ json: { readings: [] } }),
      "POST /v1/palm/readings": () => ({ json: { readingId: READING, primaryHand: "right" } }),
    },
  });
  // Registered after mockApi (newest route wins): keep every uploaded photo to look at its size.
  await page.route("**/v1/palm/readings/*/frames/*", async (route) => {
    if (route.request().method() === "POST") {
      const slot = route.request().url().split("/").pop()!.split("?")[0]!;
      const body = route.request().postDataBuffer();
      if (body) {
        // JPEG SOF0/SOF2 marker holds the pixel size.
        for (let i = 2; i < body.length - 9; i++) {
          if (body[i] === 0xff && (body[i + 1] === 0xc0 || body[i + 1] === 0xc2)) {
            uploaded.push({ slot, height: body.readUInt16BE(i + 5), width: body.readUInt16BE(i + 7) });
            break;
          }
        }
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    await route.fallback();
  });
  await signIn(page, "/palm");
  await page.getByRole("button", { name: /Start a New Reading/ }).click();
  return uploaded;
}

async function nextShot(page: Page) {
  await page.getByTestId("palm-guide-ready").click();
  await expect(page.getByRole("button", { name: "Capture", exact: true })).toBeVisible();
}

test.describe("Palm capture camera", () => {
  test("the preview shows the whole frame and the fingertips step draws a box that the photo is cut to", async ({ page }) => {
    const uploaded = await openWizard(page);

    // Step 1: no fingertip box, and the video is not cropped to fill the screen.
    await nextShot(page);
    await expect(page.getByTestId("palm-fingertip-box")).toHaveCount(0);
    await expect(page.locator("video")).toHaveCSS("object-fit", "contain");
    await page.getByRole("button", { name: "Capture", exact: true }).click();
    await page.getByRole("button", { name: /Use this photo/i }).click();

    // Step 2 (side edge), then step 3 (fingertips).
    await nextShot(page);
    await page.getByRole("button", { name: "Capture", exact: true }).click();
    await page.getByRole("button", { name: /Use this photo/i }).click();

    await nextShot(page);
    const box = page.getByTestId("palm-fingertip-box");
    await expect(box).toBeVisible();
    await expect(box).toContainText("Place your four fingertips inside the box");
    await page.getByRole("button", { name: "Capture", exact: true }).click();
    await page.getByRole("button", { name: /Use this photo/i }).click();

    await expect.poll(() => uploaded.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
    const front = uploaded[0]!;
    const tips = uploaded[2]!;
    // The fingertips photo is the box only: wider than tall, and a small part of the full frame.
    expect(tips.width).toBeGreaterThan(tips.height);
    expect(tips.width * tips.height).toBeLessThan(front.width * front.height * 0.5);
    // The full-hand photo keeps the camera's whole picture, at the raised quality ceiling.
    expect(front.width * front.height).toBeGreaterThan(640 * 480 * 0.9);
  });
});
