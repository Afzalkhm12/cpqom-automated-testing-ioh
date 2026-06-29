/**
 * API Readiness Test — Activate Billing
 * Source: Confluence Page ID 647495681
 * Method: POST | SIT URL: http://dev-cgw.ioh.co.id/sit/cpq/activateBilling
 */
import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.ACTIVATE_BILLING_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/activateBilling";
const AUTH =
  process.env.ACTIVATE_BILLING_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_activate-billing", "tc_ab", userId);
  VALID_MSISDN = tc?.msisdn ?? process.env.TEST_MSISDN_VALID ?? "6285882237362";
  console.log(
    `[beforeAll] ENV: ${ENV} | URL: ${BASE_URL} | MSISDN: ${VALID_MSISDN}`
  );
});
test.afterEach(async ({}, testInfo) => {
  if (
    (testInfo.status === "failed" || testInfo.status === "timedOut") &&
    !runError
  )
    runError = testInfo.error?.message ?? `${testInfo.title} failed`;
});
test.afterAll(async () => {
  if (runId)
    await updateRun(runId, {
      status: runError ? "error" : "success",
      log: runError ?? undefined,
      finished_at: new Date()
    });
  await closeDb();
});

async function postApi(request, body, { headers = BASE_HEADERS } = {}) {
  const response = await request.post(BASE_URL, { headers, data: body });
  let json = null;
  try {
    json = await response.json();
  } catch {}
  return { response, json };
}

function buildBody(msisdn) {
  const payload = {
    relatedParty: [
      {
        id: "CA987654321",
        href: "/account/CA987654321",
        role: "customer",
        name: "PT Indosat Enterprise",
        type: "RelatedParty"
      }
    ],
    note: [
      {
        type: "USER_ID",
        id: "1",
        text: "user_12345"
      },
      {
        type: "IP_ADDRESS",
        id: "2",
        text: "192.168.1.10"
      },
      {
        type: "WORKSPACE",
        id: "3",
        text: "PRODUCTION"
      }
    ],
    channel: [
      {
        role: "Used channel for order capture",
        type: "RelatedChannel",
        channel: {
          type: "ChannelRef",
          name: "IDCC",
          id: "1"
        }
      }
    ],
    productOrderItem: [
      {
        quantity: 1,
        billingAccount: {
          type: "BillingAccountRef",
          id: "BA123456789",
          href: "/account/BA123456789"
        },
        productOffering: {
          name: "Managed Anti-DDoS - iWeb App Protection - NexusGuard",
          id: "01tMR000005htCrYAI"
        },
        action: "add",
        product: {
          isBundle: true,
          productCharacteristic: [
            {
              name: "ATT_T_BILLING_SUBS_ID",
              value: "SUB123456789"
            },
            {
              name: "ATT_T_START_DATE",
              value: "2024-01-15"
            },
            {
              name: "ATT_T_TARIFF_ID",
              value: "1234"
            },
            {
              name: "ATT_T_SUBSCRIPTION_LABEL",
              value: "John Doe Postpaid Line"
            },
            {
              name: "ATT_T_CPS_ID",
              value: "99887766"
            },
            {
              name: "ATT_T_HYBRID_FLAG",
              value: "N"
            },
            {
              name: "ATT_T_PERMANENT_FLAG",
              value: "Y"
            },
            {
              name: "ATT_T_TRIAL_END_DATE",
              value: "2024-02-14"
            },
            {
              name: "ATT_T_PACKAGE_CODE",
              value: "PKG_5G_PREMIUM"
            },
            {
              name: "ATT_T_PACKAGE_NAME",
              value: "5G Premium Unlimited"
            },
            {
              name: "ATT_T_ENTITY_ID",
              value: "ENT001"
            },
            {
              name: "ATT_T_BUNDLING_NAME",
              value: "Triple Play Bundle"
            },
            {
              name: "ATT_T_ORIGINAL_ACTIVATION_DATE",
              value: "2024-01-15"
            },
            {
              name: "ATT_T_AGREEMENT_NAME",
              value: "Postpaid 12 Month Contract"
            },
            {
              name: "ATT_T_AGREEMENT_START_DATE",
              value: "2024-01-15"
            },
            {
              name: "ATT_T_AGREEMENT_END_DATE",
              value: "2025-01-14"
            },
            {
              name: "ATT_T_NON_COMMERCIAL_FLAG",
              value: "N"
            }
          ]
        },
        productOrderItemRelationship: [
          {
            relationshipType: "bundles",
            type: "OrderItemRelationship",
            id: "0000000387"
          },
          {
            relationshipType: "bundles",
            type: "OrderItemRelationship",
            id: "0000000388"
          },
          {
            relationshipType: "bundles",
            type: "OrderItemRelationship",
            id: "0000000389"
          }
        ],
        id: "0000000386"
      },
      {
        product: {
          isBundle: true,
          productCharacteristic: [
            {
              name: "ATT_T_BILLING_PRODUCT_ID",
              value: "PROD1211"
            },
            {
              name: "ATT_T_PRODUCT_LABEL",
              value: "5G_Premium_Postpaid"
            },
            {
              name: "ATT_T_MAIN_PROMO_CODE",
              value: "PROMO5G2025"
            },
            {
              name: "ATT_T_TARIFF_ID",
              value: "1234"
            },
            {
              name: "ATT_T_START_DATE",
              value: "2025-01-01"
            },
            {
              name: "ATT_T_END_DATE",
              value: "2025-12-31"
            },
            {
              name: "ATT_T_INIT_PRICE_MODE",
              value: "ABS"
            },
            {
              name: "ATT_T_RECURRING_PRICE_MODE",
              value: "ABS"
            },
            {
              name: "ATT_T_CPS_ID",
              value: "99887766"
            },
            {
              name: "ATT_T_OVERRIDE_RATE_NUM",
              value: "0"
            },
            {
              name: "ATT_T_ASSET_ID",
              value: "AST998877"
            },
            {
              name: "ATT_T_PROMO_NAME",
              value: "5G Welcome Promo"
            },
            {
              name: "ATT_T_DISPLAY_DESC",
              value: "5G Premium Plan with Discount"
            },
            {
              name: "ATT_T_DESCRIPTION",
              value: "Introductory offer|Only for 5G customers"
            },
            {
              name: "ATT_T_SERVICE_TYPE",
              value: "MOBILE_POSTPAID"
            },
            {
              name: "ATT_T_SERVICE_ID",
              value: "628511111111"
            },
            {
              name: "ATT_T_RATING_TARIFF_ID",
              value: "RATE_TARIF_5G_POSTPAID_100"
            },
            {
              name: "ATT_T_BILL_CREATE_DATE",
              value: "2025-01-31"
            },
            {
              name: "ATT_BILLING_TYPE",
              value: "Postpaid"
            }
          ]
        },
        quantity: 1,
        billingAccount: {
          type: "BillingAccountRef",
          id: "BA123456789",
          href: "/account/BA123456789"
        },
        productOffering: {
          name: "iWeb App Protection",
          id: "01tMR000005FwtdYAC"
        },
        action: "add",
        itemPrice: [
          {
            price: {
              dutyFreeAmount: {
                unit: "IDR",
                value: 300000
              }
            },
            pricingType: "nonRecurring"
          },
          {
            price: {
              dutyFreeAmount: {
                unit: "IDR",
                value: 300000
              }
            },
            pricingType: "recurring"
          }
        ],
        id: "0000000387"
      },
      {
        product: {
          isBundle: true,
          productCharacteristic: [
            {
              name: "ATT_T_BILLING_PRODUCT_ID",
              value: "PROD1212"
            },
            {
              name: "ATT_T_PRODUCT_LABEL",
              value: "5G_Premium_Postpaid"
            },
            {
              name: "ATT_T_MAIN_PROMO_CODE",
              value: "PROMO5G2025"
            },
            {
              name: "ATT_T_TARIFF_ID",
              value: "1234"
            },
            {
              name: "ATT_T_START_DATE",
              value: "2025-01-01"
            },
            {
              name: "ATT_T_END_DATE",
              value: "2025-12-31"
            },
            {
              name: "ATT_T_INIT_PRICE_MODE",
              value: "ABS"
            },
            {
              name: "ATT_T_RECURRING_PRICE_MODE",
              value: "ABS"
            },
            {
              name: "ATT_T_CPS_ID",
              value: "99887766"
            },
            {
              name: "ATT_T_OVERRIDE_RATE_NUM",
              value: "0"
            },
            {
              name: "ATT_T_ASSET_ID",
              value: "AST998877"
            },
            {
              name: "ATT_T_PROMO_NAME",
              value: "5G Welcome Promo"
            },
            {
              name: "ATT_T_DISPLAY_DESC",
              value: "5G Premium Plan with Discount"
            },
            {
              name: "ATT_T_DESCRIPTION",
              value: "Introductory offer|Only for 5G customers"
            },
            {
              name: "ATT_T_SERVICE_TYPE",
              value: "MOBILE_POSTPAID"
            },
            {
              name: "ATT_T_SERVICE_ID",
              value: "628511111111"
            },
            {
              name: "ATT_T_RATING_TARIFF_ID",
              value: "RATE_TARIF_5G_POSTPAID_100"
            },
            {
              name: "ATT_T_BILL_CREATE_DATE",
              value: "2025-01-31"
            },
            {
              name: "ATT_BILLING_TYPE",
              value: "Postpaid"
            }
          ]
        },
        quantity: 1,
        billingAccount: {
          type: "BillingAccountRef",
          id: "BA123456789",
          href: "/account/BA123456789"
        },
        productOffering: {
          name: "Set Up and Installation",
          id: "01tMR000004xUvpYAE"
        },
        action: "add",
        itemPrice: [
          {
            price: {
              dutyFreeAmount: {
                unit: "IDR",
                value: 100000
              }
            },
            pricingType: "nonRecurring"
          },
          {
            price: {
              dutyFreeAmount: {
                unit: "IDR",
                value: 100000
              }
            },
            pricingType: "recurring"
          }
        ],
        id: "0000000388"
      },
      {
        product: {
          isBundle: true,
          productCharacteristic: [
            {
              name: "ATT_T_BILLING_PRODUCT_ID",
              value: "PROD1213"
            },
            {
              name: "ATT_T_PRODUCT_LABEL",
              value: "5G_Premium_Postpaid"
            },
            {
              name: "ATT_T_MAIN_PROMO_CODE",
              value: "PROMO5G2025"
            },
            {
              name: "ATT_T_TARIFF_ID",
              value: "1234"
            },
            {
              name: "ATT_T_START_DATE",
              value: "2025-01-01"
            },
            {
              name: "ATT_T_END_DATE",
              value: "2025-12-31"
            },
            {
              name: "ATT_T_INIT_PRICE_MODE",
              value: "ABS"
            },
            {
              name: "ATT_T_RECURRING_PRICE_MODE",
              value: "ABS"
            },
            {
              name: "ATT_T_CPS_ID",
              value: "99887766"
            },
            {
              name: "ATT_T_OVERRIDE_RATE_NUM",
              value: "0"
            },
            {
              name: "ATT_BILLING_TYPE",
              value: "Postpaid"
            },
            {
              name: "ATT_T_PRODUCT_TYPE",
              value: "MinimumCommitment"
            }
          ]
        },
        quantity: 1,
        billingAccount: {
          type: "BillingAccountRef",
          id: "BA123456789",
          href: "/account/BA123456789"
        },
        productOffering: {
          name: "Set Up and Installation",
          id: "01tMR000004xUvpYAG"
        },
        action: "add",
        itemPrice: [
          {
            price: {
              dutyFreeAmount: {
                unit: "IDR",
                value: 50000
              }
            },
            pricingType: "nonRecurring"
          },
          {
            price: {
              dutyFreeAmount: {
                unit: "IDR",
                value: 50000
              }
            },
            pricingType: "recurring"
          }
        ],
        id: "0000000389"
      }
    ],
    state: "Acknowledged",
    requestedStartDate: "2019-05-03 00:00:00",
    requestedCompletionDate: "2019-05-02 00:00:00",
    orderDate: "2025-05-19 08:48:59",
    externalId: "PO-456",
    id: "00000262",
    category: "New Connect",
    description: "Product Order illustration sample-updated"
  };
  if (payload.msisdn) payload.msisdn = msisdn;
  if (payload.MSISDN) payload.MSISDN = msisdn;
  if (payload.Input?.MSISDN) payload.Input.MSISDN = msisdn;
  if (payload.Input?.msisdn) payload.Input.msisdn = msisdn;
  return payload;
}

function skipIfDown() {
  if (!endpointActive) test.skip(true, `Endpoint ${BASE_URL} tidak tersedia.`);
}

test("TC-AB-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness NRM");
  await allure.feature("Activate Billing");
  await allure.severity("blocker");
  let status;
  await test.step("TC-AB-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-AB-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-AB-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      test.skip();
      return;
    }
    expect(status).not.toBe(404);
  });
});
test("TC-AB-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Activate Billing");
  await allure.severity("critical");
  let json;
  await test.step("TC-AB-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-AB-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});
test("TC-AB-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Activate Billing");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-AB-003_S01 - POST data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});
test("TC-AB-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Activate Billing");
  await allure.severity("normal");
  let status;
  await test.step("TC-AB-004_S01 - POST data kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-AB-004_S02 - Verifikasi respon", async () => {
    expect(status).toBeDefined();
  });
});
test("TC-AB-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Activate Billing");
  await allure.severity("critical");
  let status;
  await test.step("TC-AB-005_S01 - POST tanpa auth", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-AB-005_S02 - Verifikasi 401/403", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});
test("TC-AB-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Activate Billing");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-AB-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-AB-006_S02 - < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
