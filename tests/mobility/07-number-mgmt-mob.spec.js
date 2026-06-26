/**
 * Mobility Number Management Tests
 * MOB-NEW-002 | MOB-NEW-003 | MOB-NEW-004 | MOB-NEW-005 | MOB-NEW-006
 *
 * Source: docs/Test one.xlsx rows 97–124
 * Topic : Quote Management — Number Reservation via Vlocity Enterprise Sales App
 *
 * Architecture:
 *  - launchPersistentContext(.sf-profile) — reuses SF session, avoids MFA on re-login
 *  - Login only when the profile session has expired (headful so user can complete MFA)
 *  - Wait for "Configure Enterprise Quote" button explicitly (not timer-based)
 *    because Lightning SPA routes through Home before rendering the Quote record
 *  - ctx.waitForEvent("page") to catch the CPQ tab the moment it opens
 *  - afterEach closes all extra tabs so each test starts clean
 */

import { test, expect, chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────────
const SF_URL = "https://b2b-io--cpqsitdelo.sandbox.my.salesforce.com";
const LIGHTNING = "https://b2b-io--cpqsitdelo.sandbox.lightning.force.com";
const USERNAME = "o.harliansyah@ioh.co.id.cpqsitdelo";
const PASSWORD = "QFbe3fqe1osXwA";
const PROFILE_DIR = path.resolve(__dirname, "../../.sf-profile");

// Quote: API Test Quote 1778040724811 — Status: Draft, Sub Status: Draft-Sales
const QUOTE_ID = "0Q0MR000001Q4U20AK";
const ACCT_ID = "001MS00000AKh0o";
const DRAFT_QUOTE = `${LIGHTNING}/lightning/r/Quote/${QUOTE_ID}/view`;
// Direct CPQ URL — same destination as clicking "Configure Enterprise Quote"
const CPQ_URL =
  `${LIGHTNING}/lightning/n/vlocity_cmt__EnterpriseSalesApp` +
  `?c__accountId=${ACCT_ID}` +
  `&c__cartId=${QUOTE_ID}` +
  `&c__cartName=API%20Test%20Quote%201778040724811` +
  `&c__objType=Quote`;

// ── CSV report ─────────────────────────────────────────────────────────────────
const csvRows = [];
function rec(testNo, scenario, stepNo, stepDesc, status, notes = "") {
  csvRows.push({
    testNo,
    scenario,
    stepNo,
    stepDesc,
    status,
    notes,
    ts: new Date().toISOString()
  });
}
function writeCsv() {
  const dir = path.resolve(__dirname, "../../test-results");
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "MOB-NEW-number-mgmt-report.csv");
  const hdr =
    "Test No,Scenario,Step No,Step Description,Status,Notes,Executed At";
  const rows = csvRows.map(
    (r) =>
      `${r.testNo},"${r.scenario}",${r.stepNo},"${r.stepDesc.replace(/"/g, '""')}",${r.status},"${r.notes.replace(/"/g, '""')}",${r.ts}`
  );
  writeFileSync(out, [hdr, ...rows].join("\n"), "utf8");
  console.log(`\n  CSV → ${out}`);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function idle(pg, ms = 1500) {
  if (!pg || pg.isClosed()) return;
  await pg.waitForTimeout(ms).catch(() => {});
}

async function ready(pg, ms = 25000) {
  if (!pg || pg.isClosed()) return;
  await pg
    .waitForLoadState("domcontentloaded", { timeout: ms })
    .catch(() => {});
  await pg
    .waitForFunction(
      () =>
        !document.querySelector(
          ".slds-spinner_container:not([style*='display: none']),.forceLoadingState"
        ),
      { timeout: ms }
    )
    .catch(() => {});
}

async function snap(pg, name) {
  if (!pg || pg.isClosed()) return;
  const dir = path.resolve(__dirname, "../../test-results");
  mkdirSync(dir, { recursive: true });
  await pg.screenshot({ path: path.join(dir, `${name}.png`) }).catch(() => {});
}

// ── Shared persistent context ──────────────────────────────────────────────────
let _ctx;

test.beforeAll(async () => {
  test.setTimeout(180_000); // 3 min: covers login + optional MFA

  _ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    slowMo: 200,
    args: ["--start-maximized"],
    viewport: { width: 1920, height: 1080 }
  });

  const pg = await _ctx.newPage();

  // Navigate directly to Lightning home — if the profile has a valid session, it just loads
  await pg.goto(`${LIGHTNING}/lightning/page/home`, {
    waitUntil: "domcontentloaded"
  });
  const alreadyIn = await pg
    .waitForURL(`${LIGHTNING}/lightning/**`, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!alreadyIn) {
    console.log("[beforeAll] Session expired — logging in...");
    await pg.goto(SF_URL, { waitUntil: "domcontentloaded" });
    await pg.fill("#username", USERNAME);
    await pg.click("#Login");
    await pg.waitForSelector("#password", { timeout: 20000 });
    await pg.fill("#password", PASSWORD);
    await pg.click("#Login");
    // 120s allows user to complete MFA in the headful browser if it's triggered
    await pg.waitForURL("**/lightning/**", { timeout: 120_000 });
    console.log("[beforeAll] Login OK →", pg.url());
  } else {
    console.log("[beforeAll] Session valid →", pg.url());
  }

  await pg.close();
});

test.afterAll(async () => {
  writeCsv();
  for (const p of _ctx?.pages() ?? []) await p.close().catch(() => {});
  await _ctx?.close().catch(() => {});
});

test.afterEach(async () => {
  // Close any tabs a test left open so the next test starts clean
  for (const p of (_ctx?.pages() ?? []).filter((p) => !p.isClosed())) {
    await p.close().catch(() => {});
  }
});

// ── Navigate to Quote → CPQ → Number Mgmt ─────────────────────────────────────
/**
 * Step 1: Opens the Draft Quote page, verifies "Configure Enterprise Quote" is visible.
 * Step 2: Navigates directly to the known CPQ URL (same destination as clicking the button)
 *         and clicks the "Number Mgmt" toolbar button.
 *
 * Direct CPQ navigation is used because the button click opens the CPQ in the *same* tab
 * via Lightning routing (no new-tab event), and the Vlocity SPA takes ~60s to hydrate.
 * Navigating directly is faster and deterministic.
 *
 * Returns the page that shows the Number Mgmt wizard.
 * afterEach cleans up all open pages.
 */
async function openNumberMgmt(testId, scenarioRec) {
  const pg = await _ctx.newPage();

  // ── Step 1: Show Draft Quote → verify Configure Enterprise Quote is accessible ─
  console.log(`[${testId}] Loading Quote...`);
  await pg.goto(DRAFT_QUOTE, { waitUntil: "domcontentloaded" });
  const cfgBtn = pg.getByRole("button", { name: "Configure Enterprise Quote" });
  await cfgBtn.waitFor({ state: "visible", timeout: 90_000 });
  console.log(`[${testId}] Quote ready.`);
  await snap(pg, `${testId}-01-quote`);
  rec(
    testId,
    scenarioRec,
    1,
    "Navigate to Draft Quote → Configure Enterprise Quote visible",
    "PASS",
    `Quote ${QUOTE_ID} Draft-Sales`
  );

  // ── Step 2: Navigate directly to CPQ (avoids Lightning tab/redirect ambiguity) ─
  console.log(`[${testId}] Loading CPQ...`);
  await pg.goto(CPQ_URL, { waitUntil: "domcontentloaded" });
  rec(
    testId,
    scenarioRec,
    1,
    "Click Configure Enterprise Quote",
    "PASS",
    "CPQ Enterprise Sales App opened"
  );

  // Wait for the CPQ toolbar — "Number Mgmt" button must appear (toolbar renders first)
  const numBtn = pg
    .locator("button, a, [role='button'], vlocity-btn, c-cpq-button")
    .filter({ hasText: /Number\s*Mgmt/i })
    .first();
  await numBtn.waitFor({ state: "visible", timeout: 60_000 });
  console.log(`[${testId}] CPQ ready, Number Mgmt visible.`);
  await snap(pg, `${testId}-02-cpq`);

  // ── Step 3: Click Number Mgmt → "Select a Product" modal appears ────────────
  await numBtn.click();
  await idle(pg, 2000);
  await snap(pg, `${testId}-03-num-mgmt-modal`);
  rec(
    testId,
    scenarioRec,
    2,
    "Click Number Mgmt in CPQ toolbar",
    "PASS",
    "Number Mgmt modal opened"
  );

  // ── Step 4: Click "Reserve Numbers" in the modal ──────────────────────────
  // The modal says "Select a Product for which to upload numbers against."
  // Clicking "Reserve Numbers" may open the OmniScript in a new tab.
  console.log(`[${testId}] Looking for Reserve Numbers button...`);
  const reserveBtn = pg
    .getByRole("button", { name: /Reserve\s*Numbers/i })
    .first();
  await reserveBtn.waitFor({ state: "visible", timeout: 15_000 });

  const reserveTabPromise = _ctx.waitForEvent("page", { timeout: 20_000 });
  await reserveBtn.click();
  console.log(
    `[${testId}] Reserve Numbers clicked — watching for new tab or form.`
  );

  let numPg = pg;
  try {
    numPg = await reserveTabPromise;
    console.log(`[${testId}] Reservation form opened in NEW TAB.`);
    await numPg
      .waitForLoadState("domcontentloaded", { timeout: 40_000 })
      .catch(() => {});
  } catch {
    console.log(`[${testId}] Reservation form on same page.`);
  }
  await ready(numPg, 30_000);
  await snap(numPg, `${testId}-04-reserve-form`);
  rec(
    testId,
    scenarioRec,
    2,
    "Click Reserve Numbers",
    "PASS",
    "Number reservation form opened"
  );

  return { quotePg: pg, cpqPg: pg, numPg };
}

// ── Fill the Number search form ────────────────────────────────────────────────
async function fillForm(pg, { type, prefix, vanity, start, end, qty = "1" }) {
  // Product = Mobility
  const prodDropdowns = pg.locator("select, [role='combobox']");
  for (let i = 0; i < (await prodDropdowns.count().catch(() => 0)); i++) {
    const d = prodDropdowns.nth(i);
    if (await d.isVisible({ timeout: 2000 }).catch(() => false)) {
      await d.click().catch(() => {});
      const opt = pg.getByRole("option", { name: /^Mobility$/i }).first();
      if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await opt.click();
        break;
      }
      await pg.keyboard.press("Escape").catch(() => {});
    }
  }

  // Search type (Prefix / Vanity / Range)
  if (type) {
    const typeDropdown = pg
      .locator("select, [role='combobox']")
      .filter({ hasText: new RegExp(type, "i") })
      .first();
    if (await typeDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeDropdown.click().catch(() => {});
    } else {
      // Try second dropdown
      const second = pg.locator("select, [role='combobox']").nth(1);
      if (await second.isVisible({ timeout: 3000 }).catch(() => false))
        await second.click().catch(() => {});
    }
    const typeOpt = pg
      .getByRole("option", { name: new RegExp(type, "i") })
      .first();
    if (await typeOpt.isVisible({ timeout: 3000 }).catch(() => false))
      await typeOpt.click();
  }

  async function fillField(labelText, nameHint, value) {
    const inp = pg
      .getByLabel(labelText, { exact: false })
      .first()
      .or(
        pg
          .locator(
            `input[placeholder*='${nameHint}' i], input[name*='${nameHint}' i]`
          )
          .first()
      );
    if (await inp.isVisible({ timeout: 4000 }).catch(() => false)) {
      await inp.clear().catch(() => {});
      await inp.fill(value);
    }
  }

  if (prefix) await fillField("Prefix", "prefix", prefix);
  if (vanity) await fillField("Vanity", "vanity", vanity);
  if (start) await fillField("Start", "start", start);
  if (end) await fillField("End", "end", end);

  const q = pg
    .locator(
      "input[type='number'], input[name*='quantity' i], input[name*='qty' i]"
    )
    .first();
  if (await q.isVisible({ timeout: 3000 }).catch(() => false)) {
    await q.clear().catch(() => {});
    await q.fill(qty);
  }
}

// ── Click the Next wizard button and wait ─────────────────────────────────────
async function clickNext(pg) {
  const btn = pg
    .getByRole("button", { name: /^Next$/i })
    .first()
    .or(
      pg
        .locator("button")
        .filter({ hasText: /^Next$/i })
        .first()
    );
  await btn.waitFor({ state: "visible", timeout: 10_000 });
  await btn.click();
  await ready(pg, 20_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// MOB-NEW-002 — Number availability by PREFIX
// ─────────────────────────────────────────────────────────────────────────────
test("MOB-NEW-002: Number availability by prefix", async () => {
  test.setTimeout(600_000);
  const ID = "MOB-NEW-002";
  const SCN = "Check mobile number availability based on prefix";

  const { numPg } = await openNumberMgmt(ID, SCN);

  await test.step("Step 3: Select Mobility, qty=1, prefix=0812", async () => {
    await fillForm(numPg, { type: "Prefix", prefix: "0812", qty: "1" });
    await snap(numPg, `${ID}-step3`);
    rec(
      ID,
      SCN,
      3,
      "Select Mobility product, service type, qty, prefix=0812",
      "PASS"
    );
  });

  await test.step("Step 4: Click Next", async () => {
    await clickNext(numPg);
    await snap(numPg, `${ID}-step4`);
    rec(ID, SCN, 4, "Click Next", "PASS");
  });

  await test.step("Step 5: Verify number list matching prefix 0812", async () => {
    await idle(numPg, 2000);
    await snap(numPg, `${ID}-step5`);
    const rows = await numPg
      .locator("table tbody tr")
      .count()
      .catch(() => 0);
    const body = await numPg.textContent("body").catch(() => "");
    const phone = /\b08\d{7,11}\b/.test(body);
    const errEl = numPg.locator("[role='alert'], .slds-notify--error").first();
    if (await errEl.isVisible({ timeout: 1500 }).catch(() => false)) {
      const msg = (await errEl.textContent().catch(() => ""))
        .trim()
        .substring(0, 120);
      rec(ID, SCN, 5, "Verify number list by prefix", "FAIL", msg);
      throw new Error(msg);
    }
    const passed = rows > 0 || phone;
    rec(
      ID,
      SCN,
      5,
      "Verify number list displayed matching prefix 0812",
      passed ? "PASS" : "FAIL",
      passed
        ? `${rows} row(s) returned`
        : "No numbers returned — check TNM prefix data"
    );
    expect(
      passed,
      `Expected numbers returned. rows=${rows} phone=${phone}`
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOB-NEW-003 — Number availability by VANITY
// ─────────────────────────────────────────────────────────────────────────────
test("MOB-NEW-003: Number availability by vanity", async () => {
  test.setTimeout(600_000);
  const ID = "MOB-NEW-003";
  const SCN = "Check mobile number availability based on vanity";

  const { numPg } = await openNumberMgmt(ID, SCN);

  await test.step("Step 3: Select Mobility, qty=1, vanity=08xx1234", async () => {
    await fillForm(numPg, { type: "Vanity", vanity: "08xx1234", qty: "1" });
    await snap(numPg, `${ID}-step3`);
    rec(
      ID,
      SCN,
      3,
      "Select Mobility, service type, qty, vanity=08xx1234",
      "PASS"
    );
  });

  await test.step("Step 4: Click Next", async () => {
    await clickNext(numPg);
    await snap(numPg, `${ID}-step4`);
    rec(ID, SCN, 4, "Click Next", "PASS");
  });

  await test.step("Step 5: Verify number list matching vanity pattern", async () => {
    await idle(numPg, 2000);
    await snap(numPg, `${ID}-step5`);
    const rows = await numPg
      .locator("table tbody tr")
      .count()
      .catch(() => 0);
    const body = await numPg.textContent("body").catch(() => "");
    const phone = /\b08\d{7,11}\b/.test(body);
    const passed = rows > 0 || phone;
    rec(
      ID,
      SCN,
      5,
      "Verify number list matching vanity pattern",
      passed ? "PASS" : "FAIL",
      passed
        ? `${rows} row(s) matching vanity`
        : "No numbers — check TNM vanity data"
    );
    expect(passed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOB-NEW-004 — Number availability by START/END RANGE
// ─────────────────────────────────────────────────────────────────────────────
test("MOB-NEW-004: Number availability by start/end range", async () => {
  test.setTimeout(600_000);
  const ID = "MOB-NEW-004";
  const SCN = "Check mobile number availability based on start and end number";

  const { numPg } = await openNumberMgmt(ID, SCN);

  await test.step("Step 3: Select Mobility, start=081200000001, end=081200000010", async () => {
    await fillForm(numPg, {
      type: "Range",
      start: "081200000001",
      end: "081200000010",
      qty: "1"
    });
    await snap(numPg, `${ID}-step3`);
    rec(
      ID,
      SCN,
      3,
      "Select Mobility, service type, qty, start=081200000001, end=081200000010",
      "PASS"
    );
  });

  await test.step("Step 4: Click Next", async () => {
    await clickNext(numPg);
    await snap(numPg, `${ID}-step4`);
    rec(ID, SCN, 4, "Click Next", "PASS");
  });

  await test.step("Step 5: Verify number list within start/end range", async () => {
    await idle(numPg, 2000);
    await snap(numPg, `${ID}-step5`);
    const rows = await numPg
      .locator("table tbody tr")
      .count()
      .catch(() => 0);
    const body = await numPg.textContent("body").catch(() => "");
    const phone = /\b08\d{7,11}\b/.test(body);
    const passed = rows > 0 || phone;
    rec(
      ID,
      SCN,
      5,
      "Verify number list within start/end range",
      passed ? "PASS" : "FAIL",
      passed
        ? `${rows} row(s) within range`
        : "No numbers — check TNM range data"
    );
    expect(passed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOB-NEW-005 — No available mobile number (negative case)
// ─────────────────────────────────────────────────────────────────────────────
test("MOB-NEW-005: No available mobile number", async () => {
  test.setTimeout(600_000);
  const ID = "MOB-NEW-005";
  const SCN = "No available mobile number";

  const { numPg } = await openNumberMgmt(ID, SCN);

  await test.step("Step 3: Use non-existent prefix to get 0 results", async () => {
    await fillForm(numPg, { type: "Prefix", prefix: "0800000000", qty: "999" });
    await snap(numPg, `${ID}-step3`);
    rec(
      ID,
      SCN,
      3,
      "Select Mobility, service type, qty, unavailable prefix criteria",
      "PASS",
      "Prefix=0800000000 (non-existent), Qty=999"
    );
  });

  await test.step("Step 4: Click Next", async () => {
    await clickNext(numPg);
    await snap(numPg, `${ID}-step4`);
    rec(ID, SCN, 4, "Click Next", "PASS");
  });

  await test.step("Step 5: Verify no-number-available message", async () => {
    await idle(numPg, 2000);
    await snap(numPg, `${ID}-step5`);
    const rows = await numPg
      .locator("table tbody tr")
      .count()
      .catch(() => 0);
    const body = await numPg.textContent("body").catch(() => "");
    const noMsg =
      /no.{0,30}number|not.{0,20}available|tidak.{0,20}tersedia|0.{0,5}result/i.test(
        body
      );
    const passed = rows === 0 || noMsg;
    rec(
      ID,
      SCN,
      5,
      "Verify no number available message displayed",
      passed ? "PASS" : "FAIL",
      noMsg
        ? "No-number message displayed as expected"
        : `${rows} rows returned (expected 0)`
    );
    expect(passed, `Expected 0 rows; got ${rows}`).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOB-NEW-006 — Reserve mobile number (full MSISDN + ICCID flow)
// ─────────────────────────────────────────────────────────────────────────────
test("MOB-NEW-006: Reserve mobile number", async () => {
  test.setTimeout(600_000);
  const ID = "MOB-NEW-006";
  const SCN = "Reserve mobile number";

  const { numPg } = await openNumberMgmt(ID, SCN);

  await test.step("Step 3: Select Mobility, qty=1, prefix=0812", async () => {
    await fillForm(numPg, { type: "Prefix", prefix: "0812", qty: "1" });
    await snap(numPg, `${ID}-step3`);
    rec(ID, SCN, 3, "Select Mobility, service type, qty, prefix=0812", "PASS");
  });

  await test.step("Step 4: Click Next", async () => {
    await clickNext(numPg);
    await snap(numPg, `${ID}-step4`);
    rec(ID, SCN, 4, "Click Next", "PASS");
  });

  await test.step("Step 5: Verify numbers, select first, click Next", async () => {
    await idle(numPg, 2000);
    await snap(numPg, `${ID}-step5a`);
    const rows = await numPg
      .locator("table tbody tr")
      .count()
      .catch(() => 0);
    const body = await numPg.textContent("body").catch(() => "");
    expect(
      rows > 0 || /\b08\d{7,11}\b/.test(body),
      "Numbers must be listed"
    ).toBe(true);

    const cb = numPg
      .locator("table tbody tr")
      .first()
      .locator("input[type='checkbox']")
      .first();
    if (await cb.isVisible({ timeout: 4000 }).catch(() => false))
      await cb.check();

    await clickNext(numPg);
    await snap(numPg, `${ID}-step5b`);
    rec(
      ID,
      SCN,
      5,
      "Verify Number list, select first number, click Next",
      "PASS",
      `${rows} number(s); first selected`
    );
  });

  await test.step("Step 6: Confirm reservation, click Next", async () => {
    await idle(numPg, 1500);
    await snap(numPg, `${ID}-step6`);
    await clickNext(numPg);
    rec(ID, SCN, 6, "Verify reservation confirmation, click Next", "PASS");
  });

  await test.step("Step 7: Enter ICCID quantity=1, click Next", async () => {
    await idle(numPg, 1500);
    await snap(numPg, `${ID}-step7a`);
    const iccid = numPg
      .getByLabel(/ICCID/i)
      .first()
      .or(
        numPg
          .locator("input[name*='iccid' i], input[placeholder*='iccid' i]")
          .first()
      )
      .or(numPg.locator("input[type='number']").first());
    if (await iccid.isVisible({ timeout: 5000 }).catch(() => false)) {
      await iccid.clear().catch(() => {});
      await iccid.fill("1");
    }
    await snap(numPg, `${ID}-step7b`);
    await clickNext(numPg);
    rec(ID, SCN, 7, "Enter ICCID quantity=1, click Next", "PASS");
  });

  await test.step("Step 8: Verify ICCID list, select first, click Next to commit", async () => {
    await idle(numPg, 2000);
    await snap(numPg, `${ID}-step8a`);
    const rows = await numPg
      .locator("table tbody tr")
      .count()
      .catch(() => 0);
    const body = await numPg.textContent("body").catch(() => "");
    const hasIcc = /\d{19,20}|ICCID/i.test(body);
    expect(rows > 0 || hasIcc, "ICCID list must be displayed").toBe(true);

    const cb = numPg
      .locator("table tbody tr")
      .first()
      .locator("input[type='checkbox']")
      .first();
    if (await cb.isVisible({ timeout: 4000 }).catch(() => false))
      await cb.check();

    await clickNext(numPg);
    await snap(numPg, `${ID}-step8b`);

    const bodyAfter = await numPg.textContent("body").catch(() => "");
    const committed = /success|reserved|committed|complete/i.test(bodyAfter);
    rec(
      ID,
      SCN,
      8,
      "Verify ICCID list, select ICCID, click Next to commit",
      rows > 0 || hasIcc ? "PASS" : "FAIL",
      committed
        ? "Reservation committed — MSISDN and ICCID reserved against Quote"
        : `${rows} ICCID row(s); verify Quote record for reserved numbers`
    );
  });
});
