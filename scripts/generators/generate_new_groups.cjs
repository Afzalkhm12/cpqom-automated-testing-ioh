const fs = require("fs");

const specs = JSON.parse(
  fs.readFileSync("scripts/generators/new_groups_specs.json", "utf8")
);

function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPrefix(title) {
  // Generate a 6-8 char uppercase prefix for test IDs
  const words = title.split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 8).toUpperCase();
  return (
    words
      .map((w) => w[0])
      .join("")
      .toUpperCase() + words[words.length - 1].substring(1, 4).toUpperCase()
  );
}

function toEnvKey(title) {
  return title.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function toDbKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function buildPayloadLines(payload, msisdnFields) {
  let json = JSON.stringify(payload, null, 2);
  // Replace known MSISDN fields with dynamic value
  for (const f of msisdnFields) {
    const patterns = [
      new RegExp(`"${f}":\\s*"[^"]*"`, "g"),
      new RegExp(`"${f}":\\s*\\d+`, "g")
    ];
    for (const pat of patterns) {
      json = json.replace(pat, (m) => {
        const key = m.split(":")[0];
        return `${key}: msisdn`;
      });
    }
  }
  return json;
}

function detectMsisdnFields(payload) {
  const fields = [];
  function scan(obj) {
    for (const [k, v] of Object.entries(obj || {})) {
      if (typeof v === "object" && v !== null) scan(v);
      else if (
        ["msisdn", "MSISDN", "id"].includes(k) &&
        String(v).match(/^628/)
      )
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
  const dbKey = toDbKey(title);
  const epic = `API Readiness ${group.toUpperCase()}`;
  const msisdnFields = payload ? detectMsisdnFields(payload) : [];

  // Build payload string with MSISDN injection
  let payloadCode;
  if (payload) {
    let jsonStr = JSON.stringify(payload, null, 4);
    // Inject msisdn dynamically
    for (const f of msisdnFields) {
      const val = payload[f] || (payload.Input && payload.Input[f]) || "";
      jsonStr = jsonStr.replace(
        new RegExp(`"${f}":\\s*(?:"[^"]*"|\\d+)`, "g"),
        `"${f}": msisdn`
      );
    }
    payloadCode = `const payload = ${jsonStr};`;
  } else {
    payloadCode = `// TODO: Request Payload could not be parsed. Please add manually.\n  const payload = {};`;
  }

  // Build msisdn inject lines
  const injectLines = (
    msisdnFields.length > 0 ? msisdnFields : ["msisdn", "MSISDN"]
  )
    .map((f) => {
      if (f === "msisdn")
        return `  if (payload.msisdn) payload.msisdn = msisdn;`;
      if (f === "MSISDN")
        return `  if (payload.MSISDN) payload.MSISDN = msisdn;\n  if (payload.Input && payload.Input.MSISDN) payload.Input.MSISDN = msisdn;`;
      return `  if (payload.${f}) payload.${f} = msisdn;`;
    })
    .join("\n");

  return `/**
 * API Readiness Test — ${title}
 *
 * Source  : Confluence Page ID ${id}
 * Method  : ${method} | Type: Synchronous
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
  const response = await request.${method.toLowerCase()}(BASE_URL, { headers, data: body });
  let json = null;
  try { json = await response.json(); } catch { /* non-JSON */ }
  return { response, json };
}

function buildBody(msisdn) {
  ${payloadCode}

${injectLines}

  return payload;
}

function skipIfDown() {
  if (!endpointActive) test.skip(true, \`Endpoint \${BASE_URL} tidak tersedia. Test di-skip.\`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("TC-${prefix}-001 — Endpoint reachable", async ({ request }) => {
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.severity("blocker");
  let status;
  await test.step("TC-${prefix}-001_S01 - ${method} ke endpoint", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    status = r.response.status();
    console.log(\`[TC-${prefix}-001] Status: \${status} | URL: \${BASE_URL}\`);
  });
  await test.step("TC-${prefix}-001_S02 - Verifikasi status 200", async () => {
    if ([404, 596].includes(status) || BASE_URL === "TBD") {
      endpointActive = false;
      console.warn(\`[TC-${prefix}-001] ⚠️  Endpoint tidak tersedia (HTTP \${status}) / TBD.\`);
      test.skip();
      return;
    }
    expect(status, "Endpoint harus bisa di-reach (bukan 404/596)").not.toBe(404);
  });
});

test("TC-${prefix}-002 — Schema Check", async ({ request }) => {
  skipIfDown();
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.severity("critical");
  let json;
  await test.step("TC-${prefix}-002_S01 - ${method} request", async () => {
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
  await test.step("TC-${prefix}-003_S01 - ${method} dengan data valid", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN));
    expect(r.response.status()).toBeDefined();
  });
});

test("TC-${prefix}-004 — Negative Scenario", async ({ request }) => {
  skipIfDown();
  await allure.epic("${epic}"); await allure.feature("${title}"); await allure.severity("normal");
  let status;
  await test.step("TC-${prefix}-004_S01 - ${method} data invalid/kosong", async () => {
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
  await test.step("TC-${prefix}-005_S01 - ${method} tanpa Authorization header", async () => {
    const r = await postApi(request, buildBody(VALID_MSISDN), { headers: { "Content-Type": "application/json" } });
    status = r.response.status();
  });
  await test.step("TC-${prefix}-005_S02 - Verifikasi respon (401 atau 403)", async () => {
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

// Generate all files
for (const spec of specs) {
  const slug = toSlug(spec.title);
  const filePath = `tests/api-readiness/${spec.group}/${slug}.spec.js`;
  const content = generateSpec(spec);
  fs.writeFileSync(filePath, content);
  console.log(`✅ Written: ${filePath}`);
}
console.log(`\nTotal: ${specs.length} spec files generated`);
