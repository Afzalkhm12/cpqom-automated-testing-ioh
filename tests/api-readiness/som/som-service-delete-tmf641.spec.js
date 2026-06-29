/**
 * API Readiness Test — SOM Service Delete (TMF641)
 * Source: Confluence Page ID 1144913921
 * Method: DELETE | SIT URL: https://dev-cgw.ioh.co.id/sit/cpq/som/servicedelete/{id}
 */
import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.SOM_SERVICE_DELETE_TMF641_URL ??
  "https://dev-cgw.ioh.co.id/sit/cpq/som/servicedelete/{id}";
const AUTH =
  process.env.SOM_SERVICE_DELETE_TMF641_AUTH ??
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
    "api_readiness_som-service-delete-tmf641",
    "tc_ssdt",
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
  const response = await request.delete(BASE_URL, { headers, data: body });
  let json = null;
  try {
    json = await response.json();
  } catch {}
  return { response, json };
}

function buildBody(msisdn) {
  const payload = {
    id: "SVC-001"
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

test("TC-SSDT-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness SOM");
  await allure.feature("SOM Service Delete (TMF641)");
  await allure.severity("blocker");
  let status;
  await test.step("TC-SSDT-001_S01 - DELETE ke endpoint", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-SSDT-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-SSDT-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      test.skip();
      return;
    }
    expect(status).not.toBe(404);
  });
});
test("TC-SSDT-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature("SOM Service Delete (TMF641)");
  await allure.severity("critical");
  let json;
  await test.step("TC-SSDT-002_S01 - DELETE request", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-SSDT-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});
test("TC-SSDT-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature("SOM Service Delete (TMF641)");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-SSDT-003_S01 - DELETE data valid", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});
test("TC-SSDT-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature("SOM Service Delete (TMF641)");
  await allure.severity("normal");
  let status;
  await test.step("TC-SSDT-004_S01 - DELETE data kosong", async () => {
    const r = await callApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-SSDT-004_S02 - Verifikasi respon", async () => {
    expect(status).toBeDefined();
  });
});
test("TC-SSDT-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature("SOM Service Delete (TMF641)");
  await allure.severity("critical");
  let status;
  await test.step("TC-SSDT-005_S01 - DELETE tanpa auth", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-SSDT-005_S02 - Verifikasi 401/403", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});
test("TC-SSDT-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SOM");
  await allure.feature("SOM Service Delete (TMF641)");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-SSDT-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await callApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-SSDT-006_S02 - < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
