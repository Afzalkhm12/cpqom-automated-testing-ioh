import { test, expect } from "@playwright/test";

/**
 * Clicks the "Create Enterprise Quote" button from the Opportunity record page.
 * @param {string} opportunityUrl - Full Lightning URL of the Opportunity record
 */
export async function createEnterpriseQuote(
  page,
  opportunityUrl,
  quoteOptions = {}
) {
  const {
    quoteName = null, // leave null to use auto-generated name
    priceListName = "Standard", // default price list to search for
    contractedMonths = "12", // default contract duration
    guidedAssistance = false // create with guided assistance
  } = quoteOptions;

  await test.step("Navigate to Opportunity", async () => {
    await page.goto(opportunityUrl);
    await page.waitForLoadState("domcontentloaded");
    // Extra wait for Lightning components to render
    await page.waitForTimeout(3000);
    // Scroll to top in case page remembers scroll position
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  // Check if we are already in the catalog (state remembered by Salesforce SPA)
  // The catalog always has an "Add to Configuration Cart" button at the bottom right
  const isAlreadyInCatalog = await page
    .getByRole("button", { name: /Add to Configuration Cart/i })
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  if (isAlreadyInCatalog) {
    console.log(
      "Already in Enterprise Quote Catalog (Add to Configuration Cart button found), skipping quote creation..."
    );
    return page;
  }

  // Check if we are already on an Enterprise Quote page (has "Add Products" button)
  const isAlreadyOnQuote = await page
    .locator("button")
    .filter({ hasText: /^Add Products$/i })
    .last()
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (isAlreadyOnQuote) {
    console.log("Already on Enterprise Quote page, skipping Create Quote...");
    return page;
  }

  await test.step("Click Create Enterprise Quote", async () => {
    // Check if the form is already open (Salesforce might remember the state from a previous failed run)
    const isFormOpen = await page
      .locator("text=Provide basic quote details")
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!isFormOpen) {
      // Button is a Lightning button at the top of the Opportunity page
      const btn = page
        .locator("a, button, lightning-button")
        .filter({ hasText: /Create Enterprise Quote/i })
        .first();
      // Scroll button into view (may be off-screen due to long page)
      await btn.scrollIntoViewIfNeeded({ timeout: 30000 }).catch(() => {});
      await expect(btn).toBeVisible({ timeout: 30000 });

      // Retry clicking if the form doesn't appear (sometimes swallowed by LWC initialization)
      for (let i = 0; i < 3; i++) {
        await btn.click();
        const formAppeared = await page
          .locator("text=Provide basic quote details")
          .isVisible({ timeout: 8000 })
          .catch(() => false);
        if (formAppeared) break;
        console.log("Form did not appear, retrying click...");
        await page.waitForTimeout(2000);
      }

      // Ensure the form is now open
      await expect(
        page.locator("text=Provide basic quote details")
      ).toBeVisible({ timeout: 10000 });
    }

    // Wait for the modal/form to fully load
    await page.waitForTimeout(3000);

    const quoteNameField = page
      .locator("input[name*='Name'], input[placeholder*='Quote Name']")
      .first();
    if (await quoteNameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      const currentVal = await quoteNameField.inputValue();
      if (!currentVal) {
        await quoteNameField.fill(`Auto Quote ${Date.now()}`);
      }
    }

    // Fill Price List Name
    const priceListWrapper = page
      .locator(
        "div[aria-label*='Price List Name'], lightning-input, vlocity_cmt-custom-input"
      )
      .filter({ hasText: /Price List/i })
      .first();
    const priceListInput1 = priceListWrapper.locator("input").first();
    const priceListInput2 = page
      .locator(
        "input[placeholder*='Price List'], input[aria-label*='Price List']"
      )
      .first();

    const targetPriceList = (await priceListInput1
      .isVisible()
      .catch(() => false))
      ? priceListInput1
      : priceListInput2;
    await expect(targetPriceList).toBeVisible({
      timeout: 10000,
      message: "Price List field must be visible"
    });

    if (await targetPriceList.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetPriceList.click();
      await page.keyboard.press("Control+A"); // Select all text (Windows/Linux)
      await page.keyboard.press("Meta+A"); // Select all text (Mac)
      await page.keyboard.press("Backspace");
      await targetPriceList.fill(priceListName);
      // Wait for dropdown to appear and select first result
      const dropdownOption = page
        .locator(
          ".slds-listbox__option, [role='option'], .slds-dropdown__list li"
        )
        .first();
      await dropdownOption.waitFor({ timeout: 5000 }).catch(() => null);
      if (await dropdownOption.isVisible().catch(() => false)) {
        await dropdownOption.click();
      } else {
        await page.keyboard.press("Enter");
      }
    }

    // Fill Number of Contracted Months
    const monthsWrapper = page
      .locator(
        "div[aria-label*='Contracted Months'], lightning-input, vlocity_cmt-custom-input"
      )
      .filter({ hasText: /Contracted Months/i })
      .first();
    const monthsInput1 = monthsWrapper.locator("input").first();
    const monthsInput2 = page
      .locator(
        "input[placeholder*='Contracted Months'], input[aria-label*='Contracted Months'], input[name*='contracted']"
      )
      .first();

    const targetMonths = (await monthsInput1.isVisible().catch(() => false))
      ? monthsInput1
      : monthsInput2;

    if (await targetMonths.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetMonths.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Meta+A");
      await page.keyboard.press("Backspace");
      await targetMonths.fill(contractedMonths);
    }

    // Set guided assistance (No = default)
    if (!guidedAssistance) {
      const noRadio = page
        .locator(
          "input[type='radio'][value='No'], label:has-text('No') input[type='radio']"
        )
        .first();
      if (await noRadio.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noRadio.click();
      }
    }

    // Click the "Next" button — use exact text to avoid matching "Proceed to next Stage"
    // Scroll to bottom to reveal it first
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Find the "Next" button with exact text match using getByRole
    const nextBtn = page.getByRole("button", { name: "Next", exact: true });
    await expect(nextBtn).toBeVisible({ timeout: 10000 });

    // After clicking Next, ESM might open CPQ in a new tab — listen for it
    const newPagePromise = page
      .context()
      .waitForEvent("page", { timeout: 15000 })
      .catch(() => null);
    await nextBtn.click();

    // Check if a new tab opened
    const newTab = await newPagePromise;
    let activePage;
    if (newTab) {
      activePage = newTab;
    } else {
      activePage = page;
    }

    // Wait for the Enterprise Quote page content to fully load
    // (Enterprise Sales App can be slow — wait for "Add Products" action button)
    await activePage.waitForLoadState("domcontentloaded");
    try {
      await activePage.waitForSelector(
        "text=Enterprise Quote, button[title*='Add Products'], text=Add Products",
        { timeout: 30000 }
      );
    } catch {
      // If Enterprise Quote heading not found, try waiting longer
      await activePage.waitForTimeout(5000);
    }

    return activePage;
  });
}

/**
 * Adds a product from the CPQ catalog.
 * @param {string} category - e.g. "Communication and Collaboration"
 * @param {string} productName - e.g. "Iphone"
 */
export async function addProduct(page, category, productName) {
  await test.step(`Add Product -> ${category} -> ${productName}`, async () => {
    let catalogPage = page;

    // Detect if we're already on the product catalog page
    const isOnCatalog = await page
      .locator("text=Product Category")
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!isOnCatalog) {
      // We're on the Enterprise Quote page.
      // The blue "Add Products" button at the bottom right opens the product catalog.
      // NOTE: Top action buttons (Add Assets, Add Products tabs) are different — avoid them.
      // Using .last() because the bottom right action button comes last in the DOM compared to the top tabs
      const addProductsBtn = page
        .locator("button")
        .filter({ hasText: /^Add Products$/i })
        .last();
      await addProductsBtn
        .scrollIntoViewIfNeeded({ timeout: 10000 })
        .catch(() => {});
      await expect(addProductsBtn).toBeVisible({ timeout: 15000 });

      // Listen for new tab that might open
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
        // Same page navigation
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(3000);
        catalogPage = page;
      }
    }

    // Now we should be on the product catalog page.
    // Wait for Product Category sidebar to appear
    await expect(catalogPage.locator("text=Product Category")).toBeVisible({
      timeout: 20000
    });

    // Click the category in the left sidebar
    const categoryItem = catalogPage
      .locator(".slds-nav-vertical__item a, li a, button")
      .filter({ hasText: category })
      .first();
    if (await categoryItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categoryItem.click();
    } else {
      await catalogPage.locator(`text=${category}`).first().click();
    }
    await catalogPage.waitForTimeout(2000);

    // Scroll to top to reveal search box
    await catalogPage.evaluate(() => window.scrollTo(0, 0));
    await catalogPage.waitForTimeout(500);

    // Check if product is already in the cart (on the right panel)
    // The cart button says "Preview Cart (1)" or similar if there are items.
    const previewCartBtn = catalogPage
      .locator("button")
      .filter({ hasText: /Preview Cart \([1-9]+\)/i })
      .first();
    const isCartPopulated = await previewCartBtn
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // We also check if the text exists on the page (in the cart panel)
    const isInCartPanel = await catalogPage
      .locator("div, li")
      .filter({ hasText: new RegExp(`^${productName}$`, "i") })
      .locator("~ * :has([title='Delete']), ~ * :has([class*='trash'])")
      .first()
      .isVisible()
      .catch(() => false);

    if (isCartPopulated || isInCartPanel) {
      console.log(
        `${productName} appears to already be in the cart (from a previous run). Skipping add step.`
      );
    } else {
      // Find and expand the category
      const categoryLink = catalogPage
        .locator("a, span, div")
        .filter({ hasText: new RegExp(`^${category}$`, "i") })
        .first();
      if (await categoryLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await categoryLink.click();
        await catalogPage.waitForTimeout(2000);
      }

      // Search for the product using the search box
      const searchBox = catalogPage
        .locator("input[placeholder*='Search'], input[type='search']")
        .first();
      if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchBox.click();
        await searchBox.clear();
        await searchBox.pressSequentially(productName, { delay: 150 }); // Type like a real user to trigger LWC events
        await catalogPage.keyboard.press("Enter");
        await catalogPage.waitForTimeout(5000); // Wait longer for search results to update
      }

      // Find product card by locating text that matches the product name
      const productText = catalogPage
        .locator(".slds-text-heading_large, [slot='header']")
        .filter({ hasText: new RegExp(`^${productName}$`, "i") })
        .first();

      // Use expect to wait for element to be attached, visible, and stable in the DOM
      await expect(productText).toBeVisible({ timeout: 20000 });

      // Scroll it into view securely
      await productText.scrollIntoViewIfNeeded();
      await catalogPage.waitForTimeout(500);
      await expect(productText).toBeVisible({ timeout: 5000 });

      // Click "+Add to Cart" on the product card.
      const card = productText
        .locator(
          "xpath=ancestor::div[contains(@class, 'slds-card') or contains(@class, 'catalog')]"
        )
        .first();
      let addToCartBtn;
      if ((await card.count()) > 0) {
        addToCartBtn = card
          .locator("button")
          .filter({ hasText: /Add to Cart/i })
          .first();
      }

      if (
        addToCartBtn &&
        (await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false))
      ) {
        await addToCartBtn.click();
      } else {
        // Fallback
        const fallbackBtn = productText
          .locator(
            "xpath=ancestor::*[.//button[contains(text(),'Add to Cart')]]/descendant::button[contains(text(),'Add to Cart')]"
          )
          .first();
        if (await fallbackBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await fallbackBtn.click();
        } else {
          await productText.click();
        }
      }
      await catalogPage.waitForTimeout(1000);
    }

    // Click "Add to Configuration Cart" button
    const globalAddToCartBtn = catalogPage.getByRole("button", {
      name: /Add to Configuration Cart/i
    });
    await expect(globalAddToCartBtn).toBeVisible({ timeout: 10000 });
    await globalAddToCartBtn.click();
    await catalogPage.waitForLoadState("domcontentloaded");
    await catalogPage.waitForTimeout(3000);
  });
}

/**
 * Navigates to Number Management and reserves a number.
 * @param {string} prefix - The prefix to search for, or leave empty.
 */
export async function reserveNumber(page, prefix = "") {
  await test.step(`Reserve Number with prefix: ${prefix}`, async () => {
    await page.locator("button", { hasText: "Number Management" }).click();

    if (prefix) {
      await page.locator("input[name='searchNumber']").fill(prefix);
      await page.locator("button", { hasText: "Search" }).click();

      // Select the first available number
      await page
        .locator("table.number-list tbody tr:first-child input[type='radio']")
        .click();
    }

    await page.locator("button", { hasText: "Reserve" }).click();
  });
}

/**
 * Moves the quote or contract to the Negotiation stage.
 */
export async function moveToNegotiation(page) {
  await test.step("Move to Negotiation Stage", async () => {
    const stageBtn = page.locator("a", { hasText: "Negotiation" });
    await stageBtn.click();

    const markBtn = page.locator("button", {
      hasText: "Mark Stage as Complete"
    });
    await markBtn.click();
  });
}

/**
 * Generates a document from a quote or contract.
 * @param {string} templateName - e.g. "IOH Quote Document" or "IOH FAB Document (version 1) [DocX]"
 */
export async function generateDocument(page, templateName) {
  await test.step(`Generate Document: ${templateName}`, async () => {
    await page.locator("button", { hasText: "Generate Document" }).click();

    // Select template
    await page.locator(`text=${templateName}`).click();
    await page.locator("button", { hasText: "Next" }).click();

    // Wait for PDF generation
    await expect(page.locator("text=Preview")).toBeVisible({ timeout: 20000 });
  });
}
