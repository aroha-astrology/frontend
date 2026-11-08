// Screenshots of the fitted A4 pages: node e2e-pdf/shots.mjs <outDir> <lang> <q> <theme> [keys,comma]
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const [outDir, lang = "en", q = "2", theme = "dark", keys = ""] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1 });
await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:3120/varshik-preview?view=book&lang=${lang}&q=${q}`);
await page.waitForSelector("body[data-fitted='1']", { timeout: 120000 });
await page.waitForTimeout(1500);
if (theme === "light" && !(await page.evaluate(() => document.documentElement.classList.contains("light")))) {
  await page.locator("#theme-toggle").click();
  await page.waitForTimeout(1200);
}
if (theme === "dark" && (await page.evaluate(() => document.documentElement.classList.contains("light")))) {
  await page.locator("#theme-toggle").click();
  await page.waitForTimeout(1200);
}
await page.addStyleTag({ content: "[data-testid=bottom-nav], nav.fixed, [class*=fixed]:not([data-pdf-page]) { display: none !important }" });
const want = keys && keys !== "ratios" ? keys.split(",") : null;
const ratiosOnly = keys === "ratios";
const boxes = await page.locator("[data-pdf-page]").all();
const report = await page.evaluate(() => window.__vkFit);
for (const box of ratiosOnly ? [] : boxes) {
  const key = await box.getAttribute("data-pdf-page");
  if (want && !want.includes(key)) continue;
  await box.scrollIntoViewIfNeeded();
  await box.screenshot({ path: path.join(outDir, `${key}.png`) });
}
console.log(ratiosOnly ? report.filter((f) => f.ratio > 0.97).sort((a, b) => b.ratio - a.ratio).map((f) => `${f.key}=${f.ratio}/c${f.cols}s${f.step}${f.clipped ? "!o" + f.over : ""}`).join(" ") : JSON.stringify(report.filter((f) => !want || want.includes(f.key))));
await browser.close();
