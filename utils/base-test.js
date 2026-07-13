import { test as base, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { SalesforceAPI } from "./sf-api.js";
import { closeDb, updateRun } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SESSION_FILE = path.resolve(__dirname, "../sf-sit-session.json");
const INSTANCE_URL =
  process.env.SF_SIT_INSTANCE ??
  "https://b2b-io--cpqsitdelo.sandbox.my.salesforce.com";
const LIGHTNING_URL = INSTANCE_URL.replace(
  "sandbox.my.salesforce.com",
  "sandbox.lightning.force.com"
).replace("my.salesforce.com", "lightning.force.com");

// Parse env vars once
const runId = process.env.TEST_RUN_ID ? Number(process.env.TEST_RUN_ID) : null;
const userId = process.env.USER_ID ? Number(process.env.USER_ID) : null;

/**
 * Custom Playwright test fixture for SIT MVP3 tests.
 *
 * Provides:
 *   - `sfApi`      : SalesforceAPI instance for REST API calls (no browser needed)
 *   - `sfPage`     : Authenticated Playwright Page with Salesforce session loaded
 *   - `instanceUrl`: Salesforce instance URL
 *   - `lightningUrl`: Lightning URL for navigation
 *
 * NOTE: Lifecycle hooks (afterEach, afterAll) must be declared inside spec files,
 * not here. Use the exported `setupRunTracking(test)` helper in each spec that
 * needs run status tracking.
 */
export const test = base.extend({
  // ─── API Client Fixture ──────────────────────────────────────────────────
  // Available without launching a browser. Use for pure API tests.
  sfApi: [
    async ({ request }, use) => {
      const api = SalesforceAPI.fromSessionFile(
        request,
        SESSION_FILE,
        INSTANCE_URL
      );
      await use(api);
    },
    { scope: "test" }
  ],

  // ─── Authenticated Page Fixture ──────────────────────────────────────────
  // Launches a browser with the saved Salesforce session. Only instantiated
  // when a test actually requests it.
  sfPage: [
    async ({ browser }, use) => {
      if (!fs.existsSync(SESSION_FILE)) {
        throw new Error(
          `Session file not found: ${SESSION_FILE}\n` +
            "Run: node scripts/sf-save-session.js"
        );
      }

      const context = await browser.newContext({ storageState: SESSION_FILE });
      const page = await context.newPage();

      // Navigate to SF home to validate session
      await page.goto(INSTANCE_URL, { waitUntil: "domcontentloaded" });

      // Check if session is still valid
      const currentUrl = page.url();
      if (
        currentUrl.includes("/login") ||
        currentUrl.includes("verification")
      ) {
        await context.close();
        throw new Error(
          "Salesforce session expired!\n" +
            "Run: node scripts/sf-save-session.js"
        );
      }

      await use(page);
      await context.close();
    },
    { scope: "test" }
  ],

  // ─── URL Fixtures ────────────────────────────────────────────────────────
  instanceUrl: [async ({}, use) => use(INSTANCE_URL), { scope: "worker" }],
  lightningUrl: [async ({}, use) => use(LIGHTNING_URL), { scope: "worker" }]
});

// ─── Run Tracking Helper ─────────────────────────────────────────────────────

/**
 * Call this inside a test.describe() block to add standard afterEach/afterAll
 * lifecycle hooks for run status tracking.
 *
 * @example
 * test.describe('My Tests', () => {
 *   setupRunTracking(test);
 *   test('TC001', ...);
 * });
 */
export function setupRunTracking(testInstance, extraCreatedIds = {}) {
  let runError = null;

  testInstance.afterEach(async ({}, testInfo) => {
    if (
      (testInfo.status === "failed" || testInfo.status === "timedOut") &&
      !runError
    ) {
      runError = testInfo.error?.message ?? `${testInfo.title} failed`;
    }
  });

  testInstance.afterAll(async () => {
    if (runId) {
      await updateRun(runId, {
        status: runError ? "error" : "success",
        log: runError ?? undefined,
        created_ids: Object.keys(extraCreatedIds).length
          ? extraCreatedIds
          : undefined,
        finished_at: new Date()
      });
    }
    await closeDb();
  });
}

// ─── Re-exports ──────────────────────────────────────────────────────────────
export { expect, allure };
export { INSTANCE_URL, LIGHTNING_URL, SESSION_FILE, runId, userId };
