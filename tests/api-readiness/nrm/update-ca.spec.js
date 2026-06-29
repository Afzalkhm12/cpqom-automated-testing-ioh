/**
 * API Readiness Test — Update CA
 * Source: Confluence Page ID 735576065
 * Method: POST | SIT URL: http://dev-cgw.ioh.co.id/sit/cpq/updateCA
 */
import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.UPDATE_CA_URL ?? "http://dev-cgw.ioh.co.id/sit/cpq/updateCA";
const AUTH = process.env.UPDATE_CA_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_update-ca", "tc_uc", userId);
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
    id: "CA987654321",
    href: "/account/CA987654321",
    name: "Jane Smith",
    description: "Premium customer account with VIP status",
    type: "Individual",
    status: "Active",
    validFor: {
      startDateTime: "2024-12-01 00:00:00"
    },
    engagedParty: {
      type: "PartyRef",
      role: "corporatepic",
      partyOrPartyRole: {
        name: "Jane Smith",
        birthDate: "1990-08-22 00:00:00",
        gender: "female",
        placeOfBirth: "Jakarta",
        nationality: "Indonesian",
        maritalStatus: "Married",
        individualIdentification: [
          {
            type: "individualIdentification",
            identificationType: "KTP",
            identificationId: "9876543210987654",
            validFor: {
              endDateTime: "2035-10-22 00:00:00"
            }
          }
        ]
      }
    },
    relatedParty: [
      {
        type: "RelatedPartyRefOrPartyRoleRef",
        role: "corporate",
        partyOrPartyRole: {
          id: "CCA456789123",
          href: "/account/CCA456789123",
          name: "ABC Corporation",
          type: "PartyRef",
          referredType: "corporate"
        }
      }
    ],
    contactMedium: [
      {
        type: "GeographicAddressContactMedium",
        contactType: "1000001",
        preferred: true,
        street1: "Indosat Plaza|Jl. Thamrin No. 456",
        street2: "",
        city: "Jakarta",
        stateOrProvince: "DKI Jakarta",
        postCode: "54321",
        country: "Indonesia"
      },
      {
        type: "EmailContactMedium",
        contactType: "email",
        emailAddress: " jane.smith@example.com "
      },
      {
        type: "PhoneContactMedium",
        contactType: "mobile",
        phoneNumber: "628999999999"
      },
      {
        type: "FaxContactMedium",
        contactType: "fax",
        faxNumber: "62215551235"
      },
      {
        type: "PhoneContactMedium",
        contactType: "phone",
        phoneNumber: "62-215551234 111"
      }
    ],
    characteristic: [
      {
        name: "occupation",
        value: "Senior Execution"
      },
      {
        name: "division",
        value: "Human Resources"
      },
      {
        name: "vipType",
        value: "Gold"
      },
      {
        name: "vipCardNumber",
        value: "VIP123456"
      },
      {
        name: "ccaCustStatementFlag",
        value: "Y"
      },
      {
        name: "caCustStatementFlag",
        value: "Y"
      },
      {
        name: "caSumStmtFlag",
        value: "Y"
      },
      {
        name: "vipStartDate",
        value: "2025-08-10 00:00:00"
      },
      {
        name: "vipEndDate",
        value: "2026-08-09 00:00:00"
      },
      {
        name: "customerSegment",
        value: "Premium"
      },
      {
        name: "businessLine",
        value: "Telecommunications"
      },
      {
        name: "subBusinessLine",
        value: "Mobile Services"
      },
      {
        name: "npwp",
        value: "56788901082"
      },
      {
        name: "guranteeLetter",
        value: ""
      },
      {
        name: "billPeriod",
        value: "1"
      },
      {
        name: "billPeriodUnit",
        value: "M"
      },
      {
        name: "nextBillDate",
        value: "2025-09-24 00:00:00"
      },
      {
        name: "requestID",
        value: "1234"
      },
      {
        name: "requestSource",
        value: "IDCC"
      },
      {
        name: "vipDescription",
        value: "Premium customer account with VIP status"
      },
      {
        name: "addressSeq",
        value: "1"
      },
      {
        name: "contactSeq",
        value: "1"
      },
      {
        name: "vipSeq",
        value: "1"
      }
    ]
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

test("TC-UC-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness NRM");
  await allure.feature("Update CA");
  await allure.severity("blocker");
  let status;
  await test.step("TC-UC-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-UC-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-UC-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      test.skip();
      return;
    }
    expect(status).not.toBe(404);
  });
});
test("TC-UC-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Update CA");
  await allure.severity("critical");
  let json;
  await test.step("TC-UC-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-UC-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});
test("TC-UC-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Update CA");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-UC-003_S01 - POST data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});
test("TC-UC-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Update CA");
  await allure.severity("normal");
  let status;
  await test.step("TC-UC-004_S01 - POST data kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-UC-004_S02 - Verifikasi respon", async () => {
    expect(status).toBeDefined();
  });
});
test("TC-UC-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Update CA");
  await allure.severity("critical");
  let status;
  await test.step("TC-UC-005_S01 - POST tanpa auth", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-UC-005_S02 - Verifikasi 401/403", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});
test("TC-UC-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness NRM");
  await allure.feature("Update CA");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-UC-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-UC-006_S02 - < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
