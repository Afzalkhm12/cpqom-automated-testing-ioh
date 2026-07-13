import { expect } from "@playwright/test";
import * as lightning from "../utils/sf-lightning.js";

/**
 * Page Object for Contract management in Salesforce.
 *
 * Covers:
 *   - Document upload (FAB, signed documents)
 *   - Links section verification
 *   - Contract stage transitions (UI)
 */

/**
 * Upload a document to a Contract record.
 * @param {string} docType - Document type to select (e.g. "FAB")
 * @param {string} filePath - Path to the file to upload
 */
export async function uploadDocument(page, docType, filePath) {
  // Click Upload Document action button
  await lightning.clickActionButton(page, "Upload Document");
  await page.waitForTimeout(2000);

  // Select Document Type
  await lightning.selectPicklistValue(page, "Document Type", docType);
  await page.waitForTimeout(1000);

  // Upload file
  await lightning.uploadFile(page, filePath);

  // Click Upload button
  const uploadBtn = page
    .locator("button")
    .filter({ hasText: /^Upload$/i })
    .first();
  if (await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await uploadBtn.click();
  }

  await lightning.waitForLightningReady(page);
}

/**
 * Verify a document is accessible in the Related > Links section.
 * @param {string} linkText - Expected link text
 * @returns {Promise<boolean>} Whether the link is visible
 */
export async function verifyDocumentInLinks(page, linkText) {
  await lightning.navigateToTab(page, "Related");
  await page.waitForTimeout(2000);

  // Scroll to Links section
  const linksSection = page
    .locator("article, lst-related-list-single-container, .slds-card")
    .filter({ hasText: /Links/i })
    .first();

  if (await linksSection.isVisible({ timeout: 10000 }).catch(() => false)) {
    await linksSection.scrollIntoViewIfNeeded().catch(() => {});

    const link = linksSection
      .locator("a")
      .filter({ hasText: new RegExp(linkText, "i") })
      .first();

    return link.isVisible({ timeout: 5000 }).catch(() => false);
  }

  return false;
}

/**
 * Click and open a document link from the Related > Links section.
 * @param {string} linkText
 */
export async function openDocumentLink(page, linkText) {
  await lightning.navigateToTab(page, "Related");
  await page.waitForTimeout(2000);

  const link = page
    .locator("a")
    .filter({ hasText: new RegExp(linkText, "i") })
    .first();

  await link.scrollIntoViewIfNeeded().catch(() => {});
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  await lightning.waitForLightningReady(page);
}

/**
 * Move Contract to a specific stage via UI (stage ribbon click).
 * @param {string} stageName - e.g. "Negotiation", "Customer Assessment"
 */
export async function moveToStage(page, stageName) {
  await lightning.clickStageRibbon(page, stageName);
  await lightning.markStageComplete(page);
  await lightning.waitForLightningReady(page);
}

/**
 * Verify RCA Validation field is set.
 * IPH-NEWFIX-012
 */
export async function markRCAValidation(page, value = true) {
  // Find and check the RCA Validation checkbox/field
  const rcaField = page
    .locator("lightning-input-field, lightning-input")
    .filter({ hasText: /RCA Validation/i })
    .first();

  if (await rcaField.isVisible({ timeout: 5000 }).catch(() => false)) {
    const checkbox = rcaField.locator("input[type='checkbox']").first();
    if (value) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
    await lightning.saveRecord(page);
  } else {
    // Try inline edit
    await lightning.inlineEditField(
      page,
      "RCA Validation",
      value ? "true" : "false"
    );
    await lightning.saveRecord(page);
  }
}
