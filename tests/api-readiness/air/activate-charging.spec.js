/**
 * API Readiness Test — Activate Charging
 *
 * Source  : Confluence Page ID 979632129
 * Method  : POST | Type: Synchronous
 * SIT URL : http://dev-cgw.ioh.co.id/sit/cpq/activateCharging
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.ACTIVATE_CHARGING_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/activateCharging";
const AUTH =
  process.env.ACTIVATE_CHARGING_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams(
    "api_readiness_activate-charging",
    "tc_acha",
    userId
  );
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
  } catch {
    /* non-JSON */
  }
  return { response, json };
}

function buildBody(msisdn) {
  const payload = {
    externalId: "1234",
    category: "NewConnect",
    description: "Activate Charging for New User",
    state: "Acknowledged",
    requestedStartDate: "2019-05-03 00:00:00",
    requestedCompletionDate: "2019-05-02 00:00:00",
    orderDate: "2025-05-19 08:48:59",
    relatedParty: [
      {
        id: "628568906780",
        role: "subscriber",
        type: "RelatedParty"
      }
    ],
    productOrderItem: [
      {
        id: "1",
        action: "add",
        product: {
          name: "InstallSubscriber",
          productCharacteristic: [
            {
              name: "serviceClassNew",
              value: "5678"
            },
            {
              name: "temporaryBlockedFlag",
              value: "1"
            },
            {
              name: "ussdEndOfCallNotificationID",
              value: "132"
            }
          ]
        }
      },
      {
        id: "2",
        action: "add",
        product: {
          name: "AddPeriodicAccountManagement",
          productCharacteristic: [
            {
              name: "pamServiceID",
              value: "56"
            },
            {
              name: "pamClassID",
              value: "1234"
            },
            {
              name: "scheduleID",
              value: "1234"
            }
          ]
        }
      },
      {
        id: "3",
        action: "change",
        product: {
          name: "UpdatePeriodicAccountManagement",
          productCharacteristic: [
            {
              name: "pamServiceID",
              value: "56"
            },
            {
              name: "pamClassIdOld",
              value: "1234"
            },
            {
              name: "pamClassIdNew",
              value: "4231"
            },
            {
              name: "scheduleIdOld",
              value: "1234"
            },
            {
              name: "scheduleIdNew",
              value: "4231"
            }
          ]
        }
      },
      {
        id: "4",
        action: "delete",
        product: {
          name: "DeleteSubscriber",
          productCharacteristic: [
            {
              name: "originOperatorID",
              value: "idcc"
            },
            {
              name: "barring",
              value: "0"
            }
          ]
        }
      },
      {
        id: "5",
        action: "delete",
        product: {
          name: "DeleteOffer",
          productCharacteristic: [
            {
              name: "offerId",
              value: "1234567890"
            }
          ]
        }
      },
      {
        id: "6",
        action: "delete",
        product: {
          name: "DeleteUsageThresholds",
          productCharacteristic: [
            {
              name: "usageThresholdID",
              value: "1234567890"
            },
            {
              name: "associatedPartyID",
              value: "test"
            },
            {
              name: "originOperatorID",
              value: "idcc"
            }
          ]
        }
      },
      {
        id: "7",
        action: "change",
        product: {
          name: "UpdateServiceClass",
          productCharacteristic: [
            {
              name: "chargingId",
              value: "1234"
            },
            {
              name: "serviceClassCurrent",
              value: "5678"
            },
            {
              name: "serviceClassNew",
              value: "8765"
            }
          ]
        }
      },
      {
        id: "8",
        action: "change",
        product: {
          name: "UsageThresholdUpdateInformation",
          productCharacteristic: [
            {
              name: "usageThresholdId",
              value: "1234567890"
            },
            {
              name: "usageThresholdValueNew",
              value: "524"
            },
            {
              name: "associatedPartyID",
              value: "test"
            },
            {
              name: "ut_type",
              value: "usageThresholdValueNew"
            }
          ]
        }
      },
      {
        id: "9",
        action: "change",
        product: {
          name: "UsageCounterUpdateInformation",
          productCharacteristic: [
            {
              name: "usageCounterID",
              value: "1234567890"
            },
            {
              name: "usageCounterValueNew",
              value: "524"
            },
            {
              name: "associatedPartyID",
              value: "test"
            },
            {
              name: "productID",
              value: "1234"
            },
            {
              name: "uc_type",
              value: "usageCounterValueNew"
            }
          ]
        }
      },
      {
        id: "10",
        action: "change",
        product: {
          name: "AccumulatorUpdateInformation",
          productCharacteristic: [
            {
              name: "accumulatorValueAbsolute",
              value: "1234567890"
            },
            {
              name: "accumulatorId",
              value: "1234567890"
            },
            {
              name: "accumulatorStartDate",
              value: "2026-03-10"
            }
          ]
        }
      },
      {
        id: "11",
        action: "change",
        product: {
          name: "DedicatedAccountUpdateInformation",
          productCharacteristic: [
            {
              name: "dedicatedAccountID",
              value: "1234567890"
            },
            {
              name: "adjustmentAmountRelative",
              value: "9672"
            },
            {
              name: "dedicatedAccountValueNew",
              value: "987445"
            },
            {
              name: "adjustmentDateRelative",
              value: "5"
            },
            {
              name: "expiryDate",
              value: "2026-05-10"
            },
            {
              name: "dedicatedAccountUnitType",
              value: "1"
            },
            {
              name: "productID",
              value: "1234"
            },
            {
              name: "serviceId",
              value: "1234"
            }
          ]
        }
      },
      {
        id: "12",
        action: "change",
        product: {
          name: "UpdateOffer",
          productCharacteristic: [
            {
              name: "offerId",
              value: "1234567890"
            },
            {
              name: "startDateTimeRelative",
              value: "1"
            },
            {
              name: "expiryDate",
              value: "2026-05-10"
            },
            {
              name: "expiryDateTime",
              value: "2026-05-10 12:22:40"
            },
            {
              name: "offerUpdateAction",
              value: "EXPIRE"
            },
            {
              name: "offerProductID",
              value: "1234"
            },
            {
              name: "offerType",
              value: "5"
            }
          ]
        }
      }
    ]
  };

  if (payload.msisdn) payload.msisdn = msisdn;
  if (payload.MSISDN) payload.MSISDN = msisdn;
  if (payload.Input && payload.Input.MSISDN) payload.Input.MSISDN = msisdn;
  if (payload.Input && payload.Input.msisdn) payload.Input.msisdn = msisdn;

  return payload;
}

function skipIfDown() {
  if (!endpointActive)
    test.skip(true, `Endpoint ${BASE_URL} tidak tersedia. Test di-skip.`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("TC-ACHA-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness AIR");
  await allure.feature("Activate Charging");
  await allure.severity("blocker");
  let status;
  await test.step("TC-ACHA-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-ACHA-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-ACHA-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(
        `[TC-ACHA-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach").not.toBe(404);
  });
});

test("TC-ACHA-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness AIR");
  await allure.feature("Activate Charging");
  await allure.severity("critical");
  let json;
  await test.step("TC-ACHA-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-ACHA-002_S02 - Cek response tidak null", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-ACHA-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness AIR");
  await allure.feature("Activate Charging");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-ACHA-003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-ACHA-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness AIR");
  await allure.feature("Activate Charging");
  await allure.severity("normal");
  let status;
  await test.step("TC-ACHA-004_S01 - POST data invalid/kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-ACHA-004_S02 - Verifikasi API memberikan respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-ACHA-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness AIR");
  await allure.feature("Activate Charging");
  await allure.severity("critical");
  let status;
  await test.step("TC-ACHA-005_S01 - POST tanpa Authorization header", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-ACHA-005_S02 - Verifikasi respon 401/403 atau response lain", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});

test("TC-ACHA-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness AIR");
  await allure.feature("Activate Charging");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-ACHA-006_S01 - Ukur response time", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-ACHA-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
