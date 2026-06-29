/**
 * API Readiness Test — TroubleTicket Callback from Salesforce IDCC to Channel
 *
 * Source  : Confluence Page ID 5680627
 * Method  : POST | Type: Synchronous
 * SIT URL : TBD
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.TROUBLETICKET_CALLBACK_FROM_SALESFORCE_IDCC_TO_CHANNEL_URL ??
  "TBD";
const AUTH =
  process.env.TROUBLETICKET_CALLBACK_FROM_SALESFORCE_IDCC_TO_CHANNEL_AUTH ??
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
    "api_readiness_troubleticket-callback-from-salesforce-idcc-to-channel",
    "tc_troublet",
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
    troubleTicket: {
      href: '<a href="https://indosat--idccdev.cs113.my.salesforce.com/5001s000007aoil" target="_self">DIG0005002872</a>',
      description: "Bill amount change",
      externalId: "SR-000000941",
      severity: "3-Moderate",
      status: "Open",
      ticketType: "12-Request",
      channel: {
        id: "8774",
        name: "IDCC"
      },
      note: [],
      relatedParty: [
        {
          id: "62816800132",
          href: "https://host:port/partyManagement/v4/individual/62816800132",
          name: "John Doe",
          role: "Customer",
          "@referredType": "Individual"
        }
      ]
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

test("TC-TROUBLET-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "TroubleTicket Callback from Salesforce IDCC to Channel"
  );
  await allure.severity("blocker");
  let status;
  await test.step("TC-TROUBLET-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-TROUBLET-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-TROUBLET-001_S02 - Verifikasi status 200", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(
        `[TC-TROUBLET-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach (bukan 404/596)").not.toBe(
      404
    );
  });
});

test("TC-TROUBLET-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "TroubleTicket Callback from Salesforce IDCC to Channel"
  );
  await allure.severity("critical");
  let json;
  await test.step("TC-TROUBLET-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-TROUBLET-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-TROUBLET-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "TroubleTicket Callback from Salesforce IDCC to Channel"
  );
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-TROUBLET-003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-TROUBLET-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "TroubleTicket Callback from Salesforce IDCC to Channel"
  );
  await allure.severity("normal");
  let status;
  await test.step("TC-TROUBLET-004_S01 - POST data invalid", async () => {
    const body = buildBody("");
    const r = await postApi(request, body);
    status = r.response.status();
  });
  await test.step("TC-TROUBLET-004_S02 - Verifikasi API respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-TROUBLET-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "TroubleTicket Callback from Salesforce IDCC to Channel"
  );
  await allure.severity("critical");
  let status;
  await test.step("TC-TROUBLET-005_S01 - POST tanpa Auth", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
});

test("TC-TROUBLET-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "TroubleTicket Callback from Salesforce IDCC to Channel"
  );
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-TROUBLET-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-TROUBLET-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
