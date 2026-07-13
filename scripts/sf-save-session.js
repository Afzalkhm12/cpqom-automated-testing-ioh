/**
 * sf-save-session.js
 *
 * Script one-time untuk menyimpan sesi Salesforce SIT sandbox ke file.
 * Jalankan sekali: node scripts/sf-save-session.js
 * Selesaikan login + OTP secara manual, lalu tekan Resume di Playwright Inspector.
 * State akan disimpan ke: sf-sit-session.json
 */

import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.resolve(__dirname, "../sf-sit-session.json");

const SF_INSTANCE =
  process.env.SF_SIT_INSTANCE ??
  "https://b2b-io--cpqsitdelo.sandbox.my.salesforce.com";

console.log("Launching browser...");
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

console.log(`Navigating to ${SF_INSTANCE}`);
await page.goto(SF_INSTANCE);

// Tunggu user login dan selesaikan OTP secara manual
console.log("\n==========================================================");
console.log("Silakan login di browser yang terbuka.");
console.log("Setelah berhasil masuk ke halaman Home Salesforce,");
console.log("kembali ke terminal ini dan tekan Enter untuk menyimpan sesi.");
console.log("==========================================================\n");

// Gunakan pause agar user bisa interaksi manual
await page.pause();

// Simpan storage state (cookies + localStorage)
await context.storageState({ path: SESSION_FILE });
console.log(`\n✅ Sesi berhasil disimpan ke: ${SESSION_FILE}`);
console.log(
  "Anda sekarang bisa menjalankan: npx playwright test tests/sit-mvp3 --headed\n"
);

await browser.close();
