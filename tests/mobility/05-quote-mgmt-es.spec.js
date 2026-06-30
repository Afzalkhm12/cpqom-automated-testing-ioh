import { test, expect, chromium } from "@playwright/test";
import * as allure from "allure-js-commons";
import path from "path";
import { fileURLToPath } from "url";
import {
  getRuntimeState,
  getTestParams,
  setRuntimeState,
  closeDb,
  updateRun,
  getSfEnvironment
} from "../../utils/db.js";
import { sfOAuthLogin } from "../../utils/sf-auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Runtime config — injected by run-server or CI environment
const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
const productCode = process.env.PRODUCT_CODE ?? null;
let runError = null;

// Shared state across tests in this file
let instanceUrl, accessToken;
let opportunityId, cartId, createdQuoteId, sysAdminUserId;
let context, page, testParams;
let sysadmin, loginUser;

const userDataDirectory = path.resolve(__dirname, "../../.sf-profile");

// Loads SF credentials, opens persistent browser context, and performs login
test.beforeAll(async ({ request }) => {
  sysadmin = await getSfEnvironment("sysadmin");
  const loginPersona =
    process.env.TEST_USER_ADMIN === "true" ? "sysadmin" : "enterpriseSolution";
  loginUser =
    loginPersona === "sysadmin"
      ? sysadmin
      : await getSfEnvironment(loginPersona);

  opportunityId = await getRuntimeState("opportunityId", userId);
  testParams = await getTestParams("quote_mgmt", "tc_quote", userId);
  console.log("Opportunity ID:", opportunityId);

  // Persistent context reuses Chrome profile data (cookies, local storage)
  // so the session survives across multiple test files.
  context = await chromium.launchPersistentContext(userDataDirectory, {
    headless: process.env.HEADLESS === "true" || process.env.CI === "true",
    args: ["--start-maximized"]
  });
  page = await context.newPage();

  await page.goto(loginUser.url);
  await page
    .getByRole("textbox", { name: "Username" })
    .fill(loginUser.username);
  await page.getByRole("textbox", { name: "Password" }).click();
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(loginUser.password);
  await page.getByRole("button", { name: "Log In to Sandbox" }).click();

  await page.waitForURL("**/lightning/**", { timeout: 60000 });
  await context.storageState({ path: ".sf-profile/sf-state.json" });

  ({ accessToken, instanceUrl } = await sfOAuthLogin(request, sysadmin));
});

test.afterEach(async ({}, testInfo) => {
  if (
    (testInfo.status === "failed" || testInfo.status === "timedOut") &&
    !runError
  ) {
    runError = testInfo.error?.message ?? `${testInfo.title} failed`;
  }
});

test.afterAll(async () => {
  if (runId) {
    await updateRun(
      runId,
      runError
        ? { status: "error", log: runError, finished_at: new Date() }
        : {
            status: "success",
            created_ids: { createdQuoteId: cartId },
            finished_at: new Date()
          }
    );
  }
  await closeDb();
  if (context) await context.close();
});

// Patches the Opportunity with scorecard fields required before quote creation
async function patchMissingScoreCard(request, instanceUrl, accessToken) {
  const patchUrl = `${instanceUrl}/services/data/v65.0/sobjects/Opportunity/${opportunityId}`;
  const patchResponse = await request.patch(patchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    data: {
      CPQ_Partnership_Tier__c: "Highest Partnership",
      CPQ_ES_Partnership_Tier__c: "Highest Partnership",
      CPQ_Deal_Registered__c: "Yes",
      CPQ_ES_Deal_Registered__c: "Yes"
    }
  });
  // Salesforce returns 204 No Content on a successful PATCH
  expect(patchResponse.status(), "Patch should be successful").toBe(204);
}

async function getQuoteLastModifiedBy(
  request,
  instanceUrl,
  accessToken,
  quoteId
) {
  const query = `SELECT+LastModifiedById,LastModifiedBy.Name+FROM+Quote+WHERE+Id='${quoteId}'+LIMIT+1`;
  const response = await request.get(
    `${instanceUrl}/services/data/v65.0/query?q=${query}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );
  expect(response.ok(), "Get Quote LastModifiedBy should succeed").toBeTruthy();
  const body = await response.json();
  const record = body.records?.[0];
  expect(record, "Quote record not found").toBeTruthy();
  return { id: record.LastModifiedById, name: record.LastModifiedBy?.Name };
}

async function patchQuoteApprover(
  request,
  instanceUrl,
  accessToken,
  quoteId,
  approverId
) {
  const patchUrl = `${instanceUrl}/services/data/v65.0/sobjects/Quote/${quoteId}`;
  const patchResponse = await request.patch(patchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    data: { Approver_Line_1__c: approverId, CPQ_Tier_Product__c: "T1" }
  });
  expect(
    patchResponse.status(),
    "Patch Quote Approver_Line_1__c should be successful"
  ).toBe(204);
}

test("API Connection Test", async ({ request }) => {
  expect(instanceUrl, "instanceUrl should be set by beforeAll").toBeTruthy();
  expect(accessToken, "accessToken should be set by beforeAll").toBeTruthy();

  const userInfoResponse = await request.get(
    `${instanceUrl}/services/oauth2/userinfo`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  expect(
    userInfoResponse.ok(),
    "User info request should succeed"
  ).toBeTruthy();
  const userInfoBody = await userInfoResponse.json();
  sysAdminUserId = userInfoBody.user_id;
  console.log("sysAdminUserId:", sysAdminUserId);

  await patchMissingScoreCard(request, instanceUrl, accessToken);
});

// Executes a Salesforce REST request; throws on HTTP errors or embedded Vlocity error bodies
// (HTTP 200 with { "error": "..." } — common in older Vlocity endpoints)
async function sfRequest(request, method, url, { headers, data } = {}) {
  const opts = { headers };
  if (data !== undefined) opts.data = data;

  const response = await request[method](url, opts);
  let body;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  if (!response.ok()) {
    const err = new Error(
      `HTTP ${response.status()} ${method.toUpperCase()} ${url}`
    );
    err.body = body;
    throw err;
  }

  // Some Vlocity endpoints return HTTP 200 with an embedded error
  if (body && typeof body === "object") {
    const errField = body.error ?? body.errorCode;
    if (errField && !body.cartId && !body.records) {
      const err = new Error(
        `Salesforce error: ${errField} — ${body.message ?? ""}`
      );
      err.body = body;
      throw err;
    }
  }

  return body;
}

// "Id" may arrive as a compound object { value: "...", displayValue: null }
function extractId(item) {
  if (item.Id !== undefined) {
    return item.Id !== null && typeof item.Id === "object"
      ? (item.Id.value ?? "")
      : item.Id;
  }
  return item.id ?? item.itemId ?? "";
}

// Picks a random value for each visible dropdown attribute on a cart line item
function extractRandomAttributes(item) {
  const attrs = {};
  for (const cat of item.attributeCategories?.records ?? []) {
    for (const attr of cat.productAttributes?.records ?? []) {
      if (attr.disabled || attr.hidden) continue;
      const key = attr.code ?? attr.label ?? null;
      const values = attr.values ?? [];
      if (attr.inputType === "dropdown" && values.length > 0 && key) {
        const pick = values[Math.floor(Math.random() * values.length)];
        attrs[key] =
          pick !== null && typeof pick === "object" ? (pick.value ?? "") : pick;
      }
    }
  }
  return attrs;
}

test("TC023: CPQ Enterprise Quote Flow — API", async ({
  request
}, testInfo) => {
  await allure.epic("Quote Management");
  await allure.feature("Enterprise Quote");
  await allure.story("Create an Enterprise Quote as ES Team");
  await allure.severity("normal");
  test.setTimeout(300_000);

  let priceListId, recordTypeId;
  let childItems = [];

  const hdrs = () => ({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  });

  // ── STEP 1a — Look up EnterpriseQuote RecordType Id ──────────────────────
  await test.step("Step 1a: Look up EnterpriseQuote RecordType Id", async () => {
    const q =
      "SELECT+Id+FROM+RecordType+WHERE+DeveloperName='EnterpriseQuote'+AND+SobjectType='Quote'+LIMIT+1";
    let body;
    try {
      body = await sfRequest(
        request,
        "get",
        `${instanceUrl}/services/data/v66.0/query?q=${q}`,
        { headers: hdrs() }
      );
    } catch (e) {
      await testInfo.attach("recordtype-error", {
        body: JSON.stringify(e.body ?? e.message),
        contentType: "application/json"
      });
      throw e;
    }
    recordTypeId = body.records?.[0]?.Id ?? process.env.SF_RECORD_TYPE_ID;
    expect(recordTypeId, "EnterpriseQuote RecordType not found").toBeTruthy();
  });

  // ── STEP 1b — Look up B2B Pricelist Id ───────────────────────────────────
  await test.step("Step 1b: Look up B2B Pricelist Id", async () => {
    const q =
      "SELECT+Id,Name+FROM+vlocity_cmt__PriceList__c+WHERE+vlocity_cmt__IsActive__c=true+AND+Name='B2B+Pricelist'+LIMIT+1";
    let body;
    try {
      body = await sfRequest(
        request,
        "get",
        `${instanceUrl}/services/data/v66.0/query?q=${q}`,
        { headers: hdrs() }
      );
    } catch (e) {
      await testInfo.attach("pricelist-error", {
        body: JSON.stringify(e.body ?? e.message),
        contentType: "application/json"
      });
      throw e;
    }
    priceListId = body.records?.[0]?.Id ?? process.env.SF_PRICE_LIST_ID;
    expect(priceListId, "B2B Pricelist not found").toBeTruthy();
  });

  // ── STEP 1 — Create Quote (cart) ──────────────────────────────────────────
  await test.step("Step 1: Create CPQ quote (cart)", async () => {
    let body;
    try {
      body = await sfRequest(
        request,
        "post",
        `${instanceUrl}/services/apexrest/vlocity_cmt/v2/carts`,
        {
          headers: hdrs(),
          data: {
            methodName: "createCart",
            objectType: "Quote",
            subaction: "createQuote",
            fields: "Id,Name",
            filters: "Account.vlocity_cmt__Status__c:Inactive_Active_Pending",
            inputFields: [
              { OpportunityId: opportunityId },
              { Name: `API Test Quote ${Date.now()}` },
              { vlocity_cmt__PriceListId__c: priceListId },
              { CurrencyIsoCode: "IDR" },
              { RecordTypeId: recordTypeId }
            ]
          }
        }
      );
    } catch (e) {
      await testInfo.attach("create-cart-error", {
        body: JSON.stringify(e.body ?? e.message),
        contentType: "application/json"
      });
      throw e;
    }
    cartId = body.cartId ?? body.records?.[0]?.Id ?? body.Id ?? null;
    expect(cartId, "cartId missing from createCart response").toBeTruthy();
    await setRuntimeState("cartId", cartId, userId);
    await setRuntimeState("quoteId", cartId, userId);
    console.log("Cart (Quote) Id:", cartId);
  });

  // ── STEP 2 — Fetch root products ──────────────────────────────────────────
  let productId;
  await test.step("Step 2: Fetch root products from B2B price list", async () => {
    let body;
    try {
      body = await sfRequest(
        request,
        "get",
        `${instanceUrl}/services/apexrest/vlocity_cmt/v2/cpq/carts/${cartId}/products` +
          `?hierarchy=0&pagesize=200&includeAttachment=false&includeAttributes=true&priceListId=${priceListId}`,
        { headers: hdrs() }
      );
    } catch (e) {
      await testInfo.attach("fetch-products-error", {
        body: JSON.stringify(e.body ?? e.message),
        contentType: "application/json"
      });
      throw e;
    }

    const records = body.records ?? [];
    expect(
      records.length,
      "No products returned from B2B price list"
    ).toBeGreaterThan(0);

    // productCode env var takes precedence over DB value at runtime
    const targetProduct = productCode ?? testParams.productCode ?? null;

    // ProductCode may be a compound object { label: "...", value: "O_AI_CONTACT_CENTER" }
    const getProductCode = (p) => {
      const raw = p.ProductCode;
      return raw && typeof raw === "object" ? raw.value : (raw ?? "");
    };

    const match = targetProduct
      ? records.find((p) => getProductCode(p).includes(targetProduct))
      : null;
    const chosen = match ?? records[0];
    productId = typeof chosen.Id === "object" ? chosen.Id.value : chosen.Id;

    expect(
      productId,
      "Could not resolve a product Id from the catalog"
    ).toBeTruthy();
    console.log(`Product selected: "${getProductCode(chosen)}" (${productId})`);
  });

  // ── STEP 3 — Add product to cart ──────────────────────────────────────────
  await test.step("Step 3: Add product to cart", async () => {
    let body;
    try {
      body = await sfRequest(
        request,
        "post",
        `${instanceUrl}/services/apexrest/vlocity_cmt/v2/cpq/carts/${cartId}/items`,
        {
          headers: hdrs(),
          data: {
            cartId,
            price: true,
            validate: true,
            items: [{ itemId: productId, quantity: testParams.quantity }]
          }
        }
      );
    } catch (e) {
      await testInfo.attach("add-items-error", {
        body: JSON.stringify(e.body ?? e.message),
        contentType: "application/json"
      });
      throw e;
    }
    if (body?.jobId) {
      console.log(
        `Add-to-cart is async (jobId: ${body.jobId}); Step 4 will poll until items appear.`
      );
    }
  });

  // ── STEP 4 — Load cart items (verify) ────────────────────────────────────
  await test.step("Step 4: Load and verify cart line items", async () => {
    const deadline = Date.now() + 10_000;
    const pollInterval = 1_500;
    let records = [];

    while (Date.now() < deadline) {
      let body;
      try {
        body = await sfRequest(
          request,
          "get",
          `${instanceUrl}/services/apexrest/vlocity_cmt/v2/cpq/carts/${cartId}/items` +
            `?includeAttachment=true&hierarchy=true`,
          { headers: hdrs() }
        );
      } catch (e) {
        await testInfo.attach("load-items-error", {
          body: JSON.stringify(e.body ?? e.message),
          contentType: "application/json"
        });
        throw e;
      }
      records = body.records ?? [];
      if (records.length > 0) break;
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    expect(
      records.length,
      "Cart line items empty after polling — product may not have been added"
    ).toBeGreaterThan(0);
    childItems = records.flatMap((r) => r.lineItems?.records ?? []);
    console.log(
      `Cart: ${records.length} root line item(s), ${childItems.length} child item(s)`
    );
  });

  // ── STEP 4a — Randomize attributes on child line items ───────────────────
  await test.step("Step 4a: Randomize attributes on child line items", async () => {
    if (!testParams.randomize_attributes || childItems.length === 0) {
      console.log(
        "Step 4a skipped — randomize_attributes not enabled or no child items"
      );
      return;
    }

    let patched = 0;
    for (const child of childItems) {
      const childId = extractId(child);
      const attrs = extractRandomAttributes(child);
      if (Object.keys(attrs).length === 0) continue;

      await sfRequest(
        request,
        "patch",
        `${instanceUrl}/services/data/v66.0/sobjects/QuoteLineItem/${childId}`,
        {
          headers: hdrs(),
          data: {
            vlocity_cmt__AttributeSelectedValues__c: JSON.stringify(attrs)
          }
        }
      );
      patched++;
    }

    if (patched === 0)
      console.log(
        "Step 4a: No eligible dropdown attributes found on any child item"
      );
  });

  // ── STEP 4b — Override pricing on child line items ───────────────────────
  await test.step("Step 4b: Override pricing on child line items", async () => {
    const otc =
      testParams.otc_override != null
        ? parseFloat(testParams.otc_override)
        : null;
    const rc =
      testParams.rc_override != null
        ? parseFloat(testParams.rc_override)
        : null;

    if (
      !testParams.override_pricing ||
      childItems.length === 0 ||
      (otc === null && rc === null)
    ) {
      console.log(
        "Step 4b skipped — override_pricing not enabled, no child items, or no overrides configured"
      );
      return;
    }

    for (const child of childItems) {
      const childId = extractId(child);
      const payload = {};
      if (otc !== null) payload.AdditionalOneTimeCharge__c = otc;
      if (rc !== null) payload.AdditionalRecurringCharge__c = rc;

      await sfRequest(
        request,
        "patch",
        `${instanceUrl}/services/data/v66.0/sobjects/QuoteLineItem/${childId}`,
        {
          headers: hdrs(),
          data: payload
        }
      );
    }
  });

  // ── STEP 5 — Recalculate / price the quote ────────────────────────────────
  await test.step("Step 5: Recalculate and price the quote", async () => {
    try {
      await sfRequest(
        request,
        "get",
        `${instanceUrl}/services/apexrest/vlocity_cmt/v2/cpq/carts/${cartId}/price?price=true`,
        { headers: hdrs() }
      );
    } catch (e) {
      await testInfo.attach("price-error", {
        body: JSON.stringify(e.body ?? e.message),
        contentType: "application/json"
      });
      throw e;
    }
  });

  // Verify Quote Line Items on Quote Record Page
  const quoteId = await getRuntimeState("cartId", userId);
  createdQuoteId = quoteId;
  expect(quoteId, "cartId not found in runtime state").toBeTruthy();

  await page.goto(
    `${loginUser.afterLoginUrl}lightning/r/Quote/${quoteId}/view`
  );
  await page.waitForURL("**/lightning/r/Quote/**", { timeout: 30_000 });
  await expect(
    page.getByRole("tab", { name: "Related" }),
    "Related tab should be visible on the Quote record page"
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("tab", { name: "Related" }).click();
  await page.waitForTimeout(3000);

  const qliLink = page.getByRole("link", { name: /Quote Line Items \(\d+\)/ });
  await expect(
    qliLink,
    "Quote Line Items should be visible on the Quote Related List"
  ).toBeVisible({ timeout: 15_000 });

  const linkText = await qliLink.textContent();
  const match = linkText?.match(/\((\d+)\)/);
  const count = match ? parseInt(match[1], 10) : 0;
  expect(count, "Expected at least 1 Quote Line Item").toBeGreaterThanOrEqual(
    1
  );
});

test("TC028: Upload file MLD", async () => {
  await allure.epic("Quote Management");
  await allure.feature("Enterprise Quote");
  await allure.story("Upload MLD file");
  await allure.severity("normal");

  await page.getByRole("tab", { name: "Details" }).click();
  await page.waitForTimeout(3000);

  // Change Quote Status → Solution Design first.
  // Changing Status and Sub Status in the same edit triggers a dependency reset
  // that clears Sub Status before the save reaches the server — so we save separately.
  await page.getByText("Quote Status", { exact: true }).first().hover();
  await page.getByRole("button", { name: "Edit Quote Status" }).click();
  await page.getByRole("combobox", { name: "Quote Status" }).click();
  await page
    .getByRole("option", { name: "Solution Design", exact: true })
    .nth(1)
    .click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(2_000);

  // Change Sub Status → Solution Document in a separate inline edit
  await page.getByText("Sub Status", { exact: true }).first().hover();
  await page.locator('button[title="Edit Sub Status"]').click();
  await page.getByRole("combobox", { name: "Sub Status" }).click();
  await page
    .getByRole("option", { name: "Solution Document", exact: true })
    .click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(2_000);

  await expect(
    page.getByRole("button", { name: "Upload Document" }),
    "Upload Document button should be visible on the Quote page"
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Upload Document" }).click();
  await expect(
    page.getByText("Document Upload"),
    "Document Upload pop-up screen should be displayed"
  ).toBeVisible({ timeout: 15_000 });

  await page.locator("text=Select type").click();
  await page.locator('span[title="MLD"]').click();

  // "Upload Files" is a hidden <input type="file"> inside the LWC component.
  // setInputFiles targets it directly — no label click or filechooser event needed.
  const fileInput = page.locator('input[type="file"]');
  await fileInput.waitFor({ state: "attached", timeout: 10_000 });
  await fileInput.setInputFiles(
    path.resolve(__dirname, "../../test-data/file-upload-1.doc")
  );
  await expect(
    page.getByText("file-upload-1.doc"),
    "MLD file should be attached to the uploader field"
  ).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Upload", exact: true }).click();
  // Wait for server response — error toasts appear almost immediately on failure.
  // Without this pause, not.toBeVisible() passes before the toast has rendered.
  await page.waitForTimeout(5_000);
  await expect(
    page.locator("div").filter({ hasText: "Error notification." }).nth(3)
  ).not.toBeVisible();

  await page.getByRole("tab", { name: "Related" }).click();
  await page.waitForTimeout(3000);

  await expect(
    page.getByRole("link", { name: /Links \(\d+\)/ }),
    "Links related list should be displayed"
  ).toBeVisible({ timeout: 15_000 });
});

test("TC029: Generate Business Case", async () => {
  await allure.epic("Quote Management");
  await allure.feature("Enterprise Quote");
  await allure.story("Generate Business Case");
  await allure.severity("normal");

  await page.getByRole("tab", { name: "Details" }).click();
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: "Edit Sub Status" }).click();
  await page.getByRole("combobox", { name: "Sub Status" }).click();
  await page.getByRole("option", { name: "Business Case" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "BC Template" })).toBeVisible();
  await page.getByRole("button", { name: "BC Template" }).click();
  await expect(
    page.getByText("Error loading Quote Line Items")
  ).not.toBeVisible();
});

test("TC035: Quote Clossure", async ({ request }) => {
  await patchQuoteApprover(
    request,
    instanceUrl,
    accessToken,
    createdQuoteId,
    sysAdminUserId
  );

  await page.goto(
    `${loginUser.afterLoginUrl}lightning/r/Quote/${createdQuoteId}/view`
  );
  await expect(
    page.getByRole("button", { name: "Submit for Approval" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Submit for Approval" }).click();
  const submitModal = page.getByRole("dialog");
  await submitModal.waitFor({ state: "visible" });
  await submitModal
    .getByRole("textbox", { name: "Comments" })
    .fill("please approve");
  await submitModal.getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(3_000);

  const lastModifiedBy = await getQuoteLastModifiedBy(
    request,
    instanceUrl,
    accessToken,
    createdQuoteId
  );

  await page.getByRole("button", { name: "Notifications" }).click();
  await page
    .getByRole("link", { name: `${lastModifiedBy.name} is` })
    .nth(0)
    .click();
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reassign" })).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  const approvalModal = page.getByRole("dialog");
  await approvalModal.waitFor({ state: "visible" });
  await approvalModal
    .getByRole("textbox", { name: "Comments" })
    .fill("approve");
  await approvalModal.getByRole("button", { name: "Approve" }).click();

  await page.goto(
    `${loginUser.afterLoginUrl}lightning/r/Quote/${createdQuoteId}/view`
  );

  await page.getByRole("button", { name: "Show more actions" }).click();
  await page.getByRole("menuitem", { name: "Close Stage" }).click();
  await page.getByRole("combobox", { name: "Sub Status" }).click();
  await expect(
    page.getByRole("option", { name: "Closed/Win" }),
    "Closed/Win option should be visible"
  ).toBeVisible();
  await page.getByRole("option", { name: "Closed/Win" }).click();
  await page.getByRole("combobox", { name: "Select Document Type" }).click();
  await page.getByRole("option", { name: "MLD" }).click();

  const fileInput = page.locator('input[type="file"]');
  await fileInput.waitFor({ state: "attached", timeout: 10_000 });
  await fileInput.setInputFiles(
    path.resolve(__dirname, "../../test-data/chat_transcript.pdf")
  );
  await expect(
    page.getByText("chat_transcript.pdf"),
    "MLD file should be attached to the uploader field"
  ).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(
    page.locator("div").filter({ hasText: "Success notification." }).nth(3)
  ).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.locator("div").filter({ hasText: "Success notification." }).nth(3)
  ).toBeVisible();
});
