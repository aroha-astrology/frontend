import { chromium, devices } from "@playwright/test";
const [lang = "en", q = "2", keys = ""] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 900, height: 1200 } });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:3120/varshik-preview?view=book&lang=${lang}&q=${q}`);
await page.waitForSelector("body[data-fitted='1']", { timeout: 120000 });
for (const key of keys.split(",")) {
  console.log("==", key, await page.evaluate((key) => [...document.querySelectorAll(`[data-pdf-page="${key}"] [data-vk-cols]`)].map((e) => `${e.tagName}.${String(e.className).slice(0, 50)} cols=${e.dataset.vkCols} kids=${e.children.length} h=${e.offsetHeight}`).join("\n"), key));
}
await browser.close();
