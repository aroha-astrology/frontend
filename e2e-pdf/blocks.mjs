// Heights of the blocks on given pages: node e2e-pdf/blocks.mjs <lang> <q> key1,key2
import { chromium, devices } from "@playwright/test";
const [lang = "en", q = "2", keys = ""] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 900, height: 1200 } });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:3120/varshik-preview?view=book&lang=${lang}&q=${q}`);
await page.waitForSelector("body[data-fitted='1']", { timeout: 120000 });
for (const key of keys.split(",")) {
  const out = await page.evaluate((key) => {
    const box = document.querySelector(`[data-pdf-page="${key}"]`);
    const inner = box.querySelector("[data-a4-inner]");
    inner.style.setProperty("--vk-fit", "0.7");
    const body = box.querySelector("[data-a4-body]");
    const rows = [`room ${body.clientHeight}, content ${inner.offsetHeight}`];
    const walk = (el, depth) => {
      for (const c of el.children) {
        const h = Math.round(c.getBoundingClientRect().height);
        if (h < 40) continue;
        rows.push(`${"  ".repeat(depth)}${c.tagName.toLowerCase()}.${String(c.className).slice(0, 40)} ${h}px`);
        if (depth < 2) walk(c, depth + 1);
      }
    };
    walk(inner, 0);
    return rows.join("\n");
  }, key);
  console.log(`== ${key}\n${out}`);
}
await browser.close();
