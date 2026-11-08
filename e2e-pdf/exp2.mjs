import { chromium, devices } from "@playwright/test";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 900, height: 1200 } });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:3120/varshik-preview?view=book&lang=en&q=2`);
await page.waitForSelector("body[data-fitted='1']");
console.log(await page.evaluate(() => { const i = document.querySelector('[data-pdf-page="area_love"] [data-a4-inner]'); const out=[]; for (const z of ["1","0.7"]) { i.style.setProperty("--vk-fit", z); out.push(`${z}: offsetH ${i.offsetHeight} rectH ${Math.round(i.getBoundingClientRect().height)} scrollH ${i.scrollHeight} offsetW ${i.offsetWidth}`);} return out.join("\n"); }));
await browser.close();
