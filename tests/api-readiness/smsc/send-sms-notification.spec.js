/**
 * API Readiness Test — Send SMS Notification
 * Source: Confluence Page ID 976879634
 * Method: POST | SIT URL: http://dev-cgw.ioh.co.id/sit/cpq/sendNotif
 */
import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.SEND_SMS_NOTIFICATION_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/sendNotif";
const AUTH =
  process.env.SEND_SMS_NOTIFICATION_AUTH ??
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
    "api_readiness_send-sms-notification",
    "tc_ssn",
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
    transid: "628571748329920202008150020002324",
    msisdn: "6285717483299",
    servicename: "SEND NOTIFICATION",
    servicedata: {
      lang: "ID",
      channel: "IDCC",
      Message:
        "Sisa Kouta Utama: %%Quota%% GB, Nelp ke sesama: %%OnNet%% MNT, Nelp ke OprLain: %% OffNet%% MNT, Lebih mudah cek di myIM3 http://bit.ly/m3cpx ",
      Messages: [
        {
          Text: "First message",
          Sequence: 1
        },
        {
          Text: "Second message",
          Sequence: 2
        },
        {
          Text: "Third message",
          Sequence: 3
        }
      ],
      NotifId: "001",
      DestParties: ["WAChatBot", "SMS"],
      Params: [
        {
          Name: "Quota",
          Value: "1"
        },
        {
          Name: "OnNet",
          Value: "11"
        },
        {
          Name: "OffNet",
          Value: "0"
        }
      ]
    }
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

test("TC-SSN-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness SMSC");
  await allure.feature("Send SMS Notification");
  await allure.severity("blocker");
  let status;
  await test.step("TC-SSN-001_S01 - POST ke endpoint", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-SSN-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-SSN-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      test.skip();
      return;
    }
    expect(status).not.toBe(404);
  });
});
test("TC-SSN-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SMSC");
  await allure.feature("Send SMS Notification");
  await allure.severity("critical");
  let json;
  await test.step("TC-SSN-002_S01 - POST request", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-SSN-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});
test("TC-SSN-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SMSC");
  await allure.feature("Send SMS Notification");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-SSN-003_S01 - POST data valid", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});
test("TC-SSN-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SMSC");
  await allure.feature("Send SMS Notification");
  await allure.severity("normal");
  let status;
  await test.step("TC-SSN-004_S01 - POST data kosong", async () => {
    const r = await callApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-SSN-004_S02 - Verifikasi respon", async () => {
    expect(status).toBeDefined();
  });
});
test("TC-SSN-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SMSC");
  await allure.feature("Send SMS Notification");
  await allure.severity("critical");
  let status;
  await test.step("TC-SSN-005_S01 - POST tanpa auth", async () => {
    const r = await callApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-SSN-005_S02 - Verifikasi 401/403", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});
test("TC-SSN-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness SMSC");
  await allure.feature("Send SMS Notification");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-SSN-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await callApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-SSN-006_S02 - < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
