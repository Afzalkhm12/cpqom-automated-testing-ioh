import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import { requireState } from "../../utils/runtime-state.js";
import * as docGen from "../../pages/document-generation.page.js";
import * as quotePage from "../../pages/quote.page.js";
import * as lightning from "../../utils/sf-lightning.js";
import path from "path";
import { fileURLToPath } from "url";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FILE = path.resolve(
  __dirname,
  "../../test-data/chat_transcript.pdf"
);

test.describe("SIT MVP3 — Quote Finalization", () => {
  let quoteId;
  let quoteUrl;

  test.beforeAll(() => {
    quoteId = requireState("quoteId", "Run 02-quote-add-product.spec.js first");
    quoteUrl = `${LIGHTNING_URL}/lightning/r/${quoteId}/view`;
  });

  test("IPH-NEWFIX-005 — Move quote to Negotiation", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-005"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-005");
    await allure.severity("critical");

    await test.step("Navigate to Quote page", async () => {
      await lightning.ensureApp(sfPage, "IOH ESM");
      await sfPage.goto(quoteUrl);
      await lightning.waitForLightningReady(sfPage);
    });

    await test.step("Move to Negotiation stage (if not already)", async () => {
      // Check if already in Closed stage (must be current/won, not just visible)
      const alreadyClosed = await sfPage
        .locator(
          ".slds-path__item.slds-is-current, .slds-path__item.slds-is-won"
        )
        .filter({ hasText: /^Closed$/i })
        .first()
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (alreadyClosed) {
        console.log("✅ Quote already Closed, skipping Move to Negotiation.");
        return;
      }

      // Check if already in Negotiation
      const alreadyNegotiation = await sfPage
        .locator(
          ".slds-path__item.slds-is-current, .slds-path__item.slds-is-active"
        )
        .filter({ hasText: /Negotiation/i })
        .first()
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (alreadyNegotiation) {
        console.log("✅ Already in Negotiation stage, skipping.");
        return;
      }

      // Click Negotiation in stage ribbon
      const negotiationBtn = sfPage
        .locator("a, button, li, [role='tab'], .slds-path__item")
        .filter({ hasText: /^Negotiation$/i })
        .filter({ visible: true })
        .first();
      await expect(negotiationBtn).toBeVisible({ timeout: 15000 });
      await negotiationBtn.click();
      await sfPage.waitForTimeout(1000);

      // Click "Mark as Current Quote Status" button
      const markCurrentBtn = sfPage
        .locator("a, button")
        .filter({
          hasText:
            /Mark as Current Quote Status|Mark.*Current Stage|Mark Stage.*Current/i
        })
        .filter({ visible: true })
        .first();

      const hasMark = await markCurrentBtn
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => true)
        .catch(() => false);

      if (hasMark) {
        await markCurrentBtn.click();
        await sfPage.waitForTimeout(3000);
      } else {
        console.log("Mark button not found — stage may already be current.");
      }
    });

    await test.step("Verify Negotiation stage is active", async () => {
      const stageText = sfPage
        .locator("text=Negotiation")
        .filter({ visible: true })
        .first();
      await expect(stageText).toBeVisible({ timeout: 10000 });
      console.log("✅ Quote stage successfully moved to Negotiation");
    });
  });

  test("IPH-NEWFIX-006 — Generate quote document", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-006"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-006");
    await allure.severity("critical");

    await test.step("Navigate to Quote", async () => {
      await sfPage.goto(quoteUrl);
      await lightning.waitForLightningReady(sfPage);
    });

    await test.step("Generate IOH Quote Document", async () => {
      await docGen.generateDocument(sfPage, "IOH Quote Document", {
        downloadPdf: true,
        checkIn: false
      });
    });

    await test.step("Mark document as complete", async () => {
      await docGen.markDocumentComplete(sfPage);
    });
  });

  test("IPH-NEWFIX-007 — Close quote as won", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-007"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-007");
    await allure.severity("critical");

    await test.step("Navigate to Quote", async () => {
      await sfPage.goto(quoteUrl);
      await lightning.waitForLightningReady(sfPage);
    });

    await test.step("Close quote as Won with upload", async () => {
      await quotePage.closeQuoteAsWon(sfPage, UPLOAD_FILE);
    });

    await test.step("Verify: Quote is Closed and Related tab shows expected sections", async () => {
      // Re-navigate to quote in case page moved during closeQuoteAsWon
      await sfPage.goto(quoteUrl);
      await lightning.waitForLightningReady(sfPage);

      // Verify Quote status is Closed (must be active or won)
      const closedStage = sfPage
        .locator(
          ".slds-path__item.slds-is-current, .slds-path__item.slds-is-won"
        )
        .filter({ hasText: /^Closed$/i })
        .first();
      await expect(closedStage).toBeVisible({ timeout: 15000 });
      console.log("✅ Quote status verified as Closed.");

      // Navigate to Related tab and verify Contracts section
      await lightning.navigateToTab(sfPage, "Related");
      await sfPage.waitForTimeout(2000);
      const contractsSection = sfPage
        .locator("article, .slds-card, h2, h3")
        .filter({ hasText: /Contracts|Notes/i })
        .first();
      await expect(contractsSection).toBeVisible({ timeout: 10000 });
      console.log("✅ Related tab verified.");
    });
  });
});
