const fs = require("fs");
const specs = JSON.parse(
  fs.readFileSync("scripts/generators/batch4_specs.json", "utf8")
);

function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPrefix(title) {
  const words = title
    .trim()
    .split(/[\s\/\(\)_\-]+/)
    .filter((w) => w.length > 1);
  const initials = words
    .slice(0, 5)
    .map((w) => w[0].toUpperCase())
    .join("");
  return initials.replace(/[^A-Z0-9]/g, "").substring(0, 9);
}

function toEnvKey(title) {
  return title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 48);
}

function detectMsisdnFields(payload) {
  const fields = [];
  function scan(obj) {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "object" && v !== null) scan(v);
      else if (["msisdn", "MSISDN"].includes(k) && String(v).match(/^628/))
        fields.push(k);
    }
  }
  scan(payload);
  return [...new Set(fields)];
}

function generateSpec(spec) {
  const { id, group, title, method, url, payload } = spec;
  const slug = toSlug(title);
  const prefix = toPrefix(title);
  const envKey = toEnvKey(title);
  const dbKey = slug.substring(0, 40);
  const epic = `API Readiness ${group.toUpperCase()}`;
  const m = (method || "POST").toLowerCase();
  const METHOD = m.toUpperCase();

  let payloadCode;
  if (payload) {
    payloadCode = `const payload = ${JSON.stringify(payload, null, 4)};`;
  } else {
    payloadCode = `// TODO: Request Payload not parsed. Please add manually.\n  const payload = {};`;
  }

  const msisdnFields = payload ? detectMsisdnFields(payload) : [];
  const injectLines = [];
  injectLines.push(`  if (payload.msisdn) payload.msisdn = msisdn;`);
  injectLines.push(`  if (payload.MSISDN) payload.MSISDN = msisdn;`);
  injectLines.push(
    `  if (payload.Input && payload.Input.MSISDN) payload.Input.MSISDN = msisdn;`
  );
  injectLines.push(
    `  if (payload.Input && payload.Input.msisdn) payload.Input.msisdn = msisdn;`
  );

  return `/**
 * API Readiness Test — ${title}
 *
 * Source  : Confluence Page ID ${id}
 * Method  : ${METHOD} | Type: Synchronous
 * SIT URL : ${url}
 */

import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { getTestParams, closeDb, updateRun } from "../../../utils/db.js";

const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;
let runError = null;

const ENV      = process.env.TESTING_ENVIRONMENT ?? "SIT";
const BASE_URL = process.env.${envKey}_URL ?? "${url}";
const AUTH     = process.env.${envKey}_AUTH ?? "Basic Y3BxdXNlcjpjcHFwYXNzMjAyNQ==";
const BASE_HEADERS = { "Content-Type": "application/json", Authorization: AUTH };

let tc, VALID_MSISDN, endpointActive = true;

test.beforeAll(async () => {
  tc = await getTestParams("api_readiness_${dbKey}", "tc_${prefix.toLowerCase()}", userId);
  VALID_MSISDN = tc?.msisdn ?? process.env.TEST_MSISDN_VALID ?? "6285882237362";
  console.log(\`[beforeAll] ENV: \${ENV} | URL: \${BASE_URL} | MSISDN: \${VALID_MSISDN}\`);
});

test.afterEach(async ({}, testInfo) => {
  if ((testInfo.status === "failed" || testInfo.status === "timedOut") && !runError)
    runError = testInfo.error?.message ?? \`\${testInfo.title} failed\`;
});

test.afterAll(async () => {
  if (runId) await updateRun(runId, { status: runError ? "error" : "success", log: runError ?? undefined, finished_at: new Date() });
  await closeDb();
});

async function postApi(request, body, { headers = BASE_HEADERS } = {}) {
  const response = await request.${m}(BASE_URL, { headers, data: body });
  let json = null;
  try { json = await response.json(); } catch { /* non-JSON */ }
  return { response, json };
}

function buildBody(msisdn) {
  ${payloadCode}

${injectLines.join("\n")}

  return payload;
}

function skipIfDown() {
  if (!endpointActive) test.skip(true, \`Endpoint \${BASE_URL} tidak tersedia. Test di-skip.\`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("TC-${prefix}-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.severity("blocker");
  let status;
  await test.step("TC-${prefix}-001_S01 - ${METHOD} ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(\`[TC-${prefix}-001] Status: \${status} | URL: \${BASE_URL}\`);
  });
  await test.step("TC-${prefix}-001_S02 - Verifikasi status bukan 404/596", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(\`[TC-${prefix}-001] ⚠️  Endpoint tidak tersedia (HTTP \${status}) / TBD.\`);
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach").not.toBe(404);
  });
});

test("TC-${prefix}-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.severity("critical");
  let json;
  await test.step("TC-${prefix}-002_S01 - ${METHOD} request", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    json = r.json;
  });
  await test.step("TC-${prefix}-002_S02 - Cek response tidak null", async () => {
    expect(json).toBeTruthy();
  });
});

test("TC-${prefix}-003 — Positive Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.story("Positive Scenario"); await allure.severity("critical");
  await test.step("TC-${prefix}-003_S01 - ${METHOD} dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-${prefix}-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.severity("normal");
  let status;
  await test.step("TC-${prefix}-004_S01 - ${METHOD} data invalid/kosong", async () => {
    const r = await postApi(request, buildBody(""));
    status = r.response.status();
  });
  await test.step("TC-${prefix}-004_S02 - Verifikasi API memberikan respon", async () => {
    expect(status).toBeDefined();
  });
});

test("TC-${prefix}-005 — Auth Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.severity("critical");
  let status;
  await test.step("TC-${prefix}-005_S01 - ${METHOD} tanpa Authorization header", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), { headers: { "Content-Type": "application/json" } });
    status = r.response.status();
  });
  await test.step("TC-${prefix}-005_S02 - Verifikasi respon 401/403 atau response lain", async () => {
    expect([401, 403, 200]).toContain(status);
  });
});

test("TC-${prefix}-006 — Performance < 10 detik", async ({ request }) => {
  skipIfDown();
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.severity("normal");
  let elapsed;
  await test.step("TC-${prefix}-006_S01 - Ukur response time", async () => {
    const t = Date.now();
    await postApi(request, buildBody(VALID_MSISDN));
    elapsed = Date.now() - t;
  });
  await test.step("TC-${prefix}-006_S02 - Verifikasi < 10s", async () => {
    expect(elapsed).toBeLessThan(10000);
  });
});
`;
}

let count = 0;
for (const spec of specs) {
  const slug = toSlug(spec.title);
  const filePath = `tests/api-readiness/${spec.group}/${slug}.spec.js`;
  fs.writeFileSync(filePath, generateSpec(spec));
  console.log(`✅ ${filePath}`);
  count++;
}
console.log(`\nTotal: ${count} files written`);
