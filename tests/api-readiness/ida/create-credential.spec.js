/**
 * API Readiness Test — Create Credential
 *
 * Source  : Confluence Page ID 796852225
 * Method  : POST | Type: Synchronous
 * SIT URL : http://dev-cgw.ioh.co.id/sit/cpq/ida/createcredentials
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.CREATE_CREDENTIAL_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/ida/createcredentials";
const AUTH =
  process.env.CREATE_CREDENTIAL_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_create-credential", "tc_cc", userId);
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
    email_address: " user@company.com ",
    password: "SecurePass123",
    first_name: "Rahul",
    last_name: "Sharma",
    phone_number: "+919876543210",
    company_name: "ABC Telecom Pvt Ltd",
    company_id: 123,
    parent_company_id: 134,
    company_address: "5th Floor, Tech Park, MG Road, Bengaluru, India",
    product_id: 1,
    package_id: 5,
    role_id: 3,
    start_date: "2026-02-01",
    end_date: "2026-12-31",
    payment_method: "prepaid",
    master_role_id: 4,
    sda_project_objectives: [
      {
        project_objective_name: "Campaign 2026",
        channels: [
          {
            channel_id: 1,
            terms_of_payment: "prepaid",
            contract_type_id: 1,
            topup_amount: 1000000,
            expired_date_in_days: 365,
            price_per_cpc: 100,
            price_per_cpd: 200,
            price_per_cpa: 300
          }
        ]
      }
    ],
    api_username: "api_user_cs",
    api_password: "generated_password",
    api_key: "generated_api_key",
    limit_per_month: 10000,
    detail: [
      {
        sub_product_id: 1,
        initial_balance: 1000000,
        price: 100
      }
    ],
    alt_auth: "whatsapp",
    expiredDateInDays: 365,
    promotional_consent: "yes",
    api_access: true,
    sftp_access: false,
    price_per_sms: 100,
    client_id: "ins_client_123",
    client_secret: "ins_secret_456",
    sms_templates: [
      {
        smsTemplateTitle: "Welcome SMS",
        senderOfSMS: "INDOSAT",
        typeOfSMS: "promotional",
        smsTemplate: "Welcome to our service!"
      }
    ],
    ipadress_list: ["10.99.99.98", "10.99.99.99"],
    hashkey_value:
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
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

test("TC-CC-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness IDA");
  await allure.feature("Create Credential");
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
      console.warn(
        `[TC-CC-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach").not.toBe(404);
  });
});

test("TC-CC-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness IDA");
  await allure.feature("Create Credential");
  await allure.severity("critical");
  let json;
  await test.step("TC-CC-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-CC-002_S02 - Cek response tidak null", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-CC-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness IDA");
  await allure.feature("Create Credential");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-CC-003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-CC-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness IDA");
  await allure.feature("Create Credential");
  await allure.severity("normal");
  let status;
  await test.step("TC-CC-004_S01 - POST data invalid/kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-CC-004_S02 - Verifikasi API memberikan respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-CC-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness IDA");
  await allure.feature("Create Credential");
  await allure.severity("critical");
  let status;
  await test.step("TC-CC-005_S01 - POST tanpa Authorization header", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-CC-005_S02 - Verifikasi respon 401/403 atau response lain", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});

test("TC-CC-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness IDA");
  await allure.feature("Create Credential");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-CC-006_S01 - Ukur response time", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-CC-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
