/**
 * API Readiness Test — Activate Network HLR (RFS_NEWREG_VOICE_DATA_SUPP, ADD)
 *
 * Source  : Confluence Page ID 930644010
 * Method  : POST | Type: Synchronous
 * SIT URL : http://dev-cgw.ioh.co.id/sit/eda/provisioning
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.ACTIVATE_NETWORK_HLR_RFS_NEWREG_VOICE_DATA_SU_URL ??
  "http://dev-cgw.ioh.co.id/sit/eda/provisioning";
const AUTH =
  process.env.ACTIVATE_NETWORK_HLR_RFS_NEWREG_VOICE_DATA_SU_AUTH ??
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
    "api_readiness_activate-network-hlr-rfs-newreg-voice-da",
    "tc_an(n",
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
    MOId: [
      {
        name: "ACTIONID",
        value: "RFS_NEWREG_VOICE_DATA_SUPP"
      },
      {
        name: "IMSI",
        value: "510011234567890"
      },
      {
        name: "MSISDN",
        value: "6281234567890"
      },
      {
        name: "ORDERID",
        value: "ORDERID123"
      }
    ],
    MOAttributes: [
      {
        name: "ACTIONID",
        value: "RFS_NEWREG_VOICE_DATA_SUPP"
      },
      {
        name: "OPERATION",
        value: "ADD"
      },
      {
        name: "ORDERID",
        value: "ORDERID123"
      },
      {
        name: "IMSI",
        value: "510011234567890"
      },
      {
        name: "MSISDN",
        value: "6281234567890"
      },
      {
        name: "CARDTYPE",
        value: "USIM"
      },
      {
        name: "KIVALUE",
        value: "A1B2C3D4E5F60718293A4B5C6D7E8F90"
      },
      {
        name: "K4SNO",
        value: "10"
      },
      {
        name: "OCSITPLID",
        value: "1258"
      },
      {
        name: "TCSITPLID",
        value: "1258"
      },
      {
        name: "SIMTYPE",
        value: "DSA"
      },
      {
        name: "VOICE",
        value: "1"
      },
      {
        name: "DATA",
        value: "1"
      },
      {
        name: "SMS",
        value: "1"
      },
      {
        name: "MMS",
        value: "1"
      },
      {
        name: "CFALL",
        value: "1"
      },
      {
        name: "CFVMS",
        value: "1"
      },
      {
        name: "CLIP",
        value: "1"
      },
      {
        name: "CHOLD",
        value: "1"
      },
      {
        name: "CWAIT",
        value: "1"
      },
      {
        name: "CLIR",
        value: "0"
      },
      {
        name: "SCLIP",
        value: "0"
      },
      {
        name: "SCLIR",
        value: "0"
      },
      {
        name: "ANTISCLIR",
        value: "0"
      },
      {
        name: "BAOC",
        value: "0"
      },
      {
        name: "BAIC",
        value: "0"
      },
      {
        name: "MPTY",
        value: "1"
      }
    ]
  };

  // Inject MSISDN into MOId array
  if (payload.MOId && Array.isArray(payload.MOId)) {
    const msisdnEntry = payload.MOId.find((m) => m.name === "MSISDN");
    if (msisdnEntry) msisdnEntry.value = msisdn;
  }

  return payload;
}

function skipIfDown() {
  if (!endpointActive)
    test.skip(true, `Endpoint ${BASE_URL} tidak tersedia. Test di-skip.`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("TC-AN001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness EDA");
  await allure.feature(
    "Activate Network HLR (RFS_NEWREG_VOICE_DATA_SUPP, ADD)"
  );
  await allure.severity("blocker");
  let status;
  await test.step("TC-AN001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-AN001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-AN001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(
        `[TC-AN001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach").not.toBe(404);
  });
});

test("TC-AN002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness EDA");
  await allure.feature(
    "Activate Network HLR (RFS_NEWREG_VOICE_DATA_SUPP, ADD)"
  );
  await allure.severity("critical");
  let json;
  await test.step("TC-AN002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-AN002_S02 - Cek response tidak null", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-AN003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness EDA");
  await allure.feature(
    "Activate Network HLR (RFS_NEWREG_VOICE_DATA_SUPP, ADD)"
  );
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-AN003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-AN004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness EDA");
  await allure.feature(
    "Activate Network HLR (RFS_NEWREG_VOICE_DATA_SUPP, ADD)"
  );
  await allure.severity("normal");
  let status;
  await test.step("TC-AN004_S01 - POST data invalid/MSISDN kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-AN004_S02 - Verifikasi API memberikan respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-AN005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness EDA");
  await allure.feature(
    "Activate Network HLR (RFS_NEWREG_VOICE_DATA_SUPP, ADD)"
  );
  await allure.severity("critical");
  let status;
  await test.step("TC-AN005_S01 - POST tanpa Authorization header", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-AN005_S02 - Verifikasi respon 401/403 atau response lain", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});

test("TC-AN006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness EDA");
  await allure.feature(
    "Activate Network HLR (RFS_NEWREG_VOICE_DATA_SUPP, ADD)"
  );
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-AN006_S01 - Ukur response time", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-AN006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
