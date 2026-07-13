import { expect } from "@playwright/test";
import * as lightning from "../utils/sf-lightning.js";

/**
 * Page Object for Work Order and Work Plan management.
 *
 * Covers:
 *   - Pre-Activation work plan steps (IPH-NEWFIX-022 → 030)
 *   - Testing work plan steps (IPH-NEWFIX-045 → 053)
 *   - Work step completion (simple, with form, with upload, with SPK)
 *   - RFS Date and Bill Date updates
 */

/**
 * Navigate to a Work Order page.
 * @param {string} workOrderUrl - Full Lightning URL of the Work Order
 */
export async function navigateToWorkOrder(page, workOrderUrl) {
  await page.goto(workOrderUrl);
  await lightning.waitForLightningReady(page);
}

/**
 * Verify a work plan step is available.
 * @param {string} stepName - Name of the work plan step
 * @returns {Promise<boolean>} Whether the step is visible
 */
export async function verifyWorkPlanStepExists(page, stepName) {
  const step = page
    .locator("*")
    .filter({ hasText: new RegExp(`^${stepName}$`, "i") })
    .first();

  const isVisible = await step.isVisible({ timeout: 10000 }).catch(() => false);

  if (!isVisible) {
    // Scroll down to find it
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
  }

  return page
    .locator("*")
    .filter({ hasText: new RegExp(stepName, "i") })
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);
}

/**
 * Complete a simple work plan step (mark as Complete).
 * Used for steps that just need a status change without additional input.
 *
 * @param {string} stepName - e.g. "Conduct COM with Customer"
 */
export async function completeSimpleStep(page, stepName) {
  // Find the step row/section
  const stepSection = page
    .locator("tr, div, li, article")
    .filter({ hasText: new RegExp(stepName, "i") })
    .first();

  await stepSection.scrollIntoViewIfNeeded().catch(() => {});

  // Click Complete button within the step
  const completeBtn = stepSection
    .locator("button, a")
    .filter({ hasText: /Complete|Mark.*Complete/i })
    .first();

  if (await completeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await completeBtn.click();
  } else {
    // Try the status dropdown approach
    const statusBtn = stepSection
      .locator("button, lightning-combobox")
      .filter({ hasText: /status|Complete|Not Applicable/i })
      .first();
    if (await statusBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusBtn.click();
      await page.waitForTimeout(500);

      const completeOption = page
        .locator("[role='option'], [role='menuitem']")
        .filter({ hasText: /^Complete$/i })
        .first();
      await completeOption.click();
    }
  }

  await lightning.waitForLightningReady(page);
}

/**
 * Complete a work step that requires filling a form.
 * Used for steps like "Assign Outtask/Partner" that need form input.
 *
 * @param {string} stepName - Step name
 * @param {object} formData - Key-value pairs of form fields to fill
 */
export async function completeStepWithForm(page, stepName, formData = {}) {
  // Click the step to open the form
  const stepSection = page
    .locator("tr, div, li, article")
    .filter({ hasText: new RegExp(stepName, "i") })
    .first();

  await stepSection.scrollIntoViewIfNeeded().catch(() => {});

  // Click Complete to trigger form
  const completeBtn = stepSection
    .locator("button")
    .filter({ hasText: /Complete/i })
    .first();
  if (await completeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await completeBtn.click();
    await page.waitForTimeout(2000);
  }

  // Fill form fields
  for (const [label, value] of Object.entries(formData)) {
    await lightning.fillField(page, label, value);
  }

  // Close/Submit the form
  const submitBtn = page
    .locator("button")
    .filter({ hasText: /Save|Submit|Close|Confirm/i })
    .first();
  if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await submitBtn.click();
  }

  await lightning.waitForLightningReady(page);
}

/**
 * Complete a work step that requires uploading a file.
 * Used for steps like "Upload Site Survey Result", "Upload LLD", "Upload Signed BAST".
 *
 * @param {string} stepName
 * @param {string} filePath - Absolute path to the file to upload
 * @param {boolean} [testWithoutFile=false] - If true, try completing without file first (negative test)
 */
export async function completeStepWithUpload(
  page,
  stepName,
  filePath,
  testWithoutFile = false
) {
  const stepSection = page
    .locator("tr, div, li, article")
    .filter({ hasText: new RegExp(stepName, "i") })
    .first();

  await stepSection.scrollIntoViewIfNeeded().catch(() => {});

  if (testWithoutFile) {
    // Try completing without upload — should show error
    const completeBtn = stepSection
      .locator("button")
      .filter({ hasText: /Complete/i })
      .first();
    if (await completeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completeBtn.click();
      await page.waitForTimeout(2000);

      // Verify error message
      const errorMsg = page
        .locator("*")
        .filter({ hasText: /upload|required|error/i })
        .first();
      await expect(errorMsg).toBeVisible({ timeout: 10000 });
    }
  }

  // Upload the file
  await lightning.uploadFile(page, filePath);

  // Now complete the step
  await completeSimpleStep(page, stepName);
}

/**
 * Complete a work step that generates an SPK document.
 * Used for "Conduct Site Survey" and "Conduct Installation".
 *
 * @param {string} stepName
 */
export async function completeStepWithSPK(page, stepName) {
  const stepSection = page
    .locator("tr, div, li, article")
    .filter({ hasText: new RegExp(stepName, "i") })
    .first();

  await stepSection.scrollIntoViewIfNeeded().catch(() => {});

  // Click Generate SPK button
  const spkBtn = page
    .locator("button")
    .filter({ hasText: /Generate SPK|SPK/i })
    .first();
  if (await spkBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await spkBtn.click();
    await lightning.waitForLightningReady(page);
    await page.waitForTimeout(3000);
  }

  // Complete the step
  await completeSimpleStep(page, stepName);
}

/**
 * Update Work Order fields (e.g. RFS Date, Start Billing Date).
 * IPH-NEWFIX-053
 *
 * @param {object} fields - Field label → value pairs
 */
export async function updateWorkOrderFields(page, fields) {
  for (const [label, value] of Object.entries(fields)) {
    await lightning.inlineEditField(page, label, value);
  }
  await lightning.saveRecord(page);
}

/**
 * Complete the "Send BAST" work plan step.
 * IPH-NEWFIX-049
 */
export async function completeSendBAST(page) {
  await completeSimpleStep(page, "Send BAST");
}

/**
 * Complete a work step using the appropriate method based on step type.
 * Unified entry point for data-driven test execution.
 *
 * @param {string} stepName
 * @param {'simple'|'form'|'upload'|'spk'|'fields'} stepType
 * @param {object} [data] - Additional data (form fields, file path, etc.)
 */
export async function completeWorkStep(page, stepName, stepType, data = {}) {
  switch (stepType) {
    case "simple":
      await completeSimpleStep(page, stepName);
      break;
    case "form":
      await completeStepWithForm(page, stepName, data.formData ?? {});
      break;
    case "upload":
      await completeStepWithUpload(
        page,
        stepName,
        data.filePath,
        data.testWithoutFile ?? false
      );
      break;
    case "spk":
      await completeStepWithSPK(page, stepName);
      break;
    case "fields":
      await updateWorkOrderFields(page, data.fields ?? {});
      break;
    default:
      await completeSimpleStep(page, stepName);
  }
}
