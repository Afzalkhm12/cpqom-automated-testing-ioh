import { expect } from "@playwright/test";

/**
 * Generic Salesforce Lightning UI helpers.
 *
 * These helpers are designed to be resilient to Salesforce DOM changes by
 * using multiple fallback selectors and waiting strategies.
 *
 * Usage:
 *   import * as lightning from '../utils/sf-lightning.js';
 *   await lightning.clickStageRibbon(page, 'Negotiation');
 */

// ─── Wait Helpers ──────────────────────────────────────────────────────────

/**
 * Wait for Salesforce Lightning to finish rendering.
 * Waits for common loading indicators to disappear.
 */
export async function waitForLightningReady(page, timeoutMs = 15000) {
  await page.waitForLoadState("domcontentloaded");

  // Wait for Lightning spinner to disappear
  const spinner = page.locator(
    ".slds-spinner_container, .slds-spinner, lightning-spinner"
  );
  await spinner
    .first()
    .waitFor({ state: "hidden", timeout: timeoutMs })
    .catch(() => {});

  // Small extra wait for LWC re-renders
  await page.waitForTimeout(1000);
}

/**
 * Wait for a Salesforce toast notification.
 * @param {'success'|'error'|'warning'|'info'} [type] - Toast type to wait for
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<string>} Toast message text
 */
export async function waitForToast(page, type, timeoutMs = 10000) {
  const toastSelector = type
    ? `.toastMessage, lightning-primitive-icon[variant="${type}"]`
    : ".toastMessage, .slds-notify__content";

  const toast = page.locator(toastSelector).first();
  await toast.waitFor({ state: "visible", timeout: timeoutMs });

  const toastContainer = page
    .locator(".slds-notify_toast, .forceToastMessage")
    .first();
  const text = await toastContainer.textContent().catch(() => "");
  return text.trim();
}

// ─── Navigation ────────────────────────────────────────────────────────────

/**
 * Navigate to a Salesforce record by ID.
 * @param {string} instanceUrl - Lightning base URL
 * @param {string} recordId - 18 or 15-char Salesforce ID
 */
export async function navigateToRecord(page, instanceUrl, recordId) {
  const lightningUrl = instanceUrl.replace(
    ".my.salesforce.com",
    ".sandbox.lightning.force.com"
  );
  const url = `${lightningUrl}/lightning/r/${recordId}/view`;
  await page.goto(url);
  await waitForLightningReady(page);
}

/**
 * Navigate to a specific tab on a record page.
 * @param {string} tabName - e.g. "Related", "Details", "Activity"
 */
export async function navigateToTab(page, tabName) {
  // Lightning tabs use different markup depending on the page type
  const tabLocator = page
    .locator(
      `a[data-tab-value="${tabName}"], ` +
        `a.slds-tabs_default__link, ` +
        `lightning-tab-bar a, ` +
        `a[title="${tabName}"]`
    )
    .filter({ hasText: new RegExp(`^${tabName}$`, "i") })
    .first();

  await tabLocator.scrollIntoViewIfNeeded().catch(() => {});
  await expect(tabLocator).toBeVisible({ timeout: 10000 });
  await tabLocator.click();
  await waitForLightningReady(page);
}

// ─── Stage Ribbon / Path ───────────────────────────────────────────────────

/**
 * Click a stage in the Lightning Path (stage ribbon).
 * @param {string} stageName - e.g. "Negotiation", "Closed Won"
 */
export async function clickStageRibbon(page, stageName) {
  // Lightning Path uses <a> tags inside lightning-path-step
  const stageLocator = page
    .locator(
      `lightning-path-step a[title="${stageName}"], ` +
        `a.slds-path__link[title="${stageName}"], ` +
        `.slds-path__item a`
    )
    .filter({ hasText: new RegExp(stageName, "i") })
    .first();

  await stageLocator.scrollIntoViewIfNeeded().catch(() => {});
  await expect(stageLocator).toBeVisible({ timeout: 15000 });
  await stageLocator.click();
  await page.waitForTimeout(1000);
}

/**
 * Click "Mark as Current Stage" or "Mark Stage as Complete" button.
 */
export async function markStageComplete(page) {
  const markBtn = page
    .locator("button")
    .filter({
      hasText: /Mark.*Stage|Mark as Current|Select Closed/i
    })
    .first();

  await markBtn.scrollIntoViewIfNeeded().catch(() => {});
  await expect(markBtn).toBeVisible({ timeout: 10000 });
  await markBtn.click();
  await waitForLightningReady(page);
}

// ─── Action Buttons ────────────────────────────────────────────────────────

/**
 * Click a top-level action button on a record page.
 * Handles both standard and custom buttons.
 * @param {string} buttonName - Button text (e.g. "Submit Order", "Create Order")
 */
export async function clickActionButton(page, buttonName) {
  // Try multiple selectors: action buttons can be <button>, <a>, or lightning-button
  const btn = page
    .locator(
      `button, a, lightning-button, runtime_platform_actions-action-renderer`
    )
    .filter({ hasText: new RegExp(`^${buttonName}$`, "i") })
    .first();

  await btn.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  await expect(btn).toBeVisible({ timeout: 15000 });
  await btn.click();
  await waitForLightningReady(page);
}

/**
 * Click a button in a dropdown/menu (overflow actions).
 * @param {string} menuButtonText - Text of the menu trigger button
 * @param {string} menuItemText - Text of the menu item to click
 */
export async function clickDropdownMenuItem(
  page,
  menuButtonText,
  menuItemText
) {
  // Open the dropdown
  const menuBtn = page
    .locator("button, lightning-button-menu")
    .filter({ hasText: new RegExp(menuButtonText, "i") })
    .first();
  await menuBtn.click();
  await page.waitForTimeout(500);

  // Click the menu item
  const item = page
    .locator("lightning-menu-item a, .slds-dropdown__item a, [role='menuitem']")
    .filter({ hasText: new RegExp(menuItemText, "i") })
    .first();
  await expect(item).toBeVisible({ timeout: 5000 });
  await item.click();
  await waitForLightningReady(page);
}

// ─── Form Fields ───────────────────────────────────────────────────────────

/**
 * Fill a lookup/combobox field in a Lightning form.
 * @param {string} fieldLabel - Label of the field
 * @param {string} value - Value to search and select
 */
export async function fillLookupField(page, fieldLabel, value) {
  // Find the input by its label
  const fieldGroup = page
    .locator(
      "lightning-input-field, lightning-grouped-combobox, lightning-lookup"
    )
    .filter({ hasText: new RegExp(fieldLabel, "i") })
    .first();

  const input = fieldGroup.locator("input").first();
  await input.click();
  await input.clear();
  await input.fill(value);

  // Wait for dropdown options
  await page.waitForTimeout(2000);

  const option = page
    .locator(".slds-listbox__option, [role='option'], .slds-combobox__option")
    .filter({ hasText: new RegExp(value, "i") })
    .first();

  if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
    await option.click();
  } else {
    // Fallback: press Enter
    await page.keyboard.press("Enter");
  }

  await page.waitForTimeout(500);
}

/**
 * Fill a standard input field by label.
 * @param {string} fieldLabel - Label text
 * @param {string} value - Value to fill
 */
export async function fillField(page, fieldLabel, value) {
  const input = page
    .locator(`lightning-input, lightning-textarea, lightning-input-field`)
    .filter({ hasText: new RegExp(fieldLabel, "i") })
    .locator("input, textarea")
    .first();

  await input.click();
  await input.clear();
  await input.fill(value);
}

/**
 * Select a value from a picklist/combobox.
 * @param {string} fieldLabel
 * @param {string} value
 */
export async function selectPicklistValue(page, fieldLabel, value) {
  const combobox = page
    .locator("lightning-combobox, lightning-input-field")
    .filter({ hasText: new RegExp(fieldLabel, "i") })
    .first();

  const trigger = combobox.locator("button, [role='combobox']").first();
  await trigger.click();
  await page.waitForTimeout(500);

  const option = page
    .locator("[role='option'], lightning-base-combobox-item")
    .filter({ hasText: new RegExp(`^${value}$`, "i") })
    .first();
  await option.click();
  await page.waitForTimeout(500);
}

// ─── File Upload ───────────────────────────────────────────────────────────

/**
 * Upload a file using Salesforce's file upload component.
 * @param {string} filePath - Absolute path to the file
 */
export async function uploadFile(page, filePath) {
  // Salesforce uses an <input type="file"> hidden element
  const fileInput = page.locator('input[type="file"]').first();

  // Make it visible if hidden
  await fileInput.evaluate((el) => {
    el.style.display = "block";
    el.style.opacity = "1";
  });

  await fileInput.setInputFiles(filePath);

  // Wait for upload to complete
  await page.waitForTimeout(3000);
  await waitForLightningReady(page);
}

// ─── Related Lists ─────────────────────────────────────────────────────────

/**
 * Click "View All" in a related list section.
 * @param {string} listName - e.g. "Orders", "Orchestration Plans"
 */
export async function clickRelatedListViewAll(page, listName) {
  const section = page
    .locator("lst-related-list-single-container, article, .slds-card")
    .filter({ hasText: new RegExp(listName, "i") })
    .first();

  const viewAllLink = section
    .locator("a")
    .filter({ hasText: /View All/i })
    .first();

  await viewAllLink.scrollIntoViewIfNeeded().catch(() => {});
  if (await viewAllLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await viewAllLink.click();
    await waitForLightningReady(page);
  }
}

/**
 * Click a specific link in the Related > Links section.
 * @param {string} linkText - Text of the link to click
 */
export async function clickRelatedLink(page, linkText) {
  await navigateToTab(page, "Related");
  await page.waitForTimeout(2000);

  const link = page
    .locator("a")
    .filter({ hasText: new RegExp(linkText, "i") })
    .first();

  await link.scrollIntoViewIfNeeded().catch(() => {});
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  await waitForLightningReady(page);
}

// ─── Record Edit ───────────────────────────────────────────────────────────

/**
 * Click the edit (pencil) icon next to a field and update it.
 * @param {string} fieldLabel - Field label text
 * @param {string} newValue - New value to set
 */
export async function inlineEditField(page, fieldLabel, newValue) {
  // Find the field section and click the pencil icon
  const fieldSection = page
    .locator("records-record-layout-item, lightning-output-field")
    .filter({ hasText: new RegExp(fieldLabel, "i") })
    .first();

  const editBtn = fieldSection.locator("button[title='Edit']").first();
  await editBtn.click();
  await page.waitForTimeout(500);

  // Fill the now-editable input
  const input = fieldSection.locator("input, textarea").first();
  await input.clear();
  await input.fill(newValue);
}

/**
 * Click the Save button after inline editing.
 */
export async function saveRecord(page) {
  const saveBtn = page
    .locator("button")
    .filter({ hasText: /^Save$/i })
    .first();
  await saveBtn.click();
  await waitForLightningReady(page);
}

// ─── App Management ────────────────────────────────────────────────────────

/**
 * Ensure the current Salesforce Lightning app is the specified app (e.g. "IOH ESM").
 * If not, it opens the App Launcher, searches for the app, and switches to it.
 * @param {import('@playwright/test').Page} page
 * @param {string} appName - Exact name of the app to switch to
 */
export async function ensureApp(page, appName) {
  // Check the current app name in the header
  const appNameSpan = page
    .locator(".appName span, .slds-context-bar__app-name span")
    .first();
  const currentApp = await appNameSpan.textContent().catch(() => "");

  if (currentApp.trim().toLowerCase() === appName.toLowerCase()) {
    console.log(`Already in ${appName} app.`);
    return;
  }

  console.log(`Switching to ${appName} app... (current is ${currentApp})`);

  // Click App Launcher button (9 dots)
  const appLauncherBtn = page
    .getByRole("button", { name: /App Launcher/i })
    .first();
  await appLauncherBtn.click();

  // Type in the search box
  const searchInput = page.getByPlaceholder(/Search apps and items/i).first();
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill(appName);
  await page.waitForTimeout(1000);

  // Click the app in the results
  const appResult = page
    .locator("one-app-launcher-menu-item a")
    .filter({ hasText: new RegExp(`^${appName}$`, "i") })
    .first();
  await appResult.click();

  await waitForLightningReady(page);
}
