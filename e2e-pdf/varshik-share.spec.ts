import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** The share cards: 13 of them (year + 12 months), each a 1080 x 1350 JPEG, with no name, birth time, place or coordinates on them. */
const OUT = path.join(__dirname, "out");

function jpegSize(buf: Buffer): { w: number; h: number } {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error("not a JPEG");
    const marker = buf[i + 1]!;
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("no size");
}

test("13 share cards, none carries a personal fact, each saves as a 1080 x 1350 JPEG", async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });
  await page.goto("/varshik-preview?view=pdf&lang=en&q=2");
  await expect(page.getByTestId("varshik-report")).toBeVisible();
  await page.getByRole("button", { name: /Share cards/ }).evaluate((el) => (el as HTMLButtonElement).click());
  const cards = page.getByTestId(/^share-card-\d+$/);
  await expect(cards).toHaveCount(13);

  // Nothing personal in the words on any card (the fixture reader is Aarav, born 2004-08-19 07:40 near Pune).
  const text = (await page.getByTestId("share-card").allInnerTexts()).join(" ");
  expect(text).not.toMatch(/Aarav|Pune|Maharashtra|India|2004|07:40|7:40|18\.5|73\.8|Asia\/Kolkata/i);
  expect(text).toMatch(/2027/);
  const sources = await page.getByTestId("share-card").locator("img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src")));
  expect(new Set(sources)).toEqual(new Set(["/varshphal/cover.webp"]));

  for (const i of [0, 1, 12]) {
    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByTestId(`share-card-${i}`).evaluate((el) => (el as HTMLButtonElement).click());
    const download = await downloadPromise;
    const file = path.join(OUT, `card-${i}.jpg`);
    await download.saveAs(file);
    const buf = fs.readFileSync(file);
    expect(jpegSize(buf)).toEqual({ w: 1080, h: 1350 });
    expect(download.suggestedFilename()).toBe(i === 0 ? "varshik-rashifal-2027-year.jpg" : `varshik-rashifal-2027-month-${String(i).padStart(2, "0")}.jpg`);
    console.log(`card ${i}: ${(buf.length / 1024).toFixed(0)} KB ${download.suggestedFilename()}`);
  }
});
