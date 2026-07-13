import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import { requireState, setState } from "../../utils/runtime-state.js";
import * as docGen from "../../pages/document-generation.page.js";
import * as contractPage from "../../pages/contract.page.js";
import * as lightning from "../../utils/sf-lightning.js";
import path from "path";
import { fileURLToPath } from "url";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FILE = path.resolve(
  __dirname,
  "../../test-data/chat_transcript.pdf"
);

test.describe("SIT MVP3 — Contract Management", () => {
  let quoteId;
  let quoteUrl;
  let contractId;
  let contractUrl;

  test.beforeAll(async () => {
    quoteId = requireState(
      "quoteId",
      "Run 04-quote-finalization.spec.js first"
    );
    quoteUrl = requireState(
      "quoteUrl",
      "Run 04-quote-finalization.spec.js first"
    );
  });

  test("Start Sync — Create Contract from Quote", async ({ sfPage }) => {
    await test.step("Navigate to Quote page", async () => {
      await sfPage.goto(quoteUrl);
      await lightning.waitForLightningReady(sfPage);
    });

    await test.step("Click Start Sync to generate Contract", async () => {
      // Try direct Start Sync button first
      const startSyncBtn = sfPage
        .locator("button, a")
        .filter({ hasText: /^Start Sync$/i })
        .filter({ visible: true })
        .first();

      const hasDirect = await startSyncBtn
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => true)
        .catch(() => false);

      if (hasDirect) {
        await startSyncBtn.click();
        console.log("✅ Clicked Start Sync directly.");
      } else {
        // Try via dropdown chevron
        const chevron = sfPage
          .locator("button")
          .filter({ hasText: /show more|more actions/i })
          .first();
        if (
          await chevron
            .waitFor({ state: "visible", timeout: 5000 })
            .then(() => true)
            .catch(() => false)
        ) {
          await chevron.click();
          await sfPage.waitForTimeout(500);
          const menuItem = sfPage
            .locator("[role='menuitem'], .slds-dropdown__item a")
            .filter({ hasText: /Start Sync/i })
            .first();
          if (
            await menuItem
              .waitFor({ state: "visible", timeout: 3000 })
              .then(() => true)
              .catch(() => false)
          ) {
            await menuItem.click();
            console.log("✅ Clicked Start Sync from dropdown.");
          }
        }
      }

      // Wait for sync to process
      await sfPage.waitForTimeout(5000);
      await lightning.waitForLightningReady(sfPage);
    });
  });

  test("Lookup Contract ID", async ({ sfApi }) => {
    const contracts = await sfApi.getContractsForQuote(quoteId);
    expect(contracts.records.length).toBeGreaterThan(0);

    contractId = contracts.records[0].Id;
    contractUrl = `${LIGHTNING_URL}/lightning/r/Contract/${contractId}/view`;
    setState("contractId", contractId);
    setState("contractUrl", contractUrl);
    console.log(`Contract ID: ${contractId}`);
  });

  test("IPH-NEWFIX-008 — Create FAB new connect", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-008"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-008");
    await allure.severity("critical");

    await test.step("Navigate to Contract", async () => {
      await sfPage.goto(contractUrl);
      await lightning.waitForLightningReady(sfPage);
    });

    await test.step("Generate FAB document", async () => {
      await docGen.generateDocument(
        sfPage,
        "IOH FAB Document (version 1) [DocX]",
        { downloadPdf: true, checkIn: true }
      );
    });
  });

  test("IPH-NEWFIX-009 — Move contract to Negotiation", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-009"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-009");

    await test.step("Update contract status via API", async () => {
      await sfApi.updateContractStatus(contractId, "Negotiation");
    });

    await test.step("Verify status", async () => {
      const contract = await sfApi.get("Contract", contractId, ["Status"]);
      expect(contract.Status).toBe("Negotiation");
    });
  });

  test("IPH-NEWFIX-010 — Upload signed FAB", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-010"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-010");

    await test.step("Navigate to Contract", async () => {
      await sfPage.goto(contractUrl);
      await lightning.waitForLightningReady(sfPage);
    });

    await test.step("Upload FAB document", async () => {
      await contractPage.uploadDocument(sfPage, "FAB", UPLOAD_FILE);
    });

    await test.step("Verify document in Related > Links", async () => {
      const isVisible = await contractPage.verifyDocumentInLinks(sfPage, "FAB");
      expect(isVisible).toBeTruthy();
    });
  });

  test("IPH-NEWFIX-011 — Move to Customer Assessment", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-011"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-011");

    await test.step("Update contract status via API", async () => {
      await sfApi.updateContractStatus(contractId, "Customer Assessment");
    });

    await test.step("Verify status", async () => {
      const contract = await sfApi.get("Contract", contractId, ["Status"]);
      expect(contract.Status).toBe("Customer Assessment");
    });
  });
});
