import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, type Handlers, type MockState } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const FEATURES = { "home.dailyStories": ON, "nav.shlokas": ON, "nav.gita": ON };

/** Tuesday 6 October 2026, 9:46 in the morning in India: 18 minutes into the Mercury hora. */
const NOW = new Date("2026-10-06T09:46:00+05:30");

const hora = (planet: string, startTime: string, endTime: string, isAuspicious: boolean) => ({
  planet,
  startTime,
  endTime,
  isAuspicious,
});

const PANCHANG = {
  date: "Tuesday, 6 October 2026",
  tithi: { number: 26, name: "Ekadashi", paksha: "Krishna", deity: "Vishnu", isAuspicious: true, endsAt: "00:35", nextName: "Dwadashi" },
  nakshatra: { index: 9, name: "Ashlesha", lord: "Mercury", pada: 2, deity: "Nagas", endsAt: "22:19", nextName: "Magha" },
  yoga: { index: 22, name: "Sadhya", isAuspicious: true },
  karana: { index: 1, name: "Bava", isFixed: false },
  vara: "Mangalvaar",
  rahuKaal: { start: "15:04", end: "16:32" },
  abhijitMuhurta: { start: "11:45", end: "12:32" },
  sunriseTime: "06:28",
  sunsetTime: "18:01",
  hora: [
    hora("Mars", "06:28", "07:28", false),
    hora("Sun", "07:28", "08:28", false),
    hora("Venus", "08:28", "09:28", true),
    hora("Mercury", "09:28", "10:28", true),
    hora("Moon", "10:28", "11:28", true),
    hora("Saturn", "11:28", "12:28", false),
  ],
};

// Only one verse carries a need-tag, so it is the verse of every day.
const VERSES = [
  { id: "ch1-v1", chapter: 1, verse: 1, sanskrit: "धृतराष्ट्र उवाच\n\nधर्मक्षेत्रे कुरुक्षेत्रे", mainCategory: "कथाप्रसङ्गः", tags: [] },
  {
    id: "ch2-v47",
    chapter: 2,
    verse: 47,
    sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\n\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    mainCategory: "कर्मयोग",
    tags: ["anxiety", "focus"],
  },
];

const STORY_API: Handlers = {
  "GET /v1/panchang": () => ({ json: PANCHANG }),
  "GET /v1/gita/verses": () => ({ json: { verses: VERSES } }),
  "POST /v1/stories/events": () => ({ json: { ok: true } }),
};

/** What the app told the backend to count, in order. */
const reported = (api: MockState) => callsTo(api, "POST /v1/stories/events").map((c) => c.body);

test.use({ timezoneId: "Asia/Kolkata" });

async function openHome(page: Page, features: Record<string, typeof ON> = FEATURES, overrides: Handlers = STORY_API) {
  await skipLaunchOverlays(page);
  await page.clock.install({ time: NOW });
  const api = await mockApi(page, { user: { features }, overrides });
  await signIn(page, "/");
  await expect(page.getByText(/Asha/).first()).toBeVisible();
  return api;
}

const viewer = (page: Page) => page.getByTestId("story-viewer");
const ring = (page: Page) => page.getByTestId("story-ring");
const hint = (page: Page) => page.getByTestId("story-hint");

/** A tap on the right (next) or left (previous) part of the story. */
async function tap(page: Page, side: "next" | "previous") {
  const box = (await page.getByTestId("story-tap-zone").boundingBox())!;
  await page.mouse.click(box.x + box.width * (side === "next" ? 0.8 : 0.1), box.y + box.height / 2);
}

test.describe("Daily Stories (the story ring on the Home avatar)", () => {
  test("with the flag off there is no ring, no story request, and the greeting still opens the profile switcher", async ({
    page,
  }) => {
    const api = await openHome(page, {});

    await expect(ring(page)).toHaveCount(0);
    await expect(hint(page)).toHaveCount(0);
    expect(callsTo(api, "GET /v1/panchang")).toHaveLength(0);
    expect(reported(api)).toHaveLength(0);

    await page.getByRole("button", { name: "Switch Profile" }).click();
    await expect(page.getByRole("heading", { name: "Switch Profile" })).toBeVisible();
  });

  test("the ring glows, plays the four stories in order and settles once all are seen", async ({ page }) => {
    const api = await openHome(page);

    await expect(ring(page)).toHaveAttribute("data-unseen", "true");
    await page.getByTestId("story-ring-button").click();

    // 1. Panchang
    await expect(viewer(page)).toHaveAttribute("data-story", "panchang");
    const panchang = page.getByTestId("story-panchang");
    await expect(panchang.getByRole("heading", { name: "Ekadashi" })).toBeVisible();
    await expect(panchang.getByText("Krishna", { exact: true })).toBeVisible();
    await expect(panchang.getByText("Ends 12:35 AM · Dwadashi begins after this")).toBeVisible();
    await expect(panchang.getByText("Ashlesha")).toBeVisible();
    await expect(panchang.getByText("ends 10:19 PM")).toBeVisible();
    await expect(panchang.getByText("Sadhya")).toBeVisible();
    await expect(panchang.getByText("Bava")).toBeVisible();
    await expect(panchang.getByText("11:45 AM – 12:32 PM")).toBeVisible();
    await expect(panchang.getByText("3:04 PM – 4:32 PM")).toBeVisible();
    await expect(viewer(page).getByText("Today • Tue, 6 October")).toBeVisible();

    // 2. Hora: the running hora is auspicious, so it is the one shown, with the time left.
    await tap(page, "next");
    await expect(viewer(page)).toHaveAttribute("data-story", "hora");
    const horaStory = page.getByTestId("story-hora");
    await expect(horaStory.getByText("Live · 42 min left")).toBeVisible();
    await expect(horaStory.getByRole("heading", { name: "Auspicious" })).toBeVisible();
    await expect(horaStory.getByText("Mercury Hora")).toBeVisible();
    await expect(horaStory.getByText("9:28 AM", { exact: true })).toBeVisible();
    await expect(horaStory.getByText("10:28 AM", { exact: true })).toBeVisible();
    await expect(horaStory.getByText("Study, writing and exams")).toBeVisible();
    await expect(horaStory.getByText("Promises made in a hurry")).toBeVisible();

    // 3. Deity: Tuesday is Hanuman ji's, and the button names his mantra.
    await tap(page, "next");
    await expect(viewer(page)).toHaveAttribute("data-story", "deity");
    const deity = page.getByTestId("story-deity");
    await expect(deity.getByRole("heading", { name: "Hanuman ji" })).toBeVisible();
    await expect(deity.getByText("Tuesday · Mars")).toBeVisible();
    await expect(page.getByTestId("story-cta")).toContainText("Chant");

    // A tap on the left goes back one story.
    await tap(page, "previous");
    await expect(viewer(page)).toHaveAttribute("data-story", "hora");
    await tap(page, "next");
    await tap(page, "next");

    // 4. Gita
    await expect(viewer(page)).toHaveAttribute("data-story", "gita");
    const gita = page.getByTestId("story-gita");
    await expect(gita.getByText("2.47")).toBeVisible();
    await expect(gita.getByText("कर्मण्येवाधिकारस्ते")).toBeVisible();
    await expect(gita.getByText("anxiety")).toBeVisible();
    await expect(page.getByTestId("story-cta")).toHaveText(/Listen to this verse/);

    // A tap past the last story closes the viewer, and the ring has nothing new left.
    await tap(page, "next");
    await expect(viewer(page)).toHaveCount(0);
    await expect(ring(page)).toHaveAttribute("data-unseen", "false");

    // Each story was reported to the backend once, on its first opening; going back to Hora did not count again.
    const views = ["panchang", "hora", "deity", "gita"].map((storyId) => ({ kind: "view", storyId }));
    await expect.poll(() => reported(api)).toEqual(views);

    await page.reload();
    await expect(page.getByText(/Asha/).first()).toBeVisible();
    await expect(ring(page)).toHaveAttribute("data-unseen", "false");

    // Watching them again the same day is not a new visit.
    await page.getByTestId("story-ring-button").click();
    await expect(viewer(page)).toHaveAttribute("data-story", "panchang");
    await tap(page, "next");
    await expect(viewer(page)).toHaveAttribute("data-story", "hora");
    await page.getByTestId("story-close").click();
    expect(reported(api)).toEqual(views);
  });

  test("a bubble under the avatar introduces the stories until it is closed, and never returns", async ({ page }) => {
    const api = await openHome(page);

    await expect(hint(page)).toBeVisible();
    await expect(hint(page).getByText("New: Daily Stories")).toBeVisible();
    await expect(
      hint(page).getByText("Tap here to see today's Panchang, Hora, deity and Gita verse. New every day."),
    ).toBeVisible();

    await page.getByTestId("story-hint-close").click();
    await expect(hint(page)).toHaveCount(0);
    // Closing the bubble is not watching a story.
    await expect(ring(page)).toHaveAttribute("data-unseen", "true");
    expect(reported(api)).toHaveLength(0);

    await page.reload();
    await expect(page.getByText(/Asha/).first()).toBeVisible();
    await expect(ring(page)).toHaveAttribute("data-unseen", "true");
    await expect(hint(page)).toHaveCount(0);

    // Not the next day either.
    await page.clock.setSystemTime(new Date("2026-10-07T08:00:00+05:30"));
    await page.reload();
    await expect(page.getByText(/Asha/).first()).toBeVisible();
    await expect(ring(page)).toHaveAttribute("data-unseen", "true");
    await expect(hint(page)).toHaveCount(0);
  });

  test("opening the stories puts the bubble away for good", async ({ page }) => {
    await openHome(page);

    await expect(hint(page)).toBeVisible();
    await page.getByTestId("story-ring-button").click();
    await expect(viewer(page)).toHaveAttribute("data-story", "panchang");
    await page.getByTestId("story-close").click();
    await expect(viewer(page)).toHaveCount(0);
    await expect(hint(page)).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(/Asha/).first()).toBeVisible();
    await expect(ring(page)).toHaveAttribute("data-unseen", "true");
    await expect(hint(page)).toHaveCount(0);
  });

  test("closing part-way keeps the ring glowing and reopens on the first unseen story", async ({ page }) => {
    await openHome(page);

    await page.getByTestId("story-ring-button").click();
    await expect(viewer(page)).toHaveAttribute("data-story", "panchang");
    await tap(page, "next");
    await expect(viewer(page)).toHaveAttribute("data-story", "hora");
    await page.getByTestId("story-close").click();
    await expect(viewer(page)).toHaveCount(0);

    await expect(ring(page)).toHaveAttribute("data-unseen", "true");
    await page.getByTestId("story-ring-button").click();
    await expect(viewer(page)).toHaveAttribute("data-story", "deity");
  });

  test("a story left alone moves on to the next one by itself", async ({ page }) => {
    await openHome(page);

    await page.getByTestId("story-ring-button").click();
    await expect(viewer(page)).toHaveAttribute("data-story", "panchang");
    await expect(viewer(page)).toHaveAttribute("data-story", "hora", { timeout: 15_000 });
  });

  test("each story's button opens its page", async ({ page }) => {
    await openHome(page);

    await page.getByTestId("story-ring-button").click();
    await expect(page.getByTestId("story-cta")).toHaveText(/See full Panchang/);
    await tap(page, "next");
    await expect(page.getByTestId("story-cta")).toHaveText(/See all horas/);
    await tap(page, "next");
    await tap(page, "next");
    await expect(viewer(page)).toHaveAttribute("data-story", "gita");

    await page.getByTestId("story-cta").click();
    await page.waitForURL((url) => url.pathname === "/gita/ch2-v47");
    await expect(viewer(page)).toHaveCount(0);
  });

  test("a story's page button is hidden while that page is switched off", async ({ page }) => {
    const OFF = { ...ON, enabled: false };
    await openHome(page, { "home.dailyStories": ON, "nav.shlokas": OFF, "nav.gita": OFF, "nav.panchang": OFF });

    await page.getByTestId("story-ring-button").click();
    for (const story of ["panchang", "hora", "deity", "gita"]) {
      await expect(viewer(page)).toHaveAttribute("data-story", story);
      await expect(page.getByTestId("story-share")).toBeVisible();
      await expect(page.getByTestId("story-cta")).toHaveCount(0);
      await tap(page, "next");
    }
  });

  test("the share sheet offers every place and sends a 1080×1920 picture with the install link", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    // The WhatsApp link must never leave the test machine.
    await context.route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "ok" }));
    const api = await openHome(page);

    await page.getByTestId("story-ring-button").click();
    await tap(page, "next");
    await expect(viewer(page)).toHaveAttribute("data-story", "hora");
    await page.getByTestId("story-share").click();

    const sheet = page.getByTestId("story-share-sheet");
    await expect(sheet.getByRole("heading", { name: "Share this story" })).toBeVisible();
    for (const target of ["whatsappStatus", "whatsapp", "instagramStory", "instagram", "x", "sms", "copy", "system"]) {
      await expect(page.getByTestId(`story-share-${target}`)).toBeVisible();
    }

    // Copy: the caption says what the story is and where to get the app, with this user's referral code.
    await page.getByTestId("story-share-copy").click();
    await expect(page.getByTestId("story-share-copy")).toContainText("Copied!");
    // Windows hands clipboard text back with CRLF line ends; the caption itself uses LF.
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).split("\r\n").join("\n");
    expect(copied).toContain("Mercury Hora, 9:28 AM to 10:28 AM. Good for: Study, writing and exams");
    expect(copied).toContain("https://play.google.com/store/apps/details?id=com.aroha.astrology&referrer=");
    expect(decodeURIComponent(copied)).toContain("utm_source=story_share&utm_campaign=hora&ref=ASHA42");

    // WhatsApp from a desktop browser: the picture is saved and WhatsApp opens with the caption.
    const [download, popup] = await Promise.all([
      page.waitForEvent("download"),
      page.waitForEvent("popup"),
      page.getByTestId("story-share-whatsapp").click(),
    ]);
    expect(download.suggestedFilename()).toBe("aroha-hora-2026-10-06.png");
    const png = readFileSync((await download.path())!);
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1920);
    expect(new URL(popup.url()).origin).toBe("https://wa.me");
    expect(new URL(popup.url()).searchParams.get("text")).toBe(copied);
    await expect(page.getByTestId("story-share-status")).toHaveText("Picture saved. Add it from your gallery.");

    // Both taps were reported with the place chosen, for the admin dashboard's share counts.
    await expect
      .poll(() => reported(api).filter((e) => (e as { kind: string }).kind === "share"))
      .toEqual([
        { kind: "share", storyId: "hora", channel: "copy" },
        { kind: "share", storyId: "hora", channel: "whatsapp" },
      ]);
  });

  test("a new day brings the glow back", async ({ page }) => {
    await openHome(page);

    await page.getByTestId("story-ring-button").click();
    for (let i = 0; i < 4; i++) await tap(page, "next");
    await expect(viewer(page)).toHaveCount(0);
    await expect(ring(page)).toHaveAttribute("data-unseen", "false");

    await page.clock.setSystemTime(new Date("2026-10-07T08:00:00+05:30"));
    await page.reload();
    await expect(page.getByText(/Asha/).first()).toBeVisible();
    await expect(ring(page)).toHaveAttribute("data-unseen", "true");
  });

  test("a story whose data fails to load says so instead of showing an empty screen", async ({ page }) => {
    await openHome(page, FEATURES, {
      "GET /v1/panchang": () => ({ status: 500, json: { error: { code: "internal", message: "e2e" } } }),
      "GET /v1/gita/verses": () => ({ status: 500, json: { error: { code: "internal", message: "e2e" } } }),
    });

    await page.getByTestId("story-ring-button").click();
    await expect(viewer(page).getByText("Couldn't load this right now. Please try again later.")).toBeVisible();
    await expect(page.getByTestId("story-share")).toBeDisabled();

    // The Deity story needs no request, so it still plays.
    await tap(page, "next");
    await tap(page, "next");
    await expect(page.getByTestId("story-deity").getByRole("heading", { name: "Hanuman ji" })).toBeVisible();
  });
});
