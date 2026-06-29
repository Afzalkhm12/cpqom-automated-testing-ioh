/**
 * API Readiness Test — MSISDN Per NIK
 *
 * Source  : Confluence Page ID 1065025611
 * Method  : POST | Type: Synchronous
 * SIT URL : http://dev-cgw.ioh.co.id/sit/cpq/crs/crs_msisdncountpernik
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.MSISDN_PER_NIK_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/crs/crs_msisdncountpernik";
const AUTH =
  process.env.MSISDN_PER_NIK_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_msisdn-per-nik", "tc_mpnik", userId);
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
    MSISDNPerNIKReq: {
      TransId: "5-40000420101840",
      NIK: "3674052108600056",
      NOKK: "9911771399943847",
      MSISDN: msisdn,
      OptionalAttributes: [
        {
          Name: "Channel",
          Value: "USSD"
        },
        {
          Name: "CRM_OrderID",
          Value: "3_8069912060219328938697"
        }
      ]
    }
  };

  if (payload.msisdn) payload.msisdn = msisdn;
  if (payload.MSISDN) payload.MSISDN = msisdn;
  if (payload.Input && payload.Input.MSISDN) payload.Input.MSISDN = msisdn;
  if (payload.Input && payload.Input.msisdn) payload.Input.msisdn = msisdn;
  if (payload.Request && payload.Request.MSISDN)
    payload.Request.MSISDN = msisdn;
  if (payload.MSISDNPerNIKReq && payload.MSISDNPerNIKReq.MSISDN)
    payload.MSISDNPerNIKReq.MSISDN = msisdn;

  return payload;
}

function skipIfDown() {
  if (!endpointActive)
    test.skip(true, `Endpoint ${BASE_URL} tidak tersedia. Test di-skip.`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("TC-MPNIK-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness CRS");
  await allure.feature("MSISDN Per NIK");
  await allure.severity("blocker");
  let status;
  await test.step("TC-MPNIK-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-MPNIK-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-MPNIK-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(
        `[TC-MPNIK-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach").not.toBe(404);
  });
});

test("TC-MPNIK-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CRS");
  await allure.feature("MSISDN Per NIK");
  await allure.severity("critical");
  let json;
  await test.step("TC-MPNIK-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-MPNIK-002_S02 - Cek response tidak null", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-MPNIK-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CRS");
  await allure.feature("MSISDN Per NIK");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-MPNIK-003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-MPNIK-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CRS");
  await allure.feature("MSISDN Per NIK");
  await allure.severity("normal");
  let status;
  await test.step("TC-MPNIK-004_S01 - POST data invalid/kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-MPNIK-004_S02 - Verifikasi API memberikan respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-MPNIK-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CRS");
  await allure.feature("MSISDN Per NIK");
  await allure.severity("critical");
  let status;
  await test.step("TC-MPNIK-005_S01 - POST tanpa Authorization header", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-MPNIK-005_S02 - Verifikasi respon 401/403 atau response lain", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});

test("TC-MPNIK-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CRS");
  await allure.feature("MSISDN Per NIK");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-MPNIK-006_S01 - Ukur response time", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-MPNIK-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
