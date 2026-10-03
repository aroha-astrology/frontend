import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const REPORT_ID = "44444444-4444-4444-8444-444444444444";

const PARAGRAPH =
  "Your year is shaped by Saturn's bhukti, steady and slow, rewarding patience in work and money. " +
  "Effort made in the first half returns in the second, so keep commitments small and regular.";

/** A report long enough to need several pages. */
const LONG_REPORT = {
  status: "ready",
  reportKey: "remedies",
  periodMonth: null,
  scores: {},
  sections: Array.from({ length: 8 }, (_, i) => ({
    heading: `Remedy chapter ${i + 1}`,
    paragraphs: [PARAGRAPH, PARAGRAPH, PARAGRAPH],
    bullets: ["Light a lamp on Saturdays", "Feed birds in the morning"],
  })),
};

/** A designed report: its narrative sits in an accordion with only the first row open. */
const ACCORDION_REPORT = {
  status: "ready",
  reportKey: "past_life",
  periodMonth: null,
  scores: {},
  sections: ["First", "Second", "Third"].map((name, i) => ({
    id: `e2e_section_${i}`,
    heading: `${name} chapter`,
    paragraphs: [`${name} chapter body. ${PARAGRAPH}`],
  })),
};

async function openReport(page: Page, report: unknown) {
  await skipLaunchOverlays(page);
  await mockApi(page, { overrides: { "GET /v1/reports/:id": () => ({ json: report }) } });
  await signIn(page, `/reports/${REPORT_ID}`);
  await expect(page.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
}

async function downloadPdf(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).first().click(),
  ]);
  const pdf = (await readFile(await download.path())).toString("latin1");
  return { download, pdf };
}

test.describe("Download a report as a PDF", () => {
  test("a long report downloads as a multi-page PDF named after the report", async ({ page }) => {
    await openReport(page, LONG_REPORT);
    const { download, pdf } = await downloadPdf(page);

    expect(download.suggestedFilename()).toBe("aroha-remedies.pdf");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    const pageCount = Number(/\/Count (\d+)/.exec(pdf)![1]);
    expect(pageCount).toBeGreaterThan(2);
    // Every page is a picture of the screen, so there is one image per page.
    expect(pdf.match(/\/Filter \/DCTDecode/g)).toHaveLength(pageCount);

    await expect(page.getByTestId("pdf-notice")).toHaveText("PDF downloaded");
    // The buttons come back once the capture is over.
    await expect(page.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  });

  test("closed accordion rows are opened for the PDF and closed again after", async ({ page }) => {
    await openReport(page, ACCORDION_REPORT);
    const closedRow = page.getByText("Third chapter body.");
    await expect(page.getByText("First chapter body.")).toBeVisible();
    await expect(closedRow).toHaveCount(0);

    // Hold the capture at its last step, so the screen can be checked while it is opened up.
    await page.evaluate(() => {
      const realToBlob = HTMLCanvasElement.prototype.toBlob;
      const gate = new Promise<void>((release) => {
        (window as unknown as { releasePdf: () => void }).releasePdf = release;
      });
      HTMLCanvasElement.prototype.toBlob = function (...args) {
        void gate.then(() => realToBlob.apply(this, args));
      };
    });
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).first().click();

    await expect(page.getByTestId("pdf-working")).toBeVisible();
    await expect(closedRow).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);

    await page.evaluate(() => (window as unknown as { releasePdf: () => void }).releasePdf());
    await downloading;
    await expect(page.getByTestId("pdf-working")).toHaveCount(0);
    await expect(closedRow).toHaveCount(0);
    await expect(page.getByText("First chapter body.")).toBeVisible();
  });
});
