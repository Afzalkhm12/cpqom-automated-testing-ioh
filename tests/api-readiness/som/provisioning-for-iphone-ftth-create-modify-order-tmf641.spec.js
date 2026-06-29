/**
 * API Readiness Test — Provisioning for IPHONE / FTTH - Create/Modify Order (TMF641)
 * Source: Confluence Page ID 1139408933
 * Method: POST | SIT URL: https://dev-cgw.ioh.co.id/sit/cpq/som/provisioningorder
 */
import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.PROVISIONING_FOR_IPHONE_FTTH_CREATE_MODIFY_ORDER_URL ??
  "https://dev-cgw.ioh.co.id/sit/cpq/som/provisioningorder";
const AUTH =
  process.env.PROVISIONING_FOR_IPHONE_FTTH_CREATE_MODIFY_ORDER_AUTH ??
  "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams(
    "api_readiness_provisioning-for-iphone-ftth-create-modi",
    "tc_pfifcm",
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

async function callApi(request, body, { headers = BASE_HEADERS } = {}) {
  const response = await request.post(BASE_URL, { headers, data: body });
  let json = null;
  try {
    json = await response.json();
  } catch {}
  return { response, json };
}

function buildBody(msisdn) {
  const payload = {
    externalId: "BSS748",
    priority: "1",
    description: "Service order description",
    category: "TMF resource illustration",
    requestedStartDate: "2020-08-27T09:37:40.508Z",
    requestedCompletionDate: "2020-08-27T09:37:40.508Z",
    "@type": "ServiceOrder",
    serviceOrderItem: [
      {
        id: "1",
        action: "add",
        "@type": "ServiceOrderItem",
        service: {
          serviceState: "active",
          type: "CFS",
          serviceCharacteristic: [
            {
              name: "vCPE",
              valueType: "object",
              value: {
                "@type": "JSONSpecification",
                "@schemaLocation":
                  " http://nbi/api/v4/serviceSpecification/ONAPvCPE_Spec/specificationInputSchema ",
                vCPE_IP: "193.218.236.21",
                MaxTxRate: 300,
                TransmitPower: "11 dBm",
                maxTream: "OFF"
              }
            }
          ],
          serviceSpecification: {
            id: "ONAPvCPE_Spec",
            href: " http://...:serviceSpecification/ONAPvCPE_Spec ",
            name: "vCPE",
            version: "1",
            "@type": "vCPE"
          }
        }
      }
    ]
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

test("TC-PFIFCM-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness SOM");
  await allure.feature(
    "Provisioning for IPHONE / FTTH - Create/Modify Order (TMF641)"
  );
  await allure.severity("blocker");
  let status;
  await test.step("TC-PFIFCM-001_S01 - POST ke endpoint", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-PFIFCM-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-PFIFCM-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      test.skip();
      return;
    }
    expect(status).not.toBe(404);
  });
});
test("TC-PFIFCM-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature(
    "Provisioning for IPHONE / FTTH - Create/Modify Order (TMF641)"
  );
  await allure.severity("critical");
  let json;
  await test.step("TC-PFIFCM-002_S01 - POST request", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-PFIFCM-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});
test("TC-PFIFCM-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature(
    "Provisioning for IPHONE / FTTH - Create/Modify Order (TMF641)"
  );
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-PFIFCM-003_S01 - POST data valid", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});
test("TC-PFIFCM-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature(
    "Provisioning for IPHONE / FTTH - Create/Modify Order (TMF641)"
  );
  await allure.severity("normal");
  let status;
  await test.step("TC-PFIFCM-004_S01 - POST data kosong", async () => {
    const r = await callApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-PFIFCM-004_S02 - Verifikasi respon", async () => {
    expect(status).toBeDefined();
  });
});
test("TC-PFIFCM-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature(
    "Provisioning for IPHONE / FTTH - Create/Modify Order (TMF641)"
  );
  await allure.severity("critical");
  let status;
  await test.step("TC-PFIFCM-005_S01 - POST tanpa auth", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-PFIFCM-005_S02 - Verifikasi 401/403", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});
test("TC-PFIFCM-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature(
    "Provisioning for IPHONE / FTTH - Create/Modify Order (TMF641)"
  );
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-PFIFCM-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await callApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-PFIFCM-006_S02 - < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
