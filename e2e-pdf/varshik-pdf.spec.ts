import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * The Varshik PDF has exactly 59 + N pages (N = the reader's question pages, 0-5), in English, Hindi and
 * Tamil, is under 15 MB, is named Varshik-Rashifal-2027-<Name>.pdf, and NO page is clipped in any language (owner,
 * 2026-11-09: the allowance is zero, Tamil included). Two data sets: `live` (a real generated report, saved before C5)
 * and `sample` (the current facts schema: C5 eclipse classes and house labels, with placeholder sentences).
 * The PDFs are kept in e2e-pdf/out (gitignored) for the screenshot pass.
 */
const OUT = path.join(__dirname, "out");
const MAX_BYTES = 15 * 1024 * 1024;

function pageCount(pdf: Buffer): number {
  // The hand-written PDF has one "/Type /Page" object per page and one "/Type /Pages" tree.
  return (pdf.toString("latin1").match(/\/Type \/Page(?![s\w])/g) ?? []).length;
}

for (const src of ["live", "sample"]) {
for (const lang of ["en", "hi", "ta"]) {
  for (const n of [0, 5]) {
    test(`${src}, ${lang}, ${n} question pages: ${59 + n} A4 pages, under 15 MB, nothing clipped`, async ({ page }) => {
      fs.mkdirSync(OUT, { recursive: true });
      await page.goto(`/varshik-preview?view=pdf&lang=${lang}&q=${n}&src=${src}`);
      await expect(page.getByTestId("varshik-report")).toBeVisible();
      await page.waitForTimeout(800);
      await expect(page.locator("span[aria-live]")).toHaveText(new RegExp(`of ${59 + n}$|${59 + n}`));

      const started = Date.now();
      const downloadPromise = page.waitForEvent("download", { timeout: 280_000 });
      await page.getByRole("button", { name: /PDF/ }).first().evaluate((el) => (el as HTMLButtonElement).click()); // the preview page has no bottom padding, so the app tab bar covers it
      const download = await downloadPromise;
      const seconds = Math.round((Date.now() - started) / 1000);
      const file = path.join(OUT, `${src}-${lang}-q${n}.pdf`);
      await download.saveAs(file);
      const bytes = fs.readFileSync(file);

      expect(download.suggestedFilename()).toMatch(/^Varshik-Rashifal-2027(-[\p{L}\p{M}\p{N}-]+)?\.pdf$/u);
      expect(pageCount(bytes)).toBe(59 + n);
      expect(bytes.length).toBeLessThan(MAX_BYTES);
      const fits = await page.evaluate(() => (window as unknown as { __vkFit?: { key: string; step: number; clipped: boolean; ratio: number }[] }).__vkFit ?? []);
      expect(fits.length).toBe(59 + n);
      const clipped = fits.filter((f) => f.clipped).map((f) => f.key);
      const shrunk = fits.filter((f) => f.step > 0).map((f) => `${f.key}:${f.step}`);
      console.log(`${src} ${lang} q${n}: ${pageCount(bytes)} pages, ${(bytes.length / 1048576).toFixed(1)} MB, ${seconds}s, name ${download.suggestedFilename()}, shrunk ${shrunk.length}, ratios [${fits.map((f) => `${f.key}=${f.ratio}`).join(" ")}], clipped [${clipped.join(" ")}]`);
      expect(clipped, "pages clipped even at the smallest font step and the dense step").toEqual([]);
    });
  }
}
}
