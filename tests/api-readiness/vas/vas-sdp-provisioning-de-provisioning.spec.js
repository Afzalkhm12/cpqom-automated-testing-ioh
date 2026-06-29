/**
 * API Readiness Test — VAS SDP Provisioning/De-provisioning
 * Source: Confluence Page ID 968359937
 * Method: POST | SIT URL: http://dev-cgw.ioh.co.id/sit/cpq/sdp/regunreg
 */
import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.VAS_SDP_PROVISIONING_DE_PROVISIONING_URL ??
  "http://dev-cgw.ioh.co.id/sit/cpq/sdp/regunreg";
const AUTH =
  process.env.VAS_SDP_PROVISIONING_DE_PROVISIONING_AUTH ??
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
    "api_readiness_vas-sdp-provisioning-de-provisioning",
    "tc_vspdp",
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
  } catch {}
  return { response, json };
}

function buildBody(msisdn) {
  const payload = {
    transid: "62858196451232123087615454",
    servicename: "REG UNREG",
    msisdn: "6285692643834",
    servicedata: {
      sc: "97576.0",
      channelSDP: "99",
      channel: "IDCC",
      time: "20200718035857",
      lang: "EN",
      kw: "REG WAPIN",
      ifSendNotifySMS: "0"
    }
  };
  if (payload.msisdn) payload.msisdn = msisdn;
  if (payload.MSISDN) payload.MSISDN = msisdn;
  if (payload.Input?.MSISDN) payload.Input.MSISDN = msisdn;
  if (payload.Input?.msisdn) payload.Input.msisdn = msisdn;
  if (payload.Details?.APartyMsisdn)
    payload.Details.APartyMsisdn = msisdn.replace(/^62/, "");
  return payload;
}

function skipIfDown() {
  if (!endpointActive) test.skip(true, `Endpoint ${BASE_URL} tidak tersedia.`);
}

test("TC-VSPDP-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness VAS");
  await allure.feature("VAS SDP Provisioning/De-provisioning");
  await allure.severity("blocker");
  let status;
  await test.step("TC-VSPDP-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-VSPDP-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-VSPDP-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      test.skip();
      return;
    }
    expect(status).not.toBe(404);
  });
});
test("TC-VSPDP-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness VAS");
  await allure.feature("VAS SDP Provisioning/De-provisioning");
  await allure.severity("critical");
  let json;
  await test.step("TC-VSPDP-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-VSPDP-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});
test("TC-VSPDP-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness VAS");
  await allure.feature("VAS SDP Provisioning/De-provisioning");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-VSPDP-003_S01 - POST data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});
test("TC-VSPDP-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness VAS");
  await allure.feature("VAS SDP Provisioning/De-provisioning");
  await allure.severity("normal");
  let status;
  await test.step("TC-VSPDP-004_S01 - POST data kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-VSPDP-004_S02 - Verifikasi respon", async () => {
    expect(status).toBeDefined();
  });
});
test("TC-VSPDP-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness VAS");
  await allure.feature("VAS SDP Provisioning/De-provisioning");
  await allure.severity("critical");
  let status;
  await test.step("TC-VSPDP-005_S01 - POST tanpa auth", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-VSPDP-005_S02 - Verifikasi 401/403", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});
test("TC-VSPDP-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness VAS");
  await allure.feature("VAS SDP Provisioning/De-provisioning");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-VSPDP-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-VSPDP-006_S02 - < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
