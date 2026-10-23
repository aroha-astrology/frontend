import { test, expect, type Page } from "@playwright/test";
import { mockApi, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Gita transliteration (lang.gitaScripts) and localised tithi / nakshatra names (lang.localNames).

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

const VERSES = [
  {
    id: "ch1-v1",
    chapter: 1,
    verse: 1,
    sanskrit: "धृतराष्ट्र उवाच\n\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।\n\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय॥",
    mainCategory: "कथाप्रसङ्गः",
    tags: [],
  },
];
const GITA_API: Handlers = { "GET /v1/gita/verses": () => ({ json: { verses: VERSES } }) };

async function openGita(page: Page, lang: string, features: Record<string, typeof ON>) {
  await skipLaunchOverlays(page);
  await page.addInitScript((code) => localStorage.setItem("aroha:lang", code), lang);
  await mockApi(page, { user: { features: { "nav.shlokas": ON, "nav.gita": ON, ...features } }, overrides: GITA_API });
  await signIn(page, "/shlokas");
  await page.getByRole("button", { name: /Gita|गीता|গীতা|ગીતા|గీత|கீதை|ಗೀತೆ|Gita|Gîtâ|Gita|ギーター|Гита/ }).first().click();
}

test.describe("Gita transliteration", () => {
  test("an English reader sees IAST under the verse", async ({ page }) => {
    await openGita(page, "en", { "lang.gitaScripts": ON });
    const t = page.getByTestId("gita-row").first().getByTestId("gita-translit");
    await expect(t).toHaveAttribute("data-script", "iast");
    await expect(t).toContainText("dharmakṣetre kurukṣetre samavetā yuyutsavaḥ|");
  });

  test("a Bengali reader sees the verse in Bengali script", async ({ page }) => {
    await openGita(page, "bn", { "lang.gitaScripts": ON });
    const t = page.getByTestId("gita-row").first().getByTestId("gita-translit");
    await expect(t).toHaveAttribute("data-script", "bn");
    await expect(t).toContainText("ধর্মক্ষেত্রে কুরুক্ষেত্রে");
  });

  test("a Tamil reader sees Tamil script", async ({ page }) => {
    await openGita(page, "ta", { "lang.gitaScripts": ON });
    await expect(page.getByTestId("gita-row").first().getByTestId("gita-translit")).toContainText("த⁴ர்மக்ஷேத்ரே");
  });

  test("a Hindi reader gets nothing extra: Devanagari is already theirs", async ({ page }) => {
    await openGita(page, "hi", { "lang.gitaScripts": ON });
    await expect(page.getByTestId("gita-row").first()).toBeVisible();
    await expect(page.getByTestId("gita-translit")).toHaveCount(0);
  });

  test("with the switch off nothing is added for anyone", async ({ page }) => {
    await openGita(page, "en", {});
    await expect(page.getByTestId("gita-row").first()).toBeVisible();
    await expect(page.getByTestId("gita-translit")).toHaveCount(0);
  });

  test("on the chant screen the reader can hide and show it again", async ({ page }) => {
    await openGita(page, "en", { "lang.gitaScripts": ON });
    await page.getByTestId("gita-row").first().locator("a").first().click();
    await expect(page).toHaveURL(/shlokas\/mala/);
    const block = page.getByTestId("gita-translit");
    await expect(block).toContainText("dharmakṣetre");
    await page.getByTestId("gita-translit-toggle").click();
    await expect(block).not.toContainText("dharmakṣetre");
    await expect(page.getByTestId("gita-translit-toggle")).toHaveText("Show transliteration");
    await page.getByTestId("gita-translit-toggle").click();
    await expect(block).toContainText("dharmakṣetre");
  });
});

test.describe("localised tithi and nakshatra names", () => {
  const PANCHANG = {
    json: {
      date: "2026-10-23",
      tithi: { number: 15, name: "Purnima", paksha: "Shukla" },
      nakshatra: { name: "Purva Phalguni", lord: "Venus" },
      yoga: null,
      karana: null,
      vara: "Friday",
      sunriseTime: "06:10",
      sunsetTime: "17:40",
      dayTimesMode: "sunrise",
    },
  };

  async function openPanchang(page: Page, lang: string, features: Record<string, typeof ON>) {
    await skipLaunchOverlays(page);
    await page.addInitScript((code) => localStorage.setItem("aroha:lang", code), lang);
    await mockApi(page, { user: { features }, overrides: { "GET /v1/panchang": () => PANCHANG } });
    await signIn(page, "/panchang");
  }

  test("a Hindi reader sees the tithi in Hindi with the switch on", async ({ page }) => {
    await openPanchang(page, "hi", { "lang.localNames": ON });
    await expect(page.getByTestId("tithi-name")).toHaveText("पूर्णिमा");
  });

  test("a Japanese reader sees it in Japanese", async ({ page }) => {
    await openPanchang(page, "ja", { "lang.localNames": ON });
    await expect(page.getByTestId("tithi-name")).toContainText("プールニマー");
  });

  test("with the switch off the engine's English name stays, in any language", async ({ page }) => {
    await openPanchang(page, "hi", {});
    await expect(page.getByTestId("tithi-name")).toHaveText("Purnima");
  });
});
