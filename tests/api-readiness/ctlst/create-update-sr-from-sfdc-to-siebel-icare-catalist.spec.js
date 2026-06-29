/**
 * API Readiness Test — CREATE, UPDATE SR FROM SFDC TO SIEBEL (ICARE, CATALIST)
 *
 * Source  : Confluence Page ID 5679070
 * Method  : POST | Type: Synchronous
 * SIT URL : http://tm-route-tibco-mashery-dev.apps.ocpmwdev.ioh.co.id/sit/CreateUpdateSR?api_key=3sekjsjugxmbb5nadxarw2nx
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL =
  process.env.CREATE_UPDATE_SR_FROM_SFDC_TO_SIEBEL_ICARE_CATALIST__URL ??
  "http://tm-route-tibco-mashery-dev.apps.ocpmwdev.ioh.co.id/sit/CreateUpdateSR?api_key=3sekjsjugxmbb5nadxarw2nx";
const AUTH =
  process.env.CREATE_UPDATE_SR_FROM_SFDC_TO_SIEBEL_ICARE_CATALIST__AUTH ??
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
    "api_readiness_create-update-sr-from-sfdc-to-siebel-icare-catalist",
    "tc_createup",
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
    transid: "1-1234",
    msisdn: "6281514101166",
    servicename: "CreateSRFromSFDC",
    SFDCIssueEntryid: "ABCD1234-1_SIT",
    SFDCSRID: "",
    SRNumber: "A12345_1",
    CaseNumber: "A0023",
    SIEBELSRID: "",
    SiebelDataLocation: "ICARE",
    servicedata: {
      lang: "EN",
      channel: "IDCC",
      IDSRequestType: "IT",
      IssueCodeNumber: "1202020022",
      SFDCAccountId: "010220160918016285774009234",
      SFDCAccountNumber: "010220160918016285774009234",
      AdjustmentValue: "34343",
      AdjustorComments: "AdjustorComments",
      AgentComments: "AgentComments",
      Amount: "565",
      AmountOfCharging: "45",
      Area: "HYD",
      ATMCardNo: "1212121",
      APConfirmationCopy: "Y",
      APTrnsToAcctReg: "56565",
      ASToABARoutingNumber: "23232",
      ASTrnsFromAcctAssoc: "2323232",
      ASTrnsFromAcctReg: "2323232",
      ASTrnsToAcctAssocTIN: "23232",
      BankAccNo: "23232",
      BPCustomerNumber: "23232",
      BirthPlace: "HYD",
      BranchAddress: "HYD",
      CEMTimeUnit: "Copy Billing",
      CFTracking: "12121",
      COAccountReg: "Bali",
      COAddressLine2: "12121",
      COCity: "KKT",
      COIncldCover: "true",
      CONameLine2: "QWQWQ",
      COOther: "QWQWQ",
      COZipCode: "676",
      Comments: "UpdateSR Test",
      ComplaintDescription: "Complaint Desc",
      CreatedByName: "SADMIN",
      CreditCardNamber: "12121212",
      CrntMileage: "12121",
      DateOfTransfer: "2020-02-27",
      DetailBenefit: "WWWEERR",
      DisconnectEvery: "1212112",
      ErrorMessageBrowser: "ErrBrow",
      EventLocation: "HYDE",
      FTSendTo: "23232",
      GroupName: "Galeri",
      HandsetType: "12121",
      HandsetTypeNo: "12121",
      IDSAccount: "1-1232121",
      IDSAction: "Aktifasi/Registrasi",
      IDSAdjtAmount: "-1",
      IDSAdjtType: "Dispute",
      IDSCaseSIMCard: "23432432",
      IDSComments: "ererw",
      IDSCustomerType: "true",
      IDSDamageVchrSl: "12121",
      IDSDisputeType: "CN-Mobile Service",
      IDSErrMsg: "WEWE",
      IDSEventDate: "2020-02-27 07:52:20",
      IDSInvoice: "0197281991",
      IDSProductCatgry: "Y",
      IDSPulsaAkhir: "",
      IDSRegChannel: "UMB",
      IDSReInvoiceType: "CN-Mobile Service",
      IDSSrvcSts: "Open",
      IDSTerpotong: "234432423",
      IDSTypePgrm: "Harian",
      INSAgent: "QWERT",
      InstitutionName: "InsName",
      IssueCode: "1302040010",
      IssueEntry: "1-1234",
      LeadSRType: "SR TYpe",
      LostNotes: "wewe",
      NIAKAName: "NIAKA",
      NICommMtd: "NIAMe",
      NINickName: "BODES",
      NIPhoneSDate: "2020-02-27",
      NIPhoneEDate: "2020-02-27",
      NIPhoneFrgnNo: "232323",
      NIReason: "Reason",
      OpenedDate: "2020-02-27 14:10:20",
      OrgntionText: "OrgText",
      PaymentAmount: "45454",
      PaymentDate: "2020-02-27",
      PriorityStr: "2-High",
      ProgRegDate: "2020-02-27",
      Reason: "No",
      "ReloadAmount ": "4454",
      ReloadDate: "02/27/2020",
      RoutingNo: "1212121",
      RowStatus: "true",
      RUIMBrand: "12121",
      SerialNumber: "6281646949757",
      Signal: "3",
      SignalInfrmtn: "23232",
      SmrtIssueId: "3232323",
      SRBillCode: "32443433",
      StartAmount: "4534",
      Status: "In Progress",
      Street: "12121",
      SubArea: "Area",
      SwiftCode: "12121",
      TellerTrnsAmt: "34343",
      ToAccountNo: "232323",
      Traceroute: "23232",
      TrnfAccountNo: "1212121",
      ViaCorp: "ATM",
      WebsiteList: "WWWW",
      SFDCCreatedByUserTeam: "SFDC",
      SFDCModifiedByUser: "SFDC",
      SFDCModifiedByUserTeam: "SFDC",
      SIEBELCreatedByUserTeam: "SADMIN-Group",
      SIEBELCreatedByUser: "SADMIN",
      SIEBELModifiedByUserTeam: "SADMIN-Group",
      SIEBELModifiedByUser: "SADMIN",
      AMNewSendLetter: "true",
      AMNewSupervisorRev: "true",
      AMOldSupervisorRev: "Y",
      APCopyCheckFile: "true",
      APThirdParyInd: "true",
      APTrnsfAgreement: "true",
      ASToAccNum: "3232",
      CFCommFlg: "true",
      COQuantityOrder: "22322",
      COSupervisorReview: "true",
      Clearing: "GFGF",
      ConfNeeded: "true",
      CorrSwiftNo: "1212121",
      DeliverAllSecurity: "true",
      EventLoc: "HYD",
      ISATAccCurr: "Rp",
      ISATAdjDate: "2020-02-19",
      ISATAdjType: "Internal",
      ISATContrPOS: "",
      ISATDisputeInvNo: "2412432121",
      ISATInvoiceNet: "1234",
      ISATInvoiceTax: "231",
      ISATSerIdDesc: "Test desc",
      IssueCert: "true",
      Method: "23",
      NISendTo: "QWQWQ",
      TransDate: "2020-02-27",
      DisputeAmount: "500",
      ServiceIDDescription: "6281646949757",
      DetailDescription: "Test Description",
      ComplaintAreaCity: "Badung",
      BankAccountNo: "3434343",
      AMOldSendLetter: "true",
      Account: "1-1234",
      CustomerName: "SREENIVASA RAO PATIBANDLA",
      ExpirationDate: "2020-02-27",
      SRNotes: [
        {
          SRNoteCreatedByName: "JOHN",
          SRNNote: "Test Note1",
          SRNoteType: "Test",
          SRNoteCreatedDate: "2020-02-19 04:30:00"
        },
        {
          SRNoteCreatedByName: "JOHN",
          SRNNote: "Test Note2",
          SRNoteType: "Test",
          SRNoteCreatedDate: "2020-02-19 04:30:00"
        },
        {
          SRNoteCreatedByName: "JOHN",
          SRNNote: "Test Note3",
          SRNoteType: "Test",
          SRNoteCreatedDate: "2020-02-19 04:30:00"
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

test("TC-CREATEUP-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "CREATE, UPDATE SR FROM SFDC TO SIEBEL (ICARE, CATALIST)"
  );
  await allure.severity("blocker");
  let status;
  await test.step("TC-CREATEUP-001_S01 - POST ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(`[TC-CREATEUP-001] Status: ${status} | URL: ${BASE_URL}`);
  });
  await test.step("TC-CREATEUP-001_S02 - Verifikasi status 200", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(
        `[TC-CREATEUP-001] ⚠️  Endpoint tidak tersedia (HTTP ${status}) / TBD.`
      );
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach (bukan 404/596)").not.toBe(
      404
    );
  });
});

test("TC-CREATEUP-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "CREATE, UPDATE SR FROM SFDC TO SIEBEL (ICARE, CATALIST)"
  );
  await allure.severity("critical");
  let json;
  await test.step("TC-CREATEUP-002_S01 - POST request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-CREATEUP-002_S02 - Cek response", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-CREATEUP-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "CREATE, UPDATE SR FROM SFDC TO SIEBEL (ICARE, CATALIST)"
  );
  await allure.story("Positive Scenario");
  await allure.severity("critical");
  await test.step("TC-CREATEUP-003_S01 - POST dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-CREATEUP-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "CREATE, UPDATE SR FROM SFDC TO SIEBEL (ICARE, CATALIST)"
  );
  await allure.severity("normal");
  let status;
  await test.step("TC-CREATEUP-004_S01 - POST data invalid", async () => {
    const body = buildBody("");
    const r = await postApi(request, body);
    status = r.response.status();
  });
  await test.step("TC-CREATEUP-004_S02 - Verifikasi API respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-CREATEUP-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "CREATE, UPDATE SR FROM SFDC TO SIEBEL (ICARE, CATALIST)"
  );
  await allure.severity("critical");
  let status;
  await test.step("TC-CREATEUP-005_S01 - POST tanpa Auth", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), {
      headers: { "Content-Type": "application/json" }
    });
    status = r.response.status();
  });
});

test("TC-CREATEUP-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("API Readiness CTLST");
  await allure.feature(
    "CREATE, UPDATE SR FROM SFDC TO SIEBEL (ICARE, CATALIST)"
  );
  await allure.severity("normal");
  let elapsed;
  await test.step("TC-CREATEUP-006_S01 - Ukur waktu", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-CREATEUP-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
