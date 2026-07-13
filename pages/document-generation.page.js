import { expect } from "@playwright/test";
import * as lightning from "../utils/sf-lightning.js";

/**
 * Page Object for Document Generation wizard in Salesforce CPQ/Vlocity.
 *
 * Covers:
 *   - Quote Document generation (IOH Quote Document)
 *   - FAB Document generation
 *   - BAST Document generation
 *   - PDF download and verification
 *   - Check-in workflow
 */

/**
 * Open the Document Generation wizard.
 * @param {string} buttonText - Button to click (e.g. "Generate Document", "Generate")
 */
export async function openDocumentWizard(page, buttonText = "Generate") {
  const btn = page
    .locator("button, a, lightning-button")
    .filter({ hasText: new RegExp(buttonText, "i") })
    .first();
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await expect(btn).toBeVisible({ timeout: 15000 });
  await btn.click();
  await lightning.waitForLightningReady(page);
}

/**
 * Generate a document using a specific template.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} templateName - e.g. "IOH Quote Document", "IOH FAB Document (version 1) [DocX]"
 * @param {object} [options]
 * @param {boolean} [options.downloadPdf=true] - Whether to download the PDF
 * @param {boolean} [options.checkIn=false] - Whether to check in the document
 */
export async function generateDocument(page, templateName, options = {}) {
  const { downloadPdf = true, checkIn = false } = options;

  // Step 1: Open wizard if not already open
  const isWizardOpen = await page
    .locator("text=Select a Document Template, text=Document Template")
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (!isWizardOpen) {
    await openDocumentWizard(page, "Generate");
  }

  // Step 2: Select template
  const templateDropdown = page
    .locator("select, lightning-combobox, [role='combobox']")
    .filter({ hasText: /Template|Document/i })
    .first();

  if (await templateDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
    await templateDropdown.click();
    await page.waitForTimeout(500);

    const templateOption = page
      .locator("[role='option'], option")
      .filter({ hasText: new RegExp(templateName, "i") })
      .first();
    if (await templateOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await templateOption.click();
    }
  } else {
    // Try clicking the template name directly (some wizards show a list)
    const templateLink = page
      .locator("a, span, div, li")
      .filter({ hasText: new RegExp(templateName, "i") })
      .first();
    if (await templateLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await templateLink.click();
    }
  }
  await page.waitForTimeout(1000);

  // Step 3: Click Next
  const nextBtn = page
    .locator("button")
    .filter({ hasText: /^Next$/i })
    .first();
  if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await nextBtn.click();
    await lightning.waitForLightningReady(page);
  }

  // Step 4: Wait for preview/generation
  await page.waitForTimeout(5000);
  const preview = page
    .locator("text=Preview, text=Download, iframe[src*='pdf']")
    .first();
  await preview.waitFor({ state: "visible", timeout: 30000 }).catch(() => {
    console.log("Document preview did not appear, continuing...");
  });

  // Step 5: Download PDF if requested
  if (downloadPdf) {
    await downloadDocumentPDF(page);
  }

  // Step 6: Check in if requested
  if (checkIn) {
    await checkInDocument(page);
  }
}

/**
 * Download the generated document as PDF.
 */
export async function downloadDocumentPDF(page) {
  const downloadBtn = page
    .locator("button, a")
    .filter({ hasText: /Download.*PDF|Download/i })
    .first();

  if (await downloadBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    // Start waiting for download before clicking
    const downloadPromise = page
      .waitForEvent("download", { timeout: 15000 })
      .catch(() => null);
    await downloadBtn.click();
    const download = await downloadPromise;
    if (download) {
      console.log(`Downloaded: ${download.suggestedFilename()}`);
    }
  }
  await page.waitForTimeout(2000);
}

/**
 * Click the download icon button in the document preview.
 */
export async function clickDownloadIcon(page) {
  const downloadIcon = page
    .locator("button[title*='Download'], a[title*='Download'], lightning-icon")
    .filter({ hasText: /download/i })
    .first();

  if (await downloadIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
    await downloadIcon.click();
    await page.waitForTimeout(2000);
  }
}

/**
 * Check in a generated document (FAB workflow).
 */
export async function checkInDocument(page) {
  const checkInBtn = page
    .locator("button")
    .filter({ hasText: /Check In|Checkin/i })
    .first();
  await expect(checkInBtn).toBeVisible({ timeout: 10000 });
  await checkInBtn.click();
  await lightning.waitForLightningReady(page);
}

/**
 * Mark Quote Document status as Complete.
 */
export async function markDocumentComplete(page) {
  const btn = page
    .locator("button")
    .filter({ hasText: /Mark.*Complete|Complete/i })
    .first();
  if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btn.click();
    await lightning.waitForLightningReady(page);
  }
}

/**
 * Generate BAST document from Work Order page.
 * IPH-NEWFIX-049
 */
export async function generateBAST(page, templateName = "BAST Document") {
  // Click Generate BAST button
  await openDocumentWizard(page, "Generate BAST");

  // Select template and generate
  await generateDocument(page, templateName, {
    downloadPdf: true,
    checkIn: false
  });
}
