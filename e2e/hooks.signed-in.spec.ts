import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type {
  DiyaView,
  KavachView,
  MysteryView,
  RahasyaView,
  ReceiptsView,
  ShubhLabhView,
  SleepView,
  TextTimingView,
} from "../lib/hooks-types";

// The eight daily-return hooks (switches hooks.*, all off at first). The server works everything out;
// these specs check what the reader sees and which calls the screens make.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const on = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, ON]));
const fail = (status: number, message: string) => ({ status, json: { error: { code: "ERR", message } } });

const place = { name: "New Delhi", assumed: false, tz: "Asia/Kolkata" };

/** Holds a test id with the mouse for `ms`, as a finger would. */
async function hold(page: Page, testId: string, ms: number) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/* ------------------------------------------------------------------ fixtures */

const rahasya = (over: Partial<RahasyaView> = {}): RahasyaView => ({
  date: "2026-10-26",
  profileId: null,
  slots: Array.from({ length: 17 }, (_, i) => ({
    n: i + 1,
    title: i === 0 ? "Your Ascendant" : i === 1 ? "Your Moon" : `Scroll ${i + 1}`,
    status: i < 2 ? ("open" as const) : ("locked" as const),
    via: i === 0 ? ("first" as const) : i === 1 ? ("daily" as const) : null,
  })),
  openCount: 2,
  next: { n: 3, needs: "ritual", ritualDoneToday: false, opensAtLocal: "20:00" },
  unlockPricePaise: 1500,
  scroll: { n: 1, id: "lagna", title: "Your Ascendant", headline: "Your Ascendant is Libra at 5°00′.", facts: [{ label: "Ruled by", value: "Venus" }], why: ["Venus rules Libra"], badge: null },
  ...over,
});

const strip = (): ShubhLabhView["windows"] => [
  { start: "06:10", end: "08:10", startMin: 370, endMin: 490, color: "amber", score: 55, why: ["Moon hora"] },
  { start: "08:10", end: "11:10", startMin: 490, endMin: 670, color: "red", score: 30, why: ["Rahu Kaal"] },
  { start: "11:10", end: "13:40", startMin: 670, endMin: 820, color: "green", score: 86, why: ["Abhijit Muhurta", "Jupiter hora"] },
  { start: "13:40", end: "06:10", startMin: 820, endMin: 1810, color: "amber", score: 52, why: [] },
];

const shubh = (over: Partial<ShubhLabhView> = {}): ShubhLabhView => ({
  date: "2026-10-26",
  place,
  basis: "personal",
  sunrise: "06:10",
  windows: strip(),
  best: { start: "11:10", end: "13:40", score: 86, why: ["Abhijit Muhurta", "Jupiter hora"] },
  now: { minute: 600, clock: "10:00", window: { color: "red", score: 30, start: "08:10", end: "11:10" }, nextGreen: { start: "11:10", end: "13:40", score: 86, inMin: 70 } },
  scoreNote: "Aroha score, a guide for timing, not a classical rule.",
  week: { unlocked: false, until: null, pricePaise: 1500, days: null, alarms: [] },
  ...over,
});

const diya = (over: Partial<DiyaView> = {}): DiyaView => ({
  date: "2026-10-26",
  place,
  window: { start: "11:40", end: "12:28", startMin: 700, endMin: 748, kind: "abhijit", why: "Abhijit Muhurta, the midday window around local solar noon." },
  state: "open",
  opensInMin: null,
  lit: false,
  litAt: null,
  streak: 3,
  occasion: null,
  giftPaise: 0,
  giftPaid: false,
  litToday: null,
  ...over,
});

const kavach = (over: Partial<KavachView> = {}): KavachView => ({
  date: "2026-10-26",
  state: "ready",
  today: { memberId: "m1", name: "Bhanu", quality: "poor", taraName: "Pratyari", taraNumber: 5, chandraHouse: 8, planet: "Mercury", planetHindi: "Budh", mantra: "Om Braam Breem Braum Sah Budhaya Namah", beads: 0, beadsTarget: 11, done: false },
  streak: 2,
  kalash: 2,
  weekDays: 2,
  summary: null,
  blessing: null,
  ...over,
});

const receipts = (over: Partial<ReceiptsView> = {}): ReceiptsView => ({
  date: "2026-10-26",
  cards: [
    { part: "morning", startMin: 360, endMin: 720, moonSign: "Aries", aspect: { name: "trine", tone: "easy", natalPlanet: "Sun", orbDeg: 0.4, peakMin: 540 }, headline: "Moon trine your Sun", text: "The Moon makes a trine to your natal Sun.", proof: "Moon 12°10′ Aries trine natal Sun 12°30′ Leo, orb 0°24′", status: "live", verdict: null },
    { part: "afternoon", startMin: 720, endMin: 1080, moonSign: "Taurus", aspect: null, headline: "A quiet window", text: "Quiet.", proof: "Moon in Taurus; no aspect within 3° to a natal planet", status: "upcoming", verdict: null },
    { part: "evening", startMin: 1080, endMin: 1440, moonSign: "Taurus", aspect: null, headline: "A quiet window", text: "Quiet.", proof: "Moon in Taurus", status: "upcoming", verdict: null },
  ],
  share: { rated: 0, nailed: 0, partly: 0, missed: 0 },
  yesterdayCheck: null,
  tomorrow: { unlocked: false, pricePaise: 1500, cards: null },
  ...over,
});

const textView = (over: Partial<TextTimingView> = {}): TextTimingView => ({
  date: "2026-10-26",
  person: { profileId: "p1", name: "Asha" },
  precision: "exact",
  alert: { pricePaise: 1500, armed: false, at: null },
  note: "A timing suggestion from the Moon's path through both charts.",
  variants: [
    {
      label: null,
      now: { color: "green", score: 78 },
      best: { start: "14:00", end: "15:30", score: 81 },
      bestUntil: "15:30",
      nextGreen: null,
      runs: [{ start: "00:00", end: "14:00", color: "amber", score: 55 }, { start: "14:00", end: "15:30", color: "green", score: 81 }, { start: "15:30", end: "24:00", color: "red", score: 30 }],
      cards: [
        { id: "now", title: "Right now", text: "Green: a smooth stretch for getting in touch.", proof: "Score 78" },
        { id: "window", title: "Best stretch today", text: "14:00 to 15:30 looks the smoothest left today.", proof: "Average score 81" },
        { id: "moon", title: "Their Moon and yours", text: "The Moon is in trine to their natal Moon.", proof: "Moon 10°00′ Cancer to their Moon 10°20′ Scorpio" },
        { id: "tone", title: "How to say it", text: "Say it simply.", proof: "Moon to their Mercury" },
      ],
    },
  ],
  ...over,
});

const sleep = (over: Partial<SleepView> = {}): SleepView => ({
  date: "2026-10-26",
  lastNight: { nakshatraIndex: 3, nakshatra: "Rohini", signIndex: 1, sign: "Taurus", bindus: 5 },
  logged: null,
  recent: [],
  pattern: { nights: 3, needed: 7, ready: false, average: 3.3, top: [], bottom: [], topNames: [], bottomNames: [], confidence: "early" },
  report: { unlocked: false, pricePaise: 4900, data: null },
  note: "A reflection on your own numbers beside the Moon, not a health reading.",
  ...over,
});

const mystery = (over: Partial<MysteryView> = {}): MysteryView => ({
  date: "2026-10-26",
  state: "ready",
  opensInMin: null,
  allowed: 1,
  cards: [{ index: 0, scratched: false, kind: null, name: null, score: null, why: null }],
  addFriendHint: false,
  ...over,
});

/* ------------------------------------------------------------------ everything off */

test("with every hook switched off Home shows no hook card and the pages send the reader home", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page);
  await signIn(page, "/");
  await expect(page.getByTestId(/^hook-card-/)).toHaveCount(0);
  await page.goto("/hooks/rahasya");
  await expect(page).toHaveURL(/\/$/);
  expect(callsTo(api, "GET /v1/hooks/rahasya")).toHaveLength(0);
});

/* ------------------------------------------------------------------ Kundli Rahasya */

test.describe("Kundli Rahasya", () => {
  test("shows the scrolls, opens an open one with its Why, and explains the locked ones", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: on("hooks.kundliRahasya") },
      overrides: {
        "GET /v1/hooks/rahasya": (c) => ({
          json: c.query.get("n") === "2" ? rahasya({ scroll: { n: 2, id: "moon", title: "Your Moon", headline: "Your Moon is in Taurus at 15°00′.", facts: [{ label: "Nakshatra", value: "Rohini, pada 2" }], why: ["Moon at 15°00′ Taurus"], badge: null } }) : rahasya(),
        }),
      },
    });
    await signIn(page, "/hooks/rahasya");
    await expect(page.getByTestId("rahasya-count")).toContainText("2 of 17 open");
    await expect(page.getByTestId("rahasya-count")).toContainText("20:00");
    await expect(page.getByTestId("rahasya-scroll")).toContainText("Your Ascendant is Libra");
    await page.getByTestId("rahasya-why").locator("summary").click();
    await expect(page.getByTestId("rahasya-why")).toContainText("Venus rules Libra");
    await page.getByTestId("scroll-2").click();
    await expect(page.getByTestId("rahasya-scroll")).toContainText("Rohini, pada 2");
    await page.getByTestId("scroll-5").click();
    await expect(page.getByTestId("rahasya-locked")).toContainText("Scroll 5 is not open yet");
  });

  test("a locked scroll opens for coins and shows its content", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: on("hooks.kundliRahasya") },
      overrides: {
        "GET /v1/hooks/rahasya": () => ({ json: rahasya() }),
        "POST /v1/hooks/rahasya/unlock": (c) => {
          const n = (c.body as { n: number }).n;
          return {
            json: rahasya({
              openCount: 3,
              slots: rahasya().slots.map((s) => (s.n === n ? { ...s, status: "open" as const, via: "paid" as const, title: "Your Sun" } : s)),
              scroll: { n, id: "sun", title: "Your Sun", headline: "Your Sun is in Leo at 10°00′.", facts: [], why: ["Sun at 10°00′ Leo"], badge: null },
              chargedPaise: 1500,
            }),
          };
        },
      },
    });
    await signIn(page, "/hooks/rahasya");
    await page.getByTestId("scroll-3").click();
    await page.getByTestId("rahasya-unlock").click();
    await expect(page.getByTestId("rahasya-scroll")).toContainText("Your Sun is in Leo");
    expect(callsTo(api, "POST /v1/hooks/rahasya/unlock")[0]!.body).toEqual({ n: 3 });
  });

  test("not enough coins shows a plain message and opens nothing", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: on("hooks.kundliRahasya") },
      overrides: { "GET /v1/hooks/rahasya": () => ({ json: rahasya() }), "POST /v1/hooks/rahasya/unlock": () => fail(409, "INSUFFICIENT_CREDITS") },
    });
    await signIn(page, "/hooks/rahasya");
    await page.getByTestId("scroll-4").click();
    await page.getByTestId("rahasya-unlock").click();
    await expect(page.getByTestId("hook-notice")).toContainText("not have enough coins");
    await expect(page.getByTestId("rahasya-locked")).toBeVisible();
  });

  test("the Moon-chart badge shows when the birth time is not exact", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: on("hooks.kundliRahasya") },
      overrides: { "GET /v1/hooks/rahasya": () => ({ json: rahasya({ scroll: { ...rahasya().scroll!, badge: "moon-chart" } }) }) },
    });
    await signIn(page, "/hooks/rahasya");
    await expect(page.getByTestId("moon-chart-badge")).toContainText("birth time is not exact");
  });

  test("a chart that cannot be read says so and offers a retry", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.kundliRahasya") }, overrides: { "GET /v1/hooks/rahasya": () => fail(422, "NO_CHART") } });
    await signIn(page, "/hooks/rahasya");
    await expect(page.getByTestId("hook-failed")).toContainText("birth chart is not ready");
  });
});

/* ------------------------------------------------------------------ Shubh-Labh */

test.describe("Shubh-Labh radar", () => {
  test("shows the strip, the clock, the best window and every window with its reason", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.shubhLabh") }, overrides: { "GET /v1/hooks/shubh-labh": () => ({ json: shubh() }) } });
    await signIn(page, "/hooks/shubh-labh");
    await expect(page.getByTestId("strip")).toBeVisible();
    await expect(page.getByTestId("strip-now")).toBeVisible();
    await expect(page.getByTestId("shubh-now")).toContainText("Now (10:00): red");
    await expect(page.getByTestId("shubh-now")).toContainText("Next green: 11:10 to 13:40 (in 1 h 10 min)");
    await expect(page.getByTestId("shubh-best")).toContainText("11:10 to 13:40");
    await expect(page.getByTestId("shubh-windows")).toContainText("Rahu Kaal");
    await expect(page.getByTestId("shubh-week-locked")).toContainText("Open for");
  });

  test("opening the week charges once and shows the seven days; an alarm can be set", async ({ page }) => {
    await skipLaunchOverlays(page);
    let unlocked = false;
    const days = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${26 + i}`, best: { start: "11:10", end: "13:40", score: 86 }, green: 2 }));
    const api = await mockApi(page, {
      user: { features: on("hooks.shubhLabh") },
      overrides: {
        "GET /v1/hooks/shubh-labh": (c) => ({
          json: shubh({ date: c.query.get("date") ?? "2026-10-26", week: { unlocked, until: unlocked ? "2026-11-01" : null, pricePaise: 1500, days: unlocked ? days : null, alarms: [] } }),
        }),
        "POST /v1/hooks/shubh-labh/week": () => {
          unlocked = true;
          return { json: { unlocked: true, until: "2026-11-01", chargedPaise: 1500 } };
        },
        "POST /v1/hooks/shubh-labh/alarm": () => ({ json: { armed: true, at: "2026-10-27T05:35:00Z" } }),
      },
    });
    await signIn(page, "/hooks/shubh-labh");
    await page.getByTestId("shubh-unlock").click();
    await expect(page.getByTestId("shubh-week")).toBeVisible();
    await expect(page.getByTestId("week-2026-10-28")).toBeVisible();
    await page.getByTestId("week-2026-10-28").click();
    await expect.poll(() => callsTo(api, "GET /v1/hooks/shubh-labh").some((c) => c.query.get("date") === "2026-10-28")).toBe(true);
    await page.getByTestId("shubh-alarm").click();
    await expect(page.getByTestId("hook-notice")).toContainText("5 minutes before");
    expect(callsTo(api, "POST /v1/hooks/shubh-labh/alarm")[0]!.body).toEqual({ date: "2026-10-28" });
  });

  test("says when no city is saved and Delhi was used", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.shubhLabh") }, overrides: { "GET /v1/hooks/shubh-labh": () => ({ json: shubh({ place: { name: null, assumed: true, tz: "Asia/Kolkata" } }) }) } });
    await signIn(page, "/hooks/shubh-labh");
    await expect(page.getByTestId("place-assumed")).toContainText("Using New Delhi");
  });
});

/* ------------------------------------------------------------------ Sankalp Diya */

test.describe("Sankalp Diya", () => {
  test("a short press does not light the diya; holding the wick for two seconds does", async ({ page }) => {
    await skipLaunchOverlays(page);
    let lit = false;
    const api = await mockApi(page, {
      user: { features: on("hooks.sankalpDiya") },
      overrides: {
        "GET /v1/hooks/sankalp-diya": () => ({ json: diya({ lit }) }),
        "POST /v1/hooks/sankalp-diya/light": () => {
          lit = true;
          return { json: diya({ lit: true, streak: 4, occasion: "ekadashi", giftPaise: 500, giftPaid: true, alreadyLit: false, earnedGiftPaise: 500 }) };
        },
      },
    });
    await signIn(page, "/hooks/sankalp-diya");
    await expect(page.getByTestId("diya-times")).toHaveText("11:40 to 12:28");
    await hold(page, "diya-wick", 500);
    expect(callsTo(api, "POST /v1/hooks/sankalp-diya/light")).toHaveLength(0);
    await hold(page, "diya-wick", 2300);
    await expect(page.getByTestId("diya-lit")).toContainText("Your diya is lit");
    await expect(page.getByTestId("diya-lit")).toContainText("added today");
    await expect(page.getByTestId("diya-streak")).toContainText("4 days");
  });

  test("before the window it says when it opens, after it says tomorrow", async ({ page }) => {
    await skipLaunchOverlays(page);
    let view = diya({ state: "before", opensInMin: 100 });
    await mockApi(page, { user: { features: on("hooks.sankalpDiya") }, overrides: { "GET /v1/hooks/sankalp-diya": () => ({ json: view }) } });
    await signIn(page, "/hooks/sankalp-diya");
    await expect(page.getByTestId("diya-before")).toContainText("in 1 h 40 min");
    await expect(page.getByTestId("diya-wick")).toHaveCount(0);
    view = diya({ state: "closed" });
    await page.reload();
    await expect(page.getByTestId("diya-closed")).toContainText("Tomorrow's opens");
  });

  test("the count of diyas shows only when the server sends one, and the occasion shows", async ({ page }) => {
    await skipLaunchOverlays(page);
    let v = diya({ litToday: null, occasion: "pradosh", giftPaise: 500 });
    await mockApi(page, { user: { features: on("hooks.sankalpDiya") }, overrides: { "GET /v1/hooks/sankalp-diya": () => ({ json: v }) } });
    await signIn(page, "/hooks/sankalp-diya");
    await expect(page.getByTestId("diya-count")).toHaveCount(0);
    await expect(page.getByTestId("diya-occasion")).toContainText("Pradosh today");
    v = diya({ litToday: 1234 });
    await page.reload();
    await expect(page.getByTestId("diya-count")).toContainText("1,234 diyas lit today");
  });

  test("if the window closed before the press reaches the server the reader is told", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: on("hooks.sankalpDiya") },
      overrides: { "GET /v1/hooks/sankalp-diya": () => ({ json: diya() }), "POST /v1/hooks/sankalp-diya/light": () => fail(409, "WINDOW_PASSED") },
    });
    await signIn(page, "/hooks/sankalp-diya");
    await hold(page, "diya-wick", 2300);
    await expect(page.getByTestId("hook-notice")).toContainText("window has passed");
  });
});

/* ------------------------------------------------------------------ Ghar Ka Kavach */

test.describe("Ghar Ka Kavach", () => {
  test("shows today's pick with the planet and mantra, counts beads and finishes the day", async ({ page }) => {
    await skipLaunchOverlays(page);
    let state = kavach();
    const api = await mockApi(page, {
      user: { features: on("hooks.gharKavach") },
      overrides: {
        "GET /v1/hooks/ghar-kavach": () => ({ json: state }),
        "POST /v1/hooks/ghar-kavach/beads": (c) => {
          const count = (c.body as { count: number }).count;
          const beads = Math.min(11, state.today!.beads + count);
          state = kavach({
            state: beads >= 11 ? "done" : "ready",
            today: { ...state.today!, beads, done: beads >= 11 },
            streak: beads >= 11 ? 3 : 2,
            kalash: beads >= 11 ? 3 : 2,
            blessing: beads >= 11 ? { name: "Bhanu", text: "Wishing Bhanu a steady, gentle day." } : null,
          });
          return { json: { ...state, justFilled: beads >= 11 } };
        },
      },
    });
    await signIn(page, "/hooks/ghar-kavach");
    await expect(page.getByTestId("kavach-name")).toHaveText("Bhanu");
    await expect(page.getByTestId("kavach-today")).toContainText("Pratyari Tara");
    await expect(page.getByTestId("kavach-today")).toContainText("Budh");
    await expect(page.getByTestId("kavach-today")).toContainText("Om Braam Breem Braum Sah Budhaya Namah");
    await page.getByTestId("kavach-bead").click();
    await expect(page.getByTestId("kavach-beads")).toContainText("1 / 11");
    await page.getByTestId("kavach-all").click();
    expect(callsTo(api, "POST /v1/hooks/ghar-kavach/beads").map((c) => (c.body as { count: number }).count)).toEqual([1, 10]);
    await expect(page.getByTestId("kavach-blessing")).toContainText("Wishing Bhanu");
    await expect(page.getByTestId("kalash")).toHaveAttribute("data-level", "3");
  });

  test("with nobody in the family circle it points to the Circle", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.gharKavach") }, overrides: { "GET /v1/hooks/ghar-kavach": () => ({ json: kavach({ state: "empty", today: null, streak: 0, kalash: 0 }) }) } });
    await signIn(page, "/hooks/ghar-kavach");
    await expect(page.getByTestId("kavach-empty")).toContainText("Add a family member");
  });

  test("seven days in a row show the free weekly summary", async ({ page }) => {
    await skipLaunchOverlays(page);
    const days = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${20 + i}`, name: "Bhanu", taraName: "Pratyari", done: true }));
    await mockApi(page, { user: { features: on("hooks.gharKavach") }, overrides: { "GET /v1/hooks/ghar-kavach": () => ({ json: kavach({ streak: 7, kalash: 7, weekDays: 7, summary: { unlocked: true, days } }) }) } });
    await signIn(page, "/hooks/ghar-kavach");
    await expect(page.getByTestId("kavach-summary")).toContainText("10-26 · Bhanu");
    await expect(page.getByTestId("kalash")).toHaveAttribute("data-level", "7");
  });
});

/* ------------------------------------------------------------------ Cosmic Receipts */

test.describe("Cosmic Receipts", () => {
  test("shows three cards, opens one for its degrees, marks it once, and offers a share and a peek", async ({ page }) => {
    await skipLaunchOverlays(page);
    let v = receipts();
    const api = await mockApi(page, {
      user: { features: on("hooks.cosmicReceipts") },
      overrides: {
        "GET /v1/hooks/cosmic-receipts": () => ({ json: v }),
        "POST /v1/hooks/cosmic-receipts/mark": (c) => {
          const b = c.body as { part: "morning"; verdict: "nailed" };
          v = receipts({ share: { rated: 1, nailed: 1, partly: 0, missed: 0 }, cards: v.cards.map((x) => (x.part === b.part ? { ...x, verdict: b.verdict } : x)) });
          return { json: v };
        },
      },
    });
    await signIn(page, "/hooks/cosmic-receipts");
    await expect(page.getByTestId("receipts-cards").locator("section, div").first()).toBeVisible();
    await expect(page.getByTestId("card-morning")).toContainText("Moon trine your Sun");
    await page.getByTestId("card-morning").getByRole("button", { name: /Moon trine your Sun/ }).click();
    await expect(page.getByTestId("card-morning-open")).toContainText("orb 0°24′");
    await expect(page.getByTestId("mark-afternoon-nailed")).toHaveCount(0); // not begun yet
    await page.getByTestId("mark-morning-nailed").click();
    await expect(page.getByTestId("verdict-morning")).toContainText("You marked it: nailed");
    expect(callsTo(api, "POST /v1/hooks/cosmic-receipts/mark")[0]!.body).toEqual({ date: "today", part: "morning", verdict: "nailed" });
    await expect(page.getByTestId("receipts-peek")).toContainText("Peek at tomorrow");
    await expect(page.getByTestId("receipts-share")).toBeVisible();
  });

  test("an unmarked card from yesterday is asked about first", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: on("hooks.cosmicReceipts") },
      overrides: {
        "GET /v1/hooks/cosmic-receipts": () => ({ json: receipts({ yesterdayCheck: { date: "2026-10-25", parts: ["afternoon"] } }) }),
        "POST /v1/hooks/cosmic-receipts/mark": () => ({ json: receipts() }),
      },
    });
    await signIn(page, "/hooks/cosmic-receipts");
    await expect(page.getByTestId("receipts-yesterday")).toContainText("how did yesterday's cards land");
    await page.getByTestId("yesterday-afternoon-missed").click();
    expect(callsTo(api, "POST /v1/hooks/cosmic-receipts/mark")[0]!.body).toEqual({ date: "yesterday", part: "afternoon", verdict: "missed" });
    await expect(page.getByTestId("receipts-yesterday")).toHaveCount(0);
  });

  test("peeking at tomorrow shows its cards after the charge", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: on("hooks.cosmicReceipts") },
      overrides: {
        "GET /v1/hooks/cosmic-receipts": () => ({ json: receipts() }),
        "POST /v1/hooks/cosmic-receipts/peek": () => ({ json: receipts({ tomorrow: { unlocked: true, pricePaise: 1500, cards: receipts().cards }, chargedPaise: 1500 }) }),
      },
    });
    await signIn(page, "/hooks/cosmic-receipts");
    await page.getByTestId("receipts-peek").click();
    await expect(page.getByTestId("receipts-tomorrow")).toContainText("Moon trine your Sun");
    await expect(page.getByTestId("receipts-peek")).toHaveCount(0);
  });

  test("never shows a percentage", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.cosmicReceipts") }, overrides: { "GET /v1/hooks/cosmic-receipts": () => ({ json: receipts() }) } });
    await signIn(page, "/hooks/cosmic-receipts");
    await expect(page.getByTestId("receipts-cards")).toBeVisible();
    expect(await page.getByTestId("hook-cosmic-receipts").innerText()).not.toMatch(/\d\s?%/);
  });
});

/* ------------------------------------------------------------------ Text them now? */

test.describe("Text them now?", () => {
  const people = { people: [{ profileId: "p1", name: "Asha", relationship: "partner", readable: true }, { profileId: "p2", name: "Ghost", relationship: null, readable: false }] };

  test("pick a person, see the colour, the best-until time, the strip and the four decoder cards", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: on("hooks.textTiming") },
      overrides: { "GET /v1/hooks/text-timing/people": () => ({ json: people }), "GET /v1/hooks/text-timing": () => ({ json: textView() }) },
    });
    await signIn(page, "/hooks/text-timing");
    await expect(page.getByTestId("person-p2")).toBeDisabled();
    await page.getByTestId("person-p1").click();
    await expect(page.getByTestId("text-now")).toContainText("Green");
    await expect(page.getByTestId("text-until")).toContainText("Best until 15:30");
    await expect(page.getByTestId("text-strip")).toBeVisible();
    await expect(page.getByTestId("text-cards").locator("[data-testid^=decoder-]")).toHaveCount(4);
    await expect(page.getByTestId("decoder-moon")).toContainText("trine to their natal Moon");
  });

  test("without their birth time both Moon options are offered", async ({ page }) => {
    await skipLaunchOverlays(page);
    const two = textView({
      precision: "moon-sign-options",
      variants: [
        { ...textView().variants[0]!, label: "Moon in Aries" },
        { ...textView().variants[0]!, label: "Moon in Taurus", now: { color: "red", score: 22 }, bestUntil: null, nextGreen: "16:00" },
      ],
    });
    await mockApi(page, { user: { features: on("hooks.textTiming") }, overrides: { "GET /v1/hooks/text-timing/people": () => ({ json: people }), "GET /v1/hooks/text-timing": () => ({ json: two }) } });
    await signIn(page, "/hooks/text-timing");
    await page.getByTestId("person-p1").click();
    await expect(page.getByTestId("variant-0")).toHaveText("Moon in Aries");
    await page.getByTestId("variant-1").click();
    await expect(page.getByTestId("text-now")).toContainText("Red");
    await expect(page.getByTestId("text-until")).toContainText("Next green stretch starts at 16:00");
  });

  test("the peak alert is a paid action and shows as set afterwards", async ({ page }) => {
    await skipLaunchOverlays(page);
    let armed = false;
    const api = await mockApi(page, {
      user: { features: on("hooks.textTiming") },
      overrides: {
        "GET /v1/hooks/text-timing/people": () => ({ json: people }),
        "GET /v1/hooks/text-timing": () => ({ json: textView({ alert: { pricePaise: 1500, armed, at: armed ? "2026-10-26T08:30:00Z" : null } }) }),
        "POST /v1/hooks/text-timing/alert": () => {
          armed = true;
          return { json: { armed: true, at: "2026-10-26T08:30:00Z", chargedPaise: 1500 } };
        },
      },
    });
    await signIn(page, "/hooks/text-timing");
    await page.getByTestId("person-p1").click();
    await page.getByTestId("text-alert").click();
    await expect(page.getByTestId("text-alert")).toContainText("Alert set for the peak");
    expect(callsTo(api, "POST /v1/hooks/text-timing/alert")[0]!.body).toEqual({ profileId: "p1" });
  });

  test("with no saved profile it says to save one", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.textTiming") }, overrides: { "GET /v1/hooks/text-timing/people": () => ({ json: { people: [] } }) } });
    await signIn(page, "/hooks/text-timing");
    await expect(page.getByTestId("text-none")).toContainText("Save a profile first");
  });

  test("never says what the other person feels", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.textTiming") }, overrides: { "GET /v1/hooks/text-timing/people": () => ({ json: people }), "GET /v1/hooks/text-timing": () => ({ json: textView() }) } });
    await signIn(page, "/hooks/text-timing");
    await page.getByTestId("person-p1").click();
    await expect(page.getByTestId("text-cards")).toBeVisible();
    expect(await page.getByTestId("text-cards").innerText()).not.toMatch(/\b(feels?|loves?|misses you)\b/i);
  });
});

/* ------------------------------------------------------------------ Sleep Sync */

test.describe("Sleep Sync", () => {
  test("logs a score, shows it pressed, and shows last night's Moon with its bindus", async ({ page }) => {
    await skipLaunchOverlays(page);
    let logged: number | null = null;
    const api = await mockApi(page, {
      user: { features: on("hooks.sleepSync") },
      overrides: {
        "GET /v1/hooks/sleep-sync": () => ({ json: sleep({ logged }) }),
        "POST /v1/hooks/sleep-sync/log": (c) => {
          logged = (c.body as { score: number }).score;
          return { json: sleep({ logged }) };
        },
      },
    });
    await signIn(page, "/hooks/sleep-sync");
    await expect(page.getByTestId("sleep-moon")).toContainText("Rohini · Taurus");
    await expect(page.getByTestId("sleep-moon")).toContainText("5 of 8 bindus");
    await page.getByTestId("sleep-4").click();
    await expect(page.getByTestId("sleep-4")).toHaveAttribute("aria-pressed", "true");
    expect(callsTo(api, "POST /v1/hooks/sleep-sync/log")[0]!.body).toEqual({ score: 4 });
  });

  test("before seven nights it counts, after seven it names the best and hardest nakshatras and says it is early", async ({ page }) => {
    await skipLaunchOverlays(page);
    let v = sleep();
    await mockApi(page, { user: { features: on("hooks.sleepSync") }, overrides: { "GET /v1/hooks/sleep-sync": () => ({ json: v }) } });
    await signIn(page, "/hooks/sleep-sync");
    await expect(page.getByTestId("sleep-pattern")).toContainText("3 of 7 nights logged");
    v = sleep({ pattern: { nights: 8, needed: 7, ready: true, average: 3.4, top: [], bottom: [], topNames: ["Rohini", "Pushya", "Hasta"], bottomNames: ["Ardra", "Mula", "Bharani"], confidence: "early" } });
    await page.reload();
    await expect(page.getByTestId("sleep-pattern")).toContainText("Rohini, Pushya, Hasta");
    await expect(page.getByTestId("sleep-pattern")).toContainText("early read");
  });

  test("the 30-day report is a paid action", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: on("hooks.sleepSync") },
      overrides: {
        "GET /v1/hooks/sleep-sync": () => ({ json: sleep() }),
        "POST /v1/hooks/sleep-sync/report": () => ({
          json: sleep({ report: { unlocked: true, pricePaise: 4900, data: { windowDays: 30, nights: 12, average: 3.6, longestGoodRun: 4, bestNights: [], lowestNights: [], bySign: [{ signIndex: 1, average: 4, nights: 3 }], byNakshatra: [] } } }),
        }),
      },
    });
    await signIn(page, "/hooks/sleep-sync");
    await page.getByTestId("sleep-report-unlock").click();
    await expect(page.getByTestId("sleep-report")).toContainText("12 nights logged, average 3.6");
    await expect(page.getByTestId("sleep-report")).toContainText("Longest run of good nights (4 or 5): 4");
  });

  test("is not a health reading, and says so", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.sleepSync") }, overrides: { "GET /v1/hooks/sleep-sync": () => ({ json: sleep() }) } });
    await signIn(page, "/hooks/sleep-sync");
    await expect(page.getByTestId("hook-sleep-sync")).toContainText("not a health reading");
  });
});

/* ------------------------------------------------------------------ Mystery Synastry */

test.describe("Mystery Synastry", () => {
  test("waits until 6 PM", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("hooks.mysteryDrop") }, overrides: { "GET /v1/hooks/mystery": () => ({ json: mystery({ state: "waiting", opensInMin: 90, cards: [] }) }) } });
    await signIn(page, "/hooks/mystery");
    await expect(page.getByTestId("mystery-waiting")).toContainText("6 PM (in 1 h 30 min)");
  });

  test("the card stays hidden until held, then shows the name and the reason", async ({ page }) => {
    await skipLaunchOverlays(page);
    let scratched = false;
    const api = await mockApi(page, {
      user: { features: on("hooks.mysteryDrop") },
      overrides: {
        "GET /v1/hooks/mystery": () => ({ json: scratched ? mystery({ cards: [{ index: 0, scratched: true, kind: "circle", name: "Bhanu", score: 91, why: ["Your charts score 90 on the Bonds compatibility", "The evening Moon is in trine to both"] }] }) : mystery() }),
        "POST /v1/hooks/mystery/scratch": () => {
          scratched = true;
          return { json: mystery({ cards: [{ index: 0, scratched: true, kind: "circle", name: "Bhanu", score: 91, why: ["Your charts score 90 on the Bonds compatibility", "The evening Moon is in trine to both"] }] }) };
        },
      },
    });
    await signIn(page, "/hooks/mystery");
    await expect(page.getByTestId("mystery-name-0")).toHaveCount(0);
    await hold(page, "scratch-0", 300);
    expect(callsTo(api, "POST /v1/hooks/mystery/scratch")).toHaveLength(0);
    await hold(page, "scratch-0", 1700);
    await expect(page.getByTestId("mystery-name-0")).toHaveText("Bhanu");
    await expect(page.getByTestId("mystery-card-0")).toContainText("trine to both");
    expect(callsTo(api, "POST /v1/hooks/mystery/scratch")[0]!.body).toEqual({ index: 0 });
  });

  test("with an empty circle it says the card is a public chart and points to the Circle", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: on("hooks.mysteryDrop") },
      overrides: { "GET /v1/hooks/mystery": () => ({ json: mystery({ addFriendHint: true, cards: [{ index: 0, scratched: true, kind: "public", name: "Albert Einstein", score: 70, why: ["Your Moon and theirs are in trine"] }] }) }) },
    });
    await signIn(page, "/hooks/mystery");
    await expect(page.getByTestId("mystery-card-0")).toContainText("A public chart");
    await expect(page.getByText("Add a friend, free")).toBeVisible();
  });
});

/* ------------------------------------------------------------------ Home cards */

test("Home shows a card for each hook that is on, and each opens its page", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: on("hooks.kundliRahasya", "hooks.sankalpDiya", "hooks.cosmicReceipts", "hooks.sleepSync", "hooks.mysteryDrop", "hooks.textTiming", "hooks.gharKavach", "hooks.shubhLabh") },
    overrides: {
      "GET /v1/hooks/rahasya": () => ({ json: rahasya() }),
      "GET /v1/hooks/sankalp-diya": () => ({ json: diya() }),
      "GET /v1/hooks/cosmic-receipts": () => ({ json: receipts() }),
      "GET /v1/hooks/sleep-sync": () => ({ json: sleep() }),
      "GET /v1/hooks/mystery": () => ({ json: mystery() }),
      "GET /v1/hooks/ghar-kavach": () => ({ json: kavach() }),
      "GET /v1/hooks/shubh-labh": () => ({ json: shubh() }),
    },
  });
  await signIn(page, "/");
  await expect(page.getByTestId("hook-card-rahasya")).toContainText("2 of 17 scrolls open");
  await expect(page.getByTestId("hook-card-sankalp-diya")).toContainText("The window is open");
  await expect(page.getByTestId("hook-card-cosmic-receipts")).toContainText("Moon trine your Sun");
  await expect(page.getByTestId("hook-card-sleep-sync")).toContainText("How did you sleep?");
  await expect(page.getByTestId("hook-card-mystery")).toContainText("mystery card is ready");
  await expect(page.getByTestId("hook-card-ghar-kavach")).toContainText("Chant for Bhanu");
  await expect(page.getByTestId("hook-card-shubh-labh")).toContainText("Now: red");
  await expect(page.getByTestId("hook-card-text-timing")).toContainText("Text them now?");
  await page.getByTestId("hook-card-rahasya").click();
  await expect(page).toHaveURL(/\/hooks\/rahasya$/);
});

test("a hook that fails to load leaves Home as it was", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { features: on("hooks.sankalpDiya") }, overrides: { "GET /v1/hooks/sankalp-diya": () => fail(500, "boom") } });
  await signIn(page, "/");
  await expect(page.getByTestId("hook-card-sankalp-diya")).toHaveCount(0);
});

/* ------------------------------------------------------------------ time of day */

test("with home.timeMorph on, the diya card leads Home at midday", async ({ page }) => {
  await skipLaunchOverlays(page);
  await page.clock.install({ time: new Date(2026, 9, 26, 12, 15) });
  await mockApi(page, {
    user: { features: on("home.timeMorph", "hooks.kundliRahasya", "hooks.sankalpDiya") },
    overrides: { "GET /v1/hooks/rahasya": () => ({ json: rahasya() }), "GET /v1/hooks/sankalp-diya": () => ({ json: diya() }) },
  });
  await signIn(page, "/");
  const first = page.locator("[data-testid^=hook-card-]").first();
  await expect(first).toHaveAttribute("data-testid", "hook-card-sankalp-diya");
});

test("with home.timeMorph off, the built-in order stays (Rahasya before the diya)", async ({ page }) => {
  await skipLaunchOverlays(page);
  await page.clock.install({ time: new Date(2026, 9, 26, 12, 15) });
  await mockApi(page, {
    user: { features: on("hooks.kundliRahasya", "hooks.sankalpDiya") },
    overrides: { "GET /v1/hooks/rahasya": () => ({ json: rahasya() }), "GET /v1/hooks/sankalp-diya": () => ({ json: diya() }) },
  });
  await signIn(page, "/");
  const first = page.locator("[data-testid^=hook-card-]").first();
  await expect(first).toHaveAttribute("data-testid", "hook-card-rahasya");
});

/* ------------------------------------------------------------------ settings */

test.describe("Settings → Notifications", () => {
  test("no daily nudges row while no hook is on", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page);
    await signIn(page, "/settings");
    await expect(page.getByTestId("hook-push-settings")).toHaveCount(0);
  });

  test("with hooks on there is a master switch and one switch per hook; a hook can be turned off on its own", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: on("hooks.sankalpDiya", "hooks.sleepSync") },
      overrides: {
        "GET /v1/hooks/prefs": () => ({ json: { off: [] } }),
        "PUT /v1/hooks/prefs": (c) => ({ json: { off: (c.body as { push: boolean; hook: string }).push ? [] : [(c.body as { hook: string }).hook] } }),
      },
    });
    await signIn(page, "/settings");
    await expect(page.getByRole("switch", { name: "Daily nudges" })).toHaveAttribute("aria-checked", "true");
    const diyaSwitch = page.getByRole("switch", { name: "Sankalp Diya nudges" });
    await expect(diyaSwitch).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("switch", { name: "Sleep Sync nudges" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Mystery Synastry nudges" })).toHaveCount(0);
    await diyaSwitch.click();
    await expect(diyaSwitch).toHaveAttribute("aria-checked", "false");
    expect(callsTo(api, "PUT /v1/hooks/prefs")[0]!.body).toEqual({ hook: "sankalpDiya", push: false });
  });
});
