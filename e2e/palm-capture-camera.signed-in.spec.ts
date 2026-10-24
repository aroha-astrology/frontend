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
  // The example photo fades out; until it is gone it would take the taps meant for the camera.
  await expect(page.getByTestId("palm-step-guide")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Capture", exact: true })).toBeVisible();
}

test.describe("Palm photo upload from the gallery", () => {
  /** A noisy JPEG like a phone gallery photo: 6000x4500 pixels and well over the server's 6 MB limit. */
  async function bigPhoto(page: Page): Promise<Buffer> {
    const b64 = await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 6000;
      c.height = 4500;
      const ctx = c.getContext("2d")!;
      const img = ctx.createImageData(c.width, c.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (i * 2654435761) >>> 24;
        img.data[i] = v;
        img.data[i + 1] = (v * 7) & 255;
        img.data[i + 2] = (v * 13) & 255;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.98));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = "";
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(s);
    });
    return Buffer.from(b64, "base64");
  }

  test("a large gallery photo is shrunk below the server limit before it is uploaded", async ({ page }) => {
    const uploaded = await openWizard(page);
    const sizes: number[] = [];
    await page.route("**/v1/palm/readings/*/frames/*", async (route) => {
      if (route.request().method() === "POST") {
        sizes.push(route.request().postDataBuffer()?.length ?? 0);
        await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
        return;
      }
      await route.fallback();
    });
    await nextShot(page);
    const photo = await bigPhoto(page);
    expect(photo.length, "the test photo must be bigger than the 6 MB server limit").toBeGreaterThan(6 * 1024 * 1024);
    await page.locator('input[type="file"]').setInputFiles({ name: "gallery.jpg", mimeType: "image/jpeg", buffer: photo });
    await page.getByRole("button", { name: /Use this photo/i }).click();
    await expect.poll(() => sizes.length, { timeout: 30_000 }).toBeGreaterThan(0);
    expect(sizes[0]!, "uploaded bytes must fit under the server's 6 MB limit").toBeLessThan(5 * 1024 * 1024);
    void uploaded;
  });
});

test.describe("Palm capture camera", () => {
  test("after the shutter the review screen is up quickly, even on a slow phone", async ({ page, context }) => {
    await openWizard(page);
    await nextShot(page);
    // Make the browser's processor 6x slower, like a mid-range phone.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    // Timed INSIDE the page (click -> the review buttons exist), so the test runner's own
    // slow-motion under the throttle is not counted.
    await page.evaluate(() => {
      const w = window as unknown as { __shutter?: { t0: number; ms: number | null } };
      w.__shutter = { t0: 0, ms: null };
      document.addEventListener("click", () => { if (!w.__shutter!.t0) w.__shutter!.t0 = performance.now(); }, { capture: true, once: true });
      new MutationObserver((_m, obs) => {
        if ([...document.querySelectorAll("button")].some((b) => /use this photo/i.test(b.textContent ?? "")) && w.__shutter!.t0) {
          w.__shutter!.ms = performance.now() - w.__shutter!.t0;
          obs.disconnect();
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
    await page.getByRole("button", { name: "Capture", exact: true }).click();
    await page.getByRole("button", { name: /Use this photo/i }).waitFor({ state: "visible", timeout: 15_000 });
    const ms = await page.evaluate(() => (window as unknown as { __shutter: { ms: number | null } }).__shutter.ms);
    test.info().annotations.push({ type: "review-latency-ms-at-6x-cpu", description: String(ms) });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    expect(ms, `review took ${ms} ms`).not.toBeNull();
    // Was 3.7 s at this slowdown before the capture was lightened (encode 2560 px, redraw 4K every
    // frame); about 0.7 s after.
    expect(ms!, `review took ${ms} ms`).toBeLessThan(1500);
    // The photo is on screen and nothing went wrong.
    await expect(page.getByTestId("palm-shutter-flash")).toHaveCount(0);
  });

  test("tapping the picture shows a focus ring where it was tapped", async ({ page }) => {
    await openWizard(page);
    await nextShot(page);
    await expect(page.getByText("Tap the picture to focus")).toBeVisible();
    const video = page.locator("video");
    const box = (await video.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
    const ring = page.getByTestId("palm-focus-ring");
    await expect(ring).toBeVisible();
    const r = (await ring.boundingBox())!;
    expect(Math.abs(r.x + r.width / 2 - (box.x + box.width * 0.3))).toBeLessThan(40);
    expect(Math.abs(r.y + r.height / 2 - (box.y + box.height * 0.6))).toBeLessThan(40);
    // It fades away by itself.
    await expect(ring).toHaveCount(0, { timeout: 4000 });
  });

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
