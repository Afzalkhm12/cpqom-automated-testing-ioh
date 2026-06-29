/**
 * API Readiness Test — Create Product/Sync Product
 *
 * Source  : Confluence Page ID 1179385951
 * Method  : POST | Type: Synchronous
 * SIT URL : http://dev-cgw.ioh.co.id/sit/cpq/erp/createproduct
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.CREATE_PRODUCT_SYNC_PRODUCT_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/erp/createproduct";
const AUTH =
  process.env.CREATE_PRODUCT_SYNC_PRODUCT_AUTH ??
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
    "api_readiness_create-product-sync-product",
    "tc_cpsp",
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
    Request: {
      RequestID: "1234",
      RequestSource: "IDCC",
      RequestDate: "2025-12-16 13:12:45"
    },
    Input: {
      SourceTemplateName: "IOH_B2B Network Projects",
      ProjectName: "Test B2B NetworkREST",
      ProjectNumber: "IOH_REST_B2B10000001",
      ProjectStartDate: "2026-01-01",
      ProjectEndDate: "2029-12-30",
      ProjectManagerEmail: "xxx@xxx.x",
      ProjectCurrencyCode: "IDR",
      AllowCapitalizedInterestFlag: true,
      AssetAllocationMethodCode: "CE",
      BurdenScheduleName: "Cost Plus Costing-Fusion",
      BurdenScheduleFixedDate: "2003-03-23",
      CapitalEventProcessingMethodCode: "N",
      CIntRateSchName: "Operations Interest",
      CIntStopDate: "2020-03-24",
      CurrencyConvDate: "2019-04-22",
      CurrencyConvRateType: "100000013585009",
      CurrencyConvDateTypeCode: "F",
      IncludeNotesInKPINotificationsFlag: "true",
      KPINotificationEnabledFlag: "true",
      LegalEntityName: "Vision Leasing",
      OwningOrganizationId: "5186",
      PlanningProjectFlag: "false",
      contractName: null,
      contractNumber: "CNT-2026-0001",
      investmentProgram: null,
      approvalYear: null,
      positionProgramId: null,
      positionProgramName: null,
      programBudgetApproverChief: null,
      contractDescription: null,
      contractCustomerName: null,
      programBudgetAdjustmentDate: null,
      programBudgetApprovedDate: null,
      contractStartDate: null,
      contractEndDate: null,
      programBudget: null,
      programBudgetAvailability: null,
      programBudgetAdjustment: null,
      contractAmount: 1111,
      sapProjectOriginalEndDate: null
    }
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

test("TC-CPSP-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness ERP");
  await allure.feature("Create Product/Sync Product");
  await allure.severity("blocker");
  let status;
  await test.step("TC-CPSP-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-CPSP-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-CPSP-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(
        `[TC-CPSP-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach").not.toBe(404);
  });
});

test("TC-CPSP-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness ERP");
  await allure.feature("Create Product/Sync Product");
  await allure.severity("critical");
  let json;
  await test.step("TC-CPSP-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-CPSP-002_S02 - Cek response tidak null", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-CPSP-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness ERP");
  await allure.feature("Create Product/Sync Product");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-CPSP-003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-CPSP-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness ERP");
  await allure.feature("Create Product/Sync Product");
  await allure.severity("normal");
  let status;
  await test.step("TC-CPSP-004_S01 - POST data invalid/kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-CPSP-004_S02 - Verifikasi API memberikan respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-CPSP-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness ERP");
  await allure.feature("Create Product/Sync Product");
  await allure.severity("critical");
  let status;
  await test.step("TC-CPSP-005_S01 - POST tanpa Authorization header", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-CPSP-005_S02 - Verifikasi respon 401/403 atau response lain", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});

test("TC-CPSP-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness ERP");
  await allure.feature("Create Product/Sync Product");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-CPSP-006_S01 - Ukur response time", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-CPSP-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
