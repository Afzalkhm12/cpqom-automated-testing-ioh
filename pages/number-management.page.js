import { expect } from "@playwright/test";
import * as lightning from "../utils/sf-lightning.js";

/**
 * Page Object for Number Management wizard in CPQ.
 *
 * Covers:
 *   - Opening Number Management from Enterprise Quote
 *   - Reserving fixed numbers
 *   - Verifying "no number available" scenario
 */

/**
 * Open the Number Management wizard from the Enterprise Quote page.
 */
export async function openNumberManagement(page) {
  const numMgmtBtn = page
    .locator("a, button, span, lightning-tab")
    .filter({ hasText: /Number Mgmt|Number Management/i })
    .first();
  await expect(numMgmtBtn).toBeVisible({ timeout: 15000 });
  await numMgmtBtn.click();
  await lightning.waitForLightningReady(page);
}

/**
 * Select an IPHONE product in the Number Management wizard.
 * @param {string} productName - Product to select
 */
export async function selectProduct(page, productName) {
  // Wait for OmniScript spinner to disappear if present
  const spinner = page
    .locator(".vlocity-loader-spinner, lightning-spinner, .slds-spinner")
    .first();
  if (await spinner.isVisible({ timeout: 5000 }).catch(() => false)) {
    await spinner.waitFor({ state: "hidden", timeout: 30000 });
  }

  // Try clicking a row/item with the product name precisely
  const productText = page.getByText(productName, { exact: true }).first();

  if (await productText.isVisible({ timeout: 30000 }).catch(() => false)) {
    // Click the text itself, which usually triggers the click handler
    await productText.click();
    await page.waitForTimeout(1000);

    // If the modal is still asking to select a product and there are no action buttons visible yet
    const selectHeading = page.getByText(
      "Select a Product for which to upload numbers against."
    );
    if (await selectHeading.isVisible()) {
      console.log(
        `Clicking text didn't advance. Trying to click the parent container...`
      );
      await productText.locator("..").click();
      await page.waitForTimeout(1000);
    }
  } else {
    throw new Error(
      `Product ${productName} not found in Number Management product selection list after 30s.`
    );
  }
}

/**
 * Reserve a number by entering a prefix and clicking Reserve.
 * @param {string} prefix - Number prefix to search (e.g. "62858")
 * @returns {Promise<string[]>} List of available numbers found
 */
export async function reserveNumber(page, prefix) {
  // Click Reserve Number button if visible
  const reserveBtn = page
    .locator("button")
    .filter({ hasText: /Reserve Number/i })
    .first();
  if (await reserveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await reserveBtn.click();
    await lightning.waitForLightningReady(page);
  }

  // Fill prefix/pattern input
  const patternInput = page
    .locator(
      "input[placeholder*='number'], input[placeholder*='pattern'], " +
        "input[placeholder*='prefix'], input[name*='number'], " +
        "input[name*='pattern'], input[name*='prefix']"
    )
    .first();
  await expect(patternInput).toBeVisible({ timeout: 10000 });
  await patternInput.click();
  await patternInput.clear();
  await patternInput.fill(prefix);

  // Click Reserve Numbers / Search
  const searchBtn = page
    .locator("button")
    .filter({ hasText: /Reserve Numbers|Search|Query/i })
    .first();
  await expect(searchBtn).toBeVisible({ timeout: 10000 });
  await searchBtn.click();

  // Wait for results
  await lightning.waitForLightningReady(page);
  await page.waitForTimeout(3000);

  // Check for results
  const numberRows = page.locator(
    "table tbody tr, lightning-datatable tbody tr, .slds-table tbody tr"
  );
  const count = await numberRows.count().catch(() => 0);

  const numbers = [];
  for (let i = 0; i < Math.min(count, 10); i++) {
    const text = await numberRows
      .nth(i)
      .textContent()
      .catch(() => "");
    numbers.push(text.trim());
  }

  return numbers;
}

/**
 * Verify that no available number is returned (negative test).
 * Checks for "no number available" or similar error message.
 * @param {string} prefix - Prefix that should return no results
 */
export async function verifyNoNumberAvailable(page, prefix) {
  // Fill prefix and search
  const patternInput = page
    .locator(
      "input[placeholder*='number'], input[placeholder*='pattern'], " +
        "input[placeholder*='prefix'], input[name*='number']"
    )
    .first();
  await expect(patternInput).toBeVisible({ timeout: 10000 });
  await patternInput.clear();
  await patternInput.fill(prefix);

  const searchBtn = page
    .locator("button")
    .filter({ hasText: /Reserve Numbers|Search|Query/i })
    .first();
  await searchBtn.click();
  await lightning.waitForLightningReady(page);
  await page.waitForTimeout(3000);

  // Look for "no number available" message
  const noResultMsg = page
    .locator("*")
    .filter({
      hasText: /no.*available|not.*found|no.*number|no.*result|tidak.*tersedia/i
    })
    .last();

  await expect(noResultMsg).toBeVisible({ timeout: 15000 });
}

/**
 * Select a number from the results list.
 * @param {number} [index=0] - Index of the number to select
 */
export async function selectNumber(page, index = 0) {
  const radioBtn = page
    .locator("input[type='radio'], input[type='checkbox']")
    .nth(index);
  if (await radioBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await radioBtn.click();
  } else {
    // Try clicking the row itself
    const row = page
      .locator("table tbody tr, lightning-datatable tbody tr")
      .nth(index);
    await row.click();
  }
  await page.waitForTimeout(500);
}

/**
 * Click Next/Confirm to finalize number reservation.
 */
export async function confirmReservation(page) {
  const nextBtn = page
    .locator("button")
    .filter({ hasText: /^Next$|^Confirm$|^Reserve$/i })
    .first();
  await expect(nextBtn).toBeVisible({ timeout: 10000 });
  await nextBtn.click();
  await lightning.waitForLightningReady(page);
}
