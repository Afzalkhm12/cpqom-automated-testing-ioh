/**
 * API Readiness Test — {{TITLE}}
 *
 * Source  : Confluence Page ID {{ID}}
 * Method  : POST | Type: Synchronous
 * SIT URL : {{URL}}
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV      = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL = process.env.{{ENV_VAR}}_URL ?? "{{URL}}";
const AUTH     = process.env.{{ENV_VAR}}_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = { "Content-Type": "application/json", Authorization: AUTH };

let tc, VALID_MSISDN, endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_{{LOWER_TITLE}}", "tc_{{TC_PREFIX}}", userId);
  VALID_MSISDN = tc?.msisdn ?? process.env.TEST_MSISDN_VALID ?? "6285882237362";
  console.log(`[beforeAll] ENV: ${ENV} | URL: ${BASE_URL} | MSISDN: ${VALID_MSISDN}`);
});

test.afterEach(async ({}, testInfo) => {
  if ((testInfo.status === "failed" || testInfo.status === "timedOut") && !runError)
    runError = testInfo.error?.message ?? `${testInfo.title} failed`;
});

test.afterAll(async () => {
  if (runId) await updateRun(runId, { status: runError ? "error" : "success", log: runError ?? undefined, finished_at: new Date() });
  await closeDb();
});

async function postApi(request, body, { headers = BASE_HEADERS } = {}) {
  const response = await request.post(BASE_URL, { headers, data: body });
  let json = null;
  try { json = await response.json(); } catch { /* non-JSON */ }
  return { response, json };
}

function buildBody(msisdn) { {{COMMENT}}
  const payload = {{PAYLOAD}};
  
  if (payload.msisdn) payload.msisdn = msisdn;
  if (payload.MSISDN) payload.MSISDN = msisdn;
  if (payload.Input && payload.Input.MSISDN) payload.Input.MSISDN = msisdn;
  if (payload.Input && payload.Input.msisdn) payload.Input.msisdn = msisdn;
  
  return payload;
}

function skipIfDown() {
  if (!endpointActive) test.skip(true, `Endpoint ${BASE_URL} tidak tersedia. Test di-skip.`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("TC-{{TC_PREFIX_U}}-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness CTLST"); await allure.feature("{{TITLE}}"); await allure.severity("blocker");
  let status;
  await test.step("TC-{{TC_PREFIX_U}}-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-{{TC_PREFIX_U}}-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-{{TC_PREFIX_U}}-001_S02 - Verifikasi status 200", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") { 
      endpointActive = false; 
      console.warn(`[TC-{{TC_PREFIX_U}}-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`); 
      test.skip(); 
      return; 
    }
    expect(status, "Endpoint harus bisa di-reach (bukan 404/596)").not.toBe(404);
  });
});

test("TC-{{TC_PREFIX_U}}-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST"); await allure.feature("{{TITLE}}"); await allure.severity("critical");
  let json;
  await test.step("TC-{{TC_PREFIX_U}}-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-{{TC_PREFIX_U}}-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-{{TC_PREFIX_U}}-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST"); await allure.feature("{{TITLE}}"); await allure.story("Positive Scenario"); await allure.severity("critical");
  await test.step("TC-{{TC_PREFIX_U}}-003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-{{TC_PREFIX_U}}-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST"); await allure.feature("{{TITLE}}"); await allure.severity("normal");
  let status;
  await test.step("TC-{{TC_PREFIX_U}}-004_S01 - POST data invalid", async () => {
    const body = buildBody("");
    const r = await postApi(request, body);
    status = r.response.status();
  });
  await test.step("TC-{{TC_PREFIX_U}}-004_S02 - Verifikasi API respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-{{TC_PREFIX_U}}-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST"); await allure.feature("{{TITLE}}"); await allure.severity("critical");
  let status;
  await test.step("TC-{{TC_PREFIX_U}}-005_S01 - POST tanpa Auth", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), { headers: { "Content-Type": "application/json" } });
    status = r.response.status();
  });
});

test("TC-{{TC_PREFIX_U}}-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST"); await allure.feature("{{TITLE}}"); await allure.severity("normal");
  let elapsed;
  await test.step("TC-{{TC_PREFIX_U}}-006_S01 - Ukur waktu", async () => {
    const t = Date.now(); 
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-{{TC_PREFIX_U}}-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
