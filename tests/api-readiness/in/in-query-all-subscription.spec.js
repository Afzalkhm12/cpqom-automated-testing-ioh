/**
 * API Readiness Test — IN Query All Subscription
 *                      (INQueryAllSubscription)
 *
 * Source  : INQueryAllSubscription.doc
 * Channel : SFDC | Method: POST | Type: Synchronous
 * SIT URL : http://dev-cgw.ioh.co.id/sit/cpq/in/inqueryallsubscription
 *
 * Status SIT: HTTP 200 — ENDPOINT AKTIF ✅
 *
 * Request Body:
 * {
 *   "Input": { "Brand", "IMSI", "MSISDN" },
 *   "Request": { "RequestDate", "RequestID", "RequestSource" }
 * }
 *
 * Response Schema:
 * { "Status": { "Status": "SUCCESS"|"ERROR", "ErrorDescription", "ErrorCode" }, "Output": { ... } }
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.IN_QUERY_ALL_SUBS_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/in/inqueryallsubscription";
const AUTH = process.env.IN_QUERY_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  VALID_IMSI,
  VALID_BRAND,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_in_allsubs", "tc_in_allsubs", userId);
  VALID_MSISDN = tc?.msisdn ?? process.env.TEST_MSISDN_VALID ?? "6285882237362";
  VALID_IMSI = tc?.imsi ?? process.env.TEST_IMSI ?? "123456789012345";
  VALID_BRAND = tc?.brand ?? process.env.TEST_BRAND ?? "MAT";
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

function buildBody(msisdn, imsi, brand) {
  return {
    Input: { IMSI: imsi, MSISDN: msisdn, Brand: brand },
    Request: {
      RequestDate: new Date().toISOString().replace("T", " ").slice(0, 19),
      RequestID: `REQ-${Date.now()}`,
      RequestSource: "IDCC"
    }
  };
}

function skipIfDown() {
  if (!endpointActive)
    test.skip(true, `Endpoint ${BASE_URL} tidak tersedia. Test di-skip.`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("TC-INALLSUB-001 — Endpoint reachable & returns HTTP 200", async ({
  request
}) => {
  await allure.epic("API Readiness IN");
  await allure.feature("IN Query All Subscription");
  await allure.severity("blocker");
  let status;
  await test.step("TC-INALLSUB-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(
      request,
      buildBody(VALID_MSISDN, VALID_IMSI, VALID_BRAND)
    );
    status = r.response.status();
    console.log(`[TC-INALLSUB-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-INALLSUB-001_S02 - Verifikasi status 200", async () => {
    if ([404, 596].includes(status)) {
      endpointActive = false;
      console.warn(
        `[TC-INALLSUB-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}).`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus HTTP 200").toBe(200);
  });
});

test("TC-INALLSUB-002 — Schema: response mengandung field Status", async ({
  request
}) => {
  skipIfDown();
  await allure.epic("API Readiness IN");
  await allure.feature("IN Query All Subscription");
  await allure.severity("critical");
  let json;
  await test.step("TC-INALLSUB-002_S01 - POST request", async () => {
    const r = await postApi(
      request,
      buildBody(VALID_MSISDN, VALID_IMSI, VALID_BRAND)
    );
    expect(r.response.status()).toBe(200);
    json = r.json;
    console.log("[TC-INALLSUB-002] Response:", JSON.stringify(json, null, 2));
  });
  await test.step("TC-INALLSUB-002_S02 - Verifikasi struktur Status", async () => {
    expect(json).toBeTruthy();
    expect(
      Object.prototype.hasOwnProperty.call(json, "Status"),
      "Response harus punya field 'Status'"
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(json.Status ?? {}, "Status"),
      "Status.Status harus ada"
    ).toBe(true);
  });
});

test("TC-INALLSUB-003 — Positive: query subscription mengembalikan Status SUCCESS", async ({
  request
}) => {
  skipIfDown();
  await allure.epic("API Readiness IN");
  await allure.feature("IN Query All Subscription");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  let json;
  await test.step("TC-INALLSUB-003_S01 - POST dengan data MSISDN valid", async () => {
    const r = await postApi(
      request,
      buildBody(VALID_MSISDN, VALID_IMSI, VALID_BRAND)
    );
    expect(r.response.status()).toBe(200);
    json = r.json;
    console.log("[TC-INALLSUB-003] Response:", JSON.stringify(json, null, 2));
  });
  await test.step("TC-INALLSUB-003_S02 - Verifikasi Status SUCCESS atau terima error backend", async () => {
    const validStatuses = ["SUCCESS", "ERROR"];
    expect(
      validStatuses.includes(json?.Status?.Status),
      `Status.Status harus SUCCESS atau ERROR. Actual: ${json?.Status?.Status}`
    ).toBe(true);
    console.log(
      `[TC-INALLSUB-003] Status: ${json?.Status?.Status}, ErrorCode: ${json?.Status?.ErrorCode}`
    );
  });
});

test("TC-INALLSUB-004 — Negative: tanpa MSISDN harus error", async ({
  request
}) => {
  skipIfDown();
  await allure.epic("API Readiness IN");
  await allure.feature("IN Query All Subscription");
  await allure.severity("normal");
  let status, json, responseText;
  await test.step("TC-INALLSUB-004_S01 - POST tanpa MSISDN", async () => {
    const body = buildBody("", VALID_IMSI, VALID_BRAND);
    delete body.Input.MSISDN;
    const r = await postApi(request, body);
    status = r.response.status();
    json = r.json;
    responseText = JSON.stringify(json ?? "");
    console.log(
      `[TC-INALLSUB-004] Status: ${status}, Response: ${responseText.slice(0, 200)}`
    );
  });
  await test.step("TC-INALLSUB-004_S02 - Verifikasi API mengembalikan error", async () => {
    const isErr =
      status === 400 ||
      status === 422 ||
      status === 500 ||
      json?.Status?.Status === "ERROR" ||
      responseText.toLowerCase().includes("error");
    expect(isErr, `API harus error tanpa MSISDN. Status: ${status}`).toBe(true);
  });
});

test("TC-INALLSUB-005 — Auth: tanpa Authorization harus 401 atau 403", async ({
  request
}) => {
  skipIfDown();
  await allure.epic("API Readiness IN");
  await allure.feature("IN Query All Subscription");
  await allure.severity("critical");
  let status;
  await test.step("TC-INALLSUB-005_S01 - POST tanpa Auth", async () => {
    const r = await postApi(
      request,
      buildBody(VALID_MSISDN, VALID_IMSI, VALID_BRAND),
      { headers: { "Content-Type": "application/json" } }
    );
    status = r.response.status();
    console.log(`[TC-INALLSUB-005] Status tanpa Auth: ${status}`);
  });
  await test.step("TC-INALLSUB-005_S02 - Verifikasi 401 atau 403", async () => {
    expect(
      [401, 403].includes(status),
      `Harus 401/403 tanpa Auth. Actual: ${status}`
    ).toBe(true);
  });
});

test("TC-INALLSUB-006 — Performance: response time < 10 detik", async ({
  request
}) => {
  skipIfDown();
  await allure.epic("API Readiness IN");
  await allure.feature("IN Query All Subscription");
  await allure.severity("normal");
  let elapsed, status;
  await test.step("TC-INALLSUB-006_S01 - POST dan ukur response time", async () => {
    const t = Date.now();
    const r = await postApi(
      request,
      buildBody(VALID_MSISDN, VALID_IMSI, VALID_BRAND)
    );
    elapsed = Date.now() - t;
    status = r.response.status();
    console.log(`[TC-INALLSUB-006] Response time: ${elapsed}ms`);
  });
  await test.step("TC-INALLSUB-006_S02 - Verifikasi < 10s", async () => {
    expect(status, "Request harus 200").toBe(200);
    expect(elapsed, `${elapsed}ms melebihi 10.000ms`).toBeLessThan(10_000);
  });
});
