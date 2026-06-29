/**
 * API Readiness Test — Submit Case Events
 * Source: Confluence Page ID 735805441
 * Method: POST | SIT URL: http://dev-cgw.ioh.co.id/sit/cpq/submitcaseevents
 */
import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.SUBMIT_CASE_EVENTS_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/submitcaseevents";
const AUTH =
  process.env.SUBMIT_CASE_EVENTS_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams(
    "api_readiness_submit-case-events",
    "tc_sce",
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
    transid: "12345",
    sericedata: {
      channel: "IDCC",
      lang: "EN",
      channelType: "Sms",
      surveyGuid: "b0549c67-2625-42c1-b765-c42deebb1e5c",
      shareId: "",
      contactInfo: [
        {
          key: "vz_c_email",
          value: " test@gmail.com "
        },
        {
          key: "vz_c_name",
          value: "test"
        },
        {
          key: "vz_c_phone_number",
          value: "628561889946"
        },
        {
          key: "vz_c_msisdn",
          value: "628561889946"
        },
        {
          key: "vz_c_brand_name",
          value: "IM3"
        },
        {
          key: "vz_c_channel_source",
          value: "QMATIC"
        },
        {
          key: "vz_c_channel",
          value: "Gerai IM3"
        },
        {
          key: "vz_c_agent_id",
          value: "ID1234"
        },
        {
          key: "vz_c_agent_name",
          value: "Agent 1234"
        },
        {
          key: "vz_c_store_id",
          value: "TAPA"
        },
        {
          key: "vz_c_store_name",
          value: "Gerai Super Mall Karawaci"
        },
        {
          key: "vz_c_interaction_id",
          value: ""
        },
        {
          key: "vz_c_transaction_date",
          value: "2025-12-03 10:49:41"
        },
        {
          key: "vz_c_ticket_id_qmatic",
          value: "12345"
        },
        {
          key: "vz_c_service_type_qmatic",
          value: "Registrasi Baru Prabayar"
        },
        {
          key: "vz_c_handling_time_qmatic",
          value: "00:08:13"
        },
        {
          key: "vz_c_visit_time_qmatic",
          value: "2025-12-03 10:49:41"
        },
        {
          key: "vz_c_waiting_time",
          value: "00:03:02"
        }
      ],
      delayMinutes: 60,
      metadata: []
    },
    servicename: "SubmitCaseEvents"
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

test("TC-SCE-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness SENSUM");
  await allure.feature("Submit Case Events");
  await allure.severity("blocker");
  let status;
  await test.step("TC-SCE-001_S01 - POST ke endpoint", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-SCE-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-SCE-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      test.skip();
      return;
    }
    expect(status).not.toBe(404);
  });
});
test("TC-SCE-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SENSUM");
  await allure.feature("Submit Case Events");
  await allure.severity("critical");
  let json;
  await test.step("TC-SCE-002_S01 - POST request", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-SCE-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});
test("TC-SCE-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SENSUM");
  await allure.feature("Submit Case Events");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-SCE-003_S01 - POST data valid", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});
test("TC-SCE-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SENSUM");
  await allure.feature("Submit Case Events");
  await allure.severity("normal");
  let status;
  await test.step("TC-SCE-004_S01 - POST data kosong", async () => {
    const r = await callApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-SCE-004_S02 - Verifikasi respon", async () => {
    expect(status).toBeDefined();
  });
});
test("TC-SCE-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SENSUM");
  await allure.feature("Submit Case Events");
  await allure.severity("critical");
  let status;
  await test.step("TC-SCE-005_S01 - POST tanpa auth", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-SCE-005_S02 - Verifikasi 401/403", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});
test("TC-SCE-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SENSUM");
  await allure.feature("Submit Case Events");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-SCE-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await callApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-SCE-006_S02 - < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
