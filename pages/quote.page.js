import { expect } from "@playwright/test";
import * as lightning from "../utils/sf-lightning.js";

/**
 * Page Object for CPQ Enterprise Quote and Product Catalog operations.
 *
 * Covers:
 *   - Creating Enterprise Quote from Opportunity
 *   - Adding products from CPQ catalog
 *   - Product configuration
 *   - Enrich Quote (link products to Billing Accounts)
 */

/**
 * Create an Enterprise Quote from the Opportunity page.
 * Handles the "Provide basic quote details" form and new tab opening.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} opportunityUrl - Full Lightning URL
 * @param {object} [options]
 * @returns {Promise<import('@playwright/test').Page>} Active page (may be a new tab)
 */
export async function createEnterpriseQuote(
  page,
  opportunityUrl,
  options = {}
) {
  const { priceListName = "Standard", contractedMonths = "12" } = options;

  // Navigate to Opportunity
  await page.goto(opportunityUrl);
  await lightning.waitForLightningReady(page);
  await page.evaluate(() => window.scrollTo(0, 0));

  // Check if already on quote page
  const isOnCatalog = await page
    .getByRole("button", { name: /Add to Configuration Cart/i })
    .first()
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (isOnCatalog) {
    console.log("Already in catalog, skipping quote creation.");
    return page;
  }

  const isOnQuote = await page
    .locator("button")
    .filter({ hasText: /^Add Products$/i })
    .last()
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (isOnQuote) {
    console.log("Already on Enterprise Quote page.");
    return page;
  }

  // 1. Find the button using exact text match
  const btn = page
    .locator("button, a")
    .filter({ hasText: /^Create Enterprise Quote$/ })
    .first();
  await btn.scrollIntoViewIfNeeded({ timeout: 15000 }).catch(() => {});
  await expect(btn).toBeVisible({ timeout: 15000 });

  // 2. Click it
  console.log("Clicking Create Enterprise Quote button...");
  await btn.click();

  // 3. Wait for the URL to change to the OmniScript form page
  console.log("Waiting for OmniScript form to load...");
  await page.waitForURL("**/omnistudio/omniscript**", { timeout: 30000 });

  // Wait a bit for the internal LWC rendering
  await page.waitForTimeout(3000);

  // Fill Price List (OmniScript Lookup)
  try {
    await page
      .getByLabel(/Price List/i)
      .first()
      .click({ timeout: 2000 });
  } catch {
    await page.locator("input[role='combobox']").first().click();
  }
  await page.waitForTimeout(500);
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(priceListName, { delay: 100 });

  await page.waitForTimeout(2000); // Wait for lookup search to finish
  const option = page.locator(".slds-listbox__option, [role='option']").first();
  if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
    await option.click();
  } else {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
  }

  // Fill Contracted Months
  try {
    await page
      .getByLabel(/Number of Contracted Months/i)
      .first()
      .click({ timeout: 2000 });
  } catch {
    await page.locator("input[inputmode='decimal']").first().click();
  }
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(contractedMonths, { delay: 50 });

  // Set guided assistance to No
  const noRadio = page.getByLabel(/^No$/i).first();
  await noRadio.click({ force: true }).catch(() => noRadio.click());

  // Listen for new tab before clicking next (sometimes it opens a new tab, sometimes same tab)
  const newPagePromise = page
    .context()
    .waitForEvent("page", { timeout: 15000 })
    .catch(() => null);

  // Click Next
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const nextBtn = page
    .getByRole("button", { name: "Next", exact: true })
    .first();
  await expect(nextBtn).toBeVisible({ timeout: 10000 });
  await nextBtn.click();

  const newTab = await newPagePromise;
  const activePage = newTab ?? page;

  await activePage.waitForLoadState("domcontentloaded");
  try {
    await activePage.waitForSelector(
      "text=Enterprise Quote, button[title*='Add Products'], text=Add Products",
      { timeout: 30000 }
    );
  } catch {
    await activePage.waitForTimeout(5000);
  }

  return activePage;
}

/**
 * Add a product from the CPQ catalog.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} category - e.g. "Communication and Collaboration"
 * @param {string} productName - e.g. "DIOD"
 */
export async function addProductFromCatalog(page, category, productName) {
  let catalogPage = page;

  // Check if we need to open the catalog first
  const isOnCatalog = await page
    .locator("text=Product Category")
    .first()
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!isOnCatalog) {
    // In IOH ESM App, we might need to click "Configure Enterprise Quote" first to open the CPQ workspace tab
    const configBtn = page
      .locator("a, button, lightning-button, [role='button']")
      .filter({ hasText: /Configure Enterprise Quote/i })
      .first();

    const isConfigVisible = await configBtn
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (isConfigVisible) {
      console.log(
        "Found Configure Enterprise Quote button, clicking it to open CPQ tab..."
      );
      await configBtn.click();
      await page.waitForTimeout(5000); // Wait for new console tab to render
    }

    const addProductsBtn = page
      .locator("a, button, lightning-button, [role='button']")
      .filter({ hasText: /Add Products/i })
      .filter({ visible: true })
      .last();
    await addProductsBtn
      .scrollIntoViewIfNeeded({ timeout: 10000 })
      .catch(() => {});
    await expect(addProductsBtn).toBeVisible({ timeout: 15000 });

    const newTabPromise = page
      .context()
      .waitForEvent("page", { timeout: 15000 })
      .catch(() => null);
    await addProductsBtn.click();

    const newTab = await newTabPromise;
    if (newTab) {
      await newTab.waitForLoadState("domcontentloaded");
      await newTab.waitForTimeout(3000);
      catalogPage = newTab;
    } else {
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(3000);
    }
  }

  await expect(catalogPage.locator("text=Product Category")).toBeVisible({
    timeout: 20000
  });

  // Click the category
  const categoryItem = catalogPage
    .locator(".slds-nav-vertical__item a, li a, button")
    .filter({ hasText: category })
    .filter({ visible: true })
    .first();
  if (
    await categoryItem
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await categoryItem.click();
  } else {
    await catalogPage.locator(`text=${category}`).first().click();
  }
  await catalogPage.waitForTimeout(2000);

  // Search for product
  await catalogPage.evaluate(() => window.scrollTo(0, 0));
  const searchBox = catalogPage
    .locator("input[placeholder*='Search'], input[type='search']")
    .filter({ visible: true })
    .last();
  if (
    await searchBox
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await searchBox.click();
    await searchBox.clear();
    await searchBox.pressSequentially(productName, { delay: 150 });
    await catalogPage.keyboard.press("Enter");
    await catalogPage.waitForTimeout(5000);
  }

  // Find product card
  const productText = catalogPage
    .locator(`text=${productName}`)
    .filter({ visible: true })
    .first();
  await expect(productText).toBeVisible({ timeout: 20000 });
  await productText.scrollIntoViewIfNeeded();
  await catalogPage.waitForTimeout(500);

  // Click "Add to Cart"
  const card = productText
    .locator(
      "xpath=ancestor::div[contains(@class, 'slds-card') or contains(@class, 'catalog')]"
    )
    .first();
  let addBtn;
  if ((await card.count()) > 0) {
    addBtn = card
      .locator("button")
      .filter({ hasText: /Add to Cart/i })
      .filter({ visible: true })
      .first();
  }

  if (
    addBtn &&
    (await addBtn
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false))
  ) {
    await addBtn.click();
  } else {
    const fallback = productText
      .locator(
        "xpath=ancestor::*[.//button[contains(text(),'Add to Cart')]]/descendant::button[contains(text(),'Add to Cart')]"
      )
      .filter({ visible: true })
      .first();
    if (
      await fallback
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false)
    ) {
      await fallback.click();
    } else {
      await productText.click();
    }
  }
  await catalogPage.waitForTimeout(1000);

  return catalogPage;
}

/**
 * Click "Add to Configuration Cart" to finalize product selection.
 */
export async function addToConfigurationCart(page) {
  const btn = page.getByRole("button", { name: /Add to Configuration Cart/i });
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);
}

/**
 * Configure product attributes on the Configuration page.
 * @param {import('@playwright/test').Page} page
 * @param {object} attributes - Key-value pairs of attribute label → value
 */
export async function configureProduct(page, attributes = {}) {
  for (const [label, value] of Object.entries(attributes)) {
    await lightning.fillField(page, label, value);
  }
  await page.waitForTimeout(1000);
}

/**
 * Close Quote as Won — upload acceptance evidence and close.
 * @param {string} filePath - Path to the file to upload
 */
export async function closeQuoteAsWon(page, filePath) {
  // Step 1: Click the "Close Stage" action button in the top right to trigger the validation dialog.
  // We cannot use the path ribbon because of a validation rule: "Status cannot be changed to Closed directly. Please use the Closed Button."
  const newPagePromise = page
    .context()
    .waitForEvent("page", { timeout: 5000 })
    .catch(() => null);

  // Click the more actions dropdown chevron
  const dropdownChevron = page
    .locator("button")
    .filter({ hasText: /show more|more actions/i })
    .first();
  const hasChevron = await dropdownChevron
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  let activePage = page;
  if (hasChevron) {
    await dropdownChevron.click();
    await page.waitForTimeout(500);

    const closeStageItem = page
      .locator("[role='menuitem'], .slds-dropdown__item a")
      .filter({ hasText: /^Close Stage$/i })
      .first();

    if (
      await closeStageItem
        .waitFor({ state: "visible", timeout: 3000 })
        .then(() => true)
        .catch(() => false)
    ) {
      await closeStageItem.click();
      console.log("✅ Clicked 'Close Stage' action button.");

      const newTab = await newPagePromise;
      if (newTab) {
        console.log(
          "New tab detected after clicking Close Stage — switching to it."
        );
        await newTab.waitForLoadState("domcontentloaded").catch(() => {});
        activePage = newTab;
      }
      await activePage.waitForTimeout(3000);
    } else {
      console.log(
        "ℹ️ 'Close Stage' action not found in dropdown — quote may already be closed."
      );
      // Close dropdown
      await page.keyboard.press("Escape");
    }
  } else {
    console.log("ℹ️ More actions dropdown not found.");
  }

  // Step 2: Handle "Negotiation to Closed Validation" modal.
  // The modal might be in the main page OR inside a Vlocity iframe.
  // Strategy: check main page first, then iterate all frames.

  let modalContext = null; // will be a Page or Frame object

  // Check main page
  const mainDoneBtn = activePage.getByRole("button", {
    name: "Done",
    exact: true
  });
  const foundOnMain = await mainDoneBtn
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (foundOnMain) {
    console.log("✅ Done button found on main page.");
    modalContext = activePage;
  } else {
    // Check all iframes — Vlocity OmniScripts render in iframes
    console.log("Done button not on main page, checking iframes...");
    const frames = activePage.frames();
    console.log(`Found ${frames.length} frames total.`);
    for (const frame of frames) {
      try {
        const frameUrl = frame.url();
        if (frameUrl === "about:blank") continue;
        const buttons = await frame
          .$$eval("button", (btns) =>
            btns
              .filter((b) => b.offsetParent !== null)
              .map((b) => b.textContent.trim())
          )
          .catch(() => []);
        console.log(
          `  Frame ${frameUrl?.substring(0, 60)}: buttons=[${buttons.join(",")}]`
        );
        if (buttons.includes("Done")) {
          modalContext = frame;
          console.log("✅ Done button found in iframe!");
          break;
        }
      } catch {}
    }
  }

  if (modalContext) {
    console.log("✅ Negotiation to Closed Validation dialog detected.");

    // The modal is in the main page. The Sub Status is an LWC combobox, not a <select>.
    const subStatusCombo = activePage.getByRole("combobox", {
      name: /Sub Status/i
    });
    if (await subStatusCombo.isVisible().catch(() => false)) {
      await subStatusCombo.click();
      await activePage.waitForTimeout(500); // Wait for dropdown to open

      // Click 'Closed/Win' option
      const wonOption = activePage.getByRole("option", {
        name: /Closed\/Win/i
      });
      if (await wonOption.isVisible().catch(() => false)) {
        await wonOption.click();
        console.log("✅ Sub Status selected: Closed/Win");

        // Wait a bit to see if Document Upload section appears
        await activePage.waitForTimeout(1000);
        const docTypeCombo = activePage.getByRole("combobox", {
          name: /Select Document Type/i
        });
        if (await docTypeCombo.isVisible().catch(() => false)) {
          console.log(
            "✅ Document Type combobox found, selecting type and uploading..."
          );
          await docTypeCombo.click();
          await activePage.waitForTimeout(500);

          // Select 'PO' option
          const poOpt = activePage
            .locator("lightning-base-combobox-item")
            .filter({ hasText: "PO" })
            .first();
          if (await poOpt.isVisible().catch(() => false)) {
            await poOpt.click();
            console.log("✅ Document Type PO selected.");
          } else {
            // Fallback keyboard navigation if option is obscured
            for (let k = 0; k < 8; k++) {
              await docTypeCombo.press("ArrowDown");
              await activePage.waitForTimeout(50);
            }
            await docTypeCombo.press("Enter");
            console.log("✅ Document Type PO selected via keyboard.");
          }

          if (filePath) {
            console.log(`Uploading file via setInputFiles: ${filePath}`);

            const fileInput = activePage.locator('input[type="file"]').first();
            if ((await fileInput.count()) > 0) {
              await fileInput.evaluate((el) => {
                el.style.display = "block";
                el.style.opacity = "1";
              });
              await fileInput.setInputFiles(filePath);
              console.log("✅ File passed to setInputFiles.");
            } else {
              // Fallback if no input[type="file"]
              await lightning.uploadFile(activePage, filePath);
            }

            // Upload the file first
            const uploadBtns = activePage
              .locator("button")
              .filter({ hasText: /^Upload$/i });
            for (let i = 0; i < (await uploadBtns.count()); i++) {
              const btn = uploadBtns.nth(i);
              if (
                (await btn.isVisible().catch(() => false)) &&
                (await btn.isEnabled().catch(() => false))
              ) {
                await btn.click({ force: true });
                console.log(`✅ Clicked Upload button ${i}.`);
                await activePage.waitForTimeout(3000);
              }
            }

            await activePage.waitForTimeout(2000);

            // Check Mark as Final — use the label or the LWC checkbox wrapper, not the raw input
            const markFinalLabel = activePage.getByText("Mark as Final", {
              exact: true
            });
            if (
              await markFinalLabel
                .isVisible({ timeout: 3000 })
                .catch(() => false)
            ) {
              await markFinalLabel.click({ force: true });
              console.log("✅ Checked 'Mark as Final'.");
              await activePage.waitForTimeout(1000);
            }
          } else {
            console.log(
              "⚠️ No filePath provided for upload, but it may be required."
            );
          }
        }
      } else {
        // Fallback: click the second option (first is usually 'None' or placeholder)
        const options = activePage.getByRole("option");
        if ((await options.count()) > 1) {
          const optText = await options.nth(1).textContent();
          await options.nth(1).click();
          console.log(`✅ Sub Status selected fallback: ${optText}`);
        }
      }
    } else {
      console.log("ℹ️ Sub Status combobox not found.");
    }

    await activePage.waitForTimeout(500);

    // Click Done
    const doneBtn = activePage.getByRole("button", {
      name: "Done",
      exact: true
    });
    if (await doneBtn.isVisible().catch(() => false)) {
      await doneBtn.click();
      console.log("✅ Clicked Done on Closed Validation dialog.");
    } else {
      // Fallback click via evaluate if shadowed deeply
      await activePage.evaluate(() => {
        const btns = [...document.querySelectorAll("button")];
        const dBtn = btns.find((b) => b.textContent.trim() === "Done");
        if (dBtn) dBtn.click();
      });
      console.log("✅ Clicked Done via JS evaluation.");
    }
    await activePage.waitForTimeout(3000);

    if (activePage !== page) {
      await activePage.close().catch(() => {});
      console.log("New tab closed, returning to original quote page.");
    }
  } else {
    console.log(
      "ℹ️ No Closed Validation dialog found — quote may already be closed."
    );
  }

  await lightning.waitForLightningReady(page).catch(() => {
    console.log("waitForLightningReady skipped — page may have navigated.");
  });
}

/**
 * Enrich Quote — link products to Billing Accounts.
 * IPH-NEWFIX-016
 */
export async function enrichQuote(page, accountMappings = []) {
  // Click Enterprise Quote link
  await lightning.clickActionButton(page, "Enterprise Quote");
  await page.waitForTimeout(2000);

  for (const mapping of accountMappings) {
    // Select products
    for (const product of mapping.products) {
      const checkbox = page
        .locator("tr, lightning-datatable")
        .filter({ hasText: product })
        .locator("input[type='checkbox']")
        .first();
      if (
        await checkbox
          .waitFor({ state: "visible", timeout: 5000 })
          .then(() => true)
          .catch(() => false)
      ) {
        await checkbox.click();
      }
    }

    // Click Enrich Quote
    await lightning.clickActionButton(page, "Enrich Quote");
    await page.waitForTimeout(2000);

    // Select Account
    await lightning.fillLookupField(page, "Account", mapping.accountName);
    await page.waitForTimeout(1000);

    // Confirm
    const confirmBtn = page
      .locator("button")
      .filter({ hasText: /Confirm|Save|Apply/i })
      .first();
    if (
      await confirmBtn
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false)
    ) {
      await confirmBtn.click();
    }

    await lightning.waitForLightningReady(page);
  }
}
