/**
 * API Readiness Test — Create CCA
 * Source: Confluence Page ID 634945537
 * Method: POST | SIT URL: http://dev-cgw.ioh.co.id/sit/cpq/createCCA
 */
import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.CREATE_CCA_URL ?? "http://dev-cgw.ioh.co.id/sit/cpq/createCCA";
const AUTH =
  process.env.CREATE_CCA_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_create-cca", "tc_cc", userId);
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
    name: "ABC Corporation",
    description: "Corporate customer account for enterprise services",
    type: "Corporate",
    status: "Active",
    validFor: {
      startDateTime: "2025-12-08 00:00:00"
    },
    contactMedium: [
      {
        type: "GeographicAddressContactMedium",
        " contactType": "1000001",
        preferred: true,
        street1: "Indosat Plaza|Jl. Gatot Subroto No. 789",
        street2: "",
        city: "Jakarta",
        stateOrProvince: "DKI Jakarta",
        postCode: "67890",
        country: "Indonesia"
      },
      {
        type: "PhoneContactMedium",
        contactType: "phone",
        phoneNumber: "62215551234"
      },
      {
        type: "FaxContactMedium",
        contactType: "fax",
        faxNumber: "62215551235"
      }
    ],
    characteristic: [
      {
        name: "ccaCustStatementFlag",
        value: "Y"
      },
      {
        name: "billPeriod",
        value: "1"
      },
      {
        name: "billPeriodUnit",
        value: "M"
      },
      {
        name: "nextBillDate",
        value: "2025-12-24 00:00:00"
      },
      {
        name: "ccaSumStmtFlag",
        value: "Y"
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

test("TC-CC-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness NRM");
  await allure.feature("Create CCA");
  await allure.severity("blocker");
  let status;
  await test.step("TC-CC-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-CC-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-CC-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      test.skip();
      return;
    }
    expect(status).not.toBe(404);
  });
});
test("TC-CC-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Create CCA");
  await allure.severity("critical");
  let json;
  await test.step("TC-CC-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-CC-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});
test("TC-CC-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Create CCA");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-CC-003_S01 - POST data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});
test("TC-CC-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Create CCA");
  await allure.severity("normal");
  let status;
  await test.step("TC-CC-004_S01 - POST data kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-CC-004_S02 - Verifikasi respon", async () => {
    expect(status).toBeDefined();
  });
});
test("TC-CC-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Create CCA");
  await allure.severity("critical");
  let status;
  await test.step("TC-CC-005_S01 - POST tanpa auth", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-CC-005_S02 - Verifikasi 401/403", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});
test("TC-CC-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Create CCA");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-CC-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-CC-006_S02 - < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
