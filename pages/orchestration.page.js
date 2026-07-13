import { expect } from "@playwright/test";
import * as lightning from "../utils/sf-lightning.js";

/**
 * Page Object for Orchestration Plan UI verification.
 *
 * Most orchestration operations are done via API (sf-api.js).
 * This page object is for UI-based verification when needed.
 */

/**
 * Navigate to an Orchestration Plan from a sub-order.
 */
export async function navigateToOrchPlan(page) {
  // Go to Related tab
  await lightning.navigateToTab(page, "Related");
  await page.waitForTimeout(2000);

  // Find and click Orchestration Plan in the related list
  const orchPlanLink = page
    .locator("a")
    .filter({ hasText: /Orchestration Plan/i })
    .first();

  if (await orchPlanLink.isVisible({ timeout: 10000 }).catch(() => false)) {
    await orchPlanLink.click();
    await lightning.waitForLightningReady(page);
  }
}

/**
 * Verify an Orchestration Item status in the UI.
 * @param {string} itemName - e.g. "Service Activation", "Billing Order Activation"
 * @param {string} expectedStatus - e.g. "Completed", "Failed", "Running"
 */
export async function verifyOrchItemStatus(page, itemName, expectedStatus) {
  // Find the orchestration item row
  const itemRow = page
    .locator("tr, div, article")
    .filter({ hasText: new RegExp(itemName, "i") })
    .first();

  await itemRow.scrollIntoViewIfNeeded().catch(() => {});

  // Verify status text
  const statusText = itemRow
    .locator("*")
    .filter({ hasText: new RegExp(expectedStatus, "i") })
    .first();

  await expect(statusText).toBeVisible({ timeout: 15000 });
}

/**
 * Click the three-dot menu on an orchestration item and select an action.
 * @param {string} itemName - Orchestration item name
 * @param {string} action - Menu action (e.g. "View Record", "Retry Item")
 */
export async function clickOrchItemAction(page, itemName, action) {
  const itemRow = page
    .locator("tr, div")
    .filter({ hasText: new RegExp(itemName, "i") })
    .first();

  // Click three-dot menu
  const menuBtn = itemRow
    .locator(
      "button[title*='action'], lightning-button-menu, " +
        "button.slds-button_icon-border-filled"
    )
    .first();
  await menuBtn.click();
  await page.waitForTimeout(500);

  // Click menu item
  const menuItem = page
    .locator("[role='menuitem'], lightning-menu-item a")
    .filter({ hasText: new RegExp(action, "i") })
    .first();
  await expect(menuItem).toBeVisible({ timeout: 5000 });
  await menuItem.click();
  await lightning.waitForLightningReady(page);
}

/**
 * Navigate to a Work Order from an Orchestration Item.
 * Clicks the three-dot menu → View Record, then navigates to the Work Order.
 * @param {string} orchItemName - e.g. "Create FSL Work Order"
 */
export async function navigateToWorkOrderFromOrchItem(page, orchItemName) {
  await clickOrchItemAction(page, orchItemName, "View Record");
  await page.waitForTimeout(3000);

  // Find and click the Work Order link
  const workOrderLink = page
    .locator("a")
    .filter({ hasText: /Work Order|WO-/i })
    .first();

  if (await workOrderLink.isVisible({ timeout: 10000 }).catch(() => false)) {
    await workOrderLink.click();
    await lightning.waitForLightningReady(page);
  }
}

/**
 * Verify the Orchestration Plan section is visible on a record page.
 */
export async function verifyOrchPlanSection(page) {
  const section = page
    .locator("*")
    .filter({ hasText: /Orchestration Plan/i })
    .first();
  await expect(section).toBeVisible({ timeout: 15000 });
}
