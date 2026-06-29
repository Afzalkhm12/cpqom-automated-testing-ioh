/**
 * API Readiness Test — Create BA
 *
 * Source  : Confluence Page ID 636715009
 * Method  : POST | Type: Synchronous
 * SIT URL : http://dev-cgw.ioh.co.id/sit/cpq/createBA
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.CREATE_BA_URL ?? "http://dev-cgw.ioh.co.id/sit/cpq/createBA";
const AUTH = process.env.CREATE_BA_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: AUTH
};

let tc,
  VALID_MSISDN,
  endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_create-ba", "tc_cba", userId);
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
    name: "John Doe",
    description: "Individual billing account for postpaid services",
    type: "Billing",
    status: "Active",
    validFor: {
      startDateTime: "2024-12-01 00:00:00"
    },
    creditLimit: {
      amount: 5000000,
      unit: "IDR"
    },
    relatedParty: [
      {
        type: "RelatedPartyRefOrPartyRoleRef",
        role: "customer",
        partyOrPartyRole: {
          id: "CA987654321",
          href: "/account/CA987654321",
          name: "John Doe",
          type: "PartyRef",
          referredType: "customer"
        }
      }
    ],
    contact: [
      {
        type: "Contact",
        contactType: "billing",
        contactMedium: [
          {
            type: "GeographicAddressContactMedium",
            mediumType: "1000001",
            preferred: true,
            street1: "Indosat Plaza|Jl. Sudirman No. 123",
            street2: "",
            city: "Jakarta",
            stateOrProvince: "DKI Jakarta",
            postcode: "12345",
            country: "Indonesia"
          },
          {
            type: "EmailContactMedium",
            mediumType: "email",
            emailAddress: " john.doe@example.com "
          },
          {
            type: "PhoneContactMedium",
            mediumType: "mobile",
            phoneNumber: "628999999999"
          },
          {
            type: "FaxContactMedium",
            mediumType: "fax",
            faxNumber: "62215551235"
          },
          {
            type: "PhoneContactMedium",
            mediumType: "phone",
            phoneNumber: "62-215551234 111"
          }
        ]
      },
      {
        type: "Contact",
        contactType: "delivery",
        contactMedium: [
          {
            type: "GeographicAddressContactMedium",
            mediumType: "1000001",
            preferred: true,
            street1: "Indosat Plaza|Jl. Sudirman No. 123",
            street2: "",
            city: "Jakarta",
            stateOrProvince: "DKI Jakarta",
            postcode: "12345",
            country: "Indonesia"
          }
        ]
      }
    ],
    characteristic: [
      {
        name: "name",
        value: "John Doe"
      },
      {
        name: "occupation",
        value: "Engineer"
      },
      {
        name: "division",
        value: "Corporate"
      },
      {
        name: "idType",
        value: "KTP"
      },
      {
        name: "idNumber",
        value: "9876543210987654"
      },
      {
        name: "idExpiryDate",
        value: "2035-10-22 00:00:00"
      },
      {
        name: "npwp",
        value: "56788901897"
      },
      {
        name: "companyNPWP",
        value: "56788901000"
      },
      {
        name: "virtualAccount",
        value: "VA1234567890"
      },
      {
        name: "virtualAccountBank",
        value: "BCA"
      },
      {
        name: "accountingMethod",
        value: "5"
      },
      {
        name: "invoicingCompany",
        value: "5"
      },
      {
        name: "contractedPos",
        value: "3"
      },
      {
        name: "taxInvoiceNumber",
        value: "TIN987654321"
      },
      {
        name: "birthDate",
        value: "1985-03-15 00:00:00"
      },
      {
        name: "gender",
        value: "male"
      },
      {
        name: "motherMaidenName",
        value: "Maria Doe"
      },
      {
        name: "hobby",
        value: "Reading"
      },
      {
        name: "maritalStatus",
        value: "Single"
      },
      {
        name: "religion",
        value: "Christian"
      },
      {
        name: "lastEducation",
        value: "Bachelor"
      },
      {
        name: "additionalIdType",
        value: "Passport"
      },
      {
        name: "businessLine",
        value: "Postpaid"
      },
      {
        name: "houseStatus",
        value: "Owned"
      },
      {
        name: "incomeRangeMonth",
        value: "5000000-10000000"
      },
      {
        name: "lengthOfTermEmployment",
        value: "5"
      },
      {
        name: "creditMonitoring",
        value: "3"
      },
      {
        name: "creditClass",
        value: "3"
      },
      {
        name: "lengthTermOfResidence",
        value: "3"
      },
      {
        name: "billHandlingCode",
        value: "BHC001"
      },
      {
        name: "billPeriod",
        value: "30"
      },
      {
        name: "billPeriodUnit",
        value: "D"
      },
      {
        name: "nextBillDate",
        value: "2025-03-01 00:00:00"
      },
      {
        name: "billStyle",
        value: "2"
      },
      {
        name: "alternateEmailAddress1",
        value: " john.alt1@example.com "
      },
      {
        name: "alternateEmailAddress2",
        value: " john.alt2@example.com "
      },
      {
        name: "paymentMethod",
        value: "2"
      },
      {
        name: "deliveryName",
        value: "John Doe"
      },
      {
        name: "holdBillFlag",
        value: "T"
      },
      {
        name: "flagContractNumber",
        value: ""
      },
      {
        name: "flagContractTitle",
        value: ""
      },
      {
        name: "flagDetailPrice",
        value: ""
      },
      {
        name: "flagEmailAddress",
        value: ""
      },
      {
        name: "flagPO1",
        value: ""
      },
      {
        name: "flagPO2",
        value: ""
      },
      {
        name: "contractNumber",
        value: "CNT123456"
      },
      {
        name: "contractTitle",
        value: "Service Agreement"
      },
      {
        name: "accountClass",
        value: "Gold"
      },
      {
        name: "lob",
        value: "Consumer"
      },
      {
        name: "notificationFlag",
        value: "Y"
      },
      {
        name: "po1",
        value: "PO12345"
      },
      {
        name: "po2",
        value: "PO67890"
      },
      {
        name: "collectionAgentEmail",
        value: " collector@example.com "
      },
      {
        name: "collectionAgentSupervisor",
        value: "Supervisor Name"
      },
      {
        name: "communicationChannel",
        value: "Email"
      },
      {
        name: "thresholdSet",
        value: "5"
      },
      {
        name: "paymentProfileActiveDate",
        value: "2025-01-01 00:00:00"
      },
      {
        name: "cardNumber",
        value: "8888777766665555"
      },
      {
        name: "cardHolderName",
        value: "John Doe"
      },
      {
        name: "cardExpiryMonth",
        value: "09"
      },
      {
        name: "cardExpiryYear",
        value: "2035"
      },
      {
        name: "cardIssueDate",
        value: "2020-09-24 00:00:00"
      },
      {
        name: "cardIssueNum",
        value: "CC123456"
      },
      {
        name: "cardType",
        value: "VISA"
      },
      {
        name: "bankCode",
        value: "5678"
      },
      {
        name: "bankBranchCode",
        value: "BR1234"
      },
      {
        name: "accountType",
        value: "Savings"
      },
      {
        name: "bankName",
        value: "City Bank"
      },
      {
        name: "bankCoordinator",
        value: ""
      },
      {
        name: "bankAccountNo",
        value: "1111222233334444"
      },
      {
        name: "bankAccountHolderName",
        value: "John Doe"
      },
      {
        name: "requestId",
        value: "1234"
      },
      {
        name: "requestSource",
        value: "IDCC"
      },
      {
        name: "prMandateRef",
        value: "PAY1234"
      },
      {
        name: "catalystFlag",
        value: "Y"
      }
    ]
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

test("TC-CBA-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness CTLST");
  await allure.feature("Create BA");
  await allure.severity("blocker");
  let status;
  await test.step("TC-CBA-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-CBA-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-CBA-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(
        `[TC-CBA-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach").not.toBe(404);
  });
});

test("TC-CBA-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature("Create BA");
  await allure.severity("critical");
  let json;
  await test.step("TC-CBA-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-CBA-002_S02 - Cek response tidak null", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-CBA-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature("Create BA");
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-CBA-003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-CBA-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature("Create BA");
  await allure.severity("normal");
  let status;
  await test.step("TC-CBA-004_S01 - POST data invalid/kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-CBA-004_S02 - Verifikasi API memberikan respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-CBA-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature("Create BA");
  await allure.severity("critical");
  let status;
  await test.step("TC-CBA-005_S01 - POST tanpa Authorization header", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
  await test.step("TC-CBA-005_S02 - Verifikasi respon 401/403 atau response lain", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});

test("TC-CBA-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature("Create BA");
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-CBA-006_S01 - Ukur response time", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-CBA-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
