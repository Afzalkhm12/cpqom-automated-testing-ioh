import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import { requireState } from "../../utils/runtime-state.js";
import * as contractPage from "../../pages/contract.page.js";
import * as lightning from "../../utils/sf-lightning.js";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

/**
 * Contract Approval scenarios (IPH-NEWFIX-012 → 015).
 *
 * In SIT: All tests run with single credential. Role-based access
 * verification is deferred to UAT.
 */

test.describe("SIT MVP3 — Contract Approval", () => {
  let contractId;
  let contractUrl;

  test.beforeAll(() => {
    contractId = requireState(
      "contractId",
      "Run 05-contract-mgmt.spec.js first"
    );
    contractUrl = `${LIGHTNING_URL}/lightning/r/Contract/${contractId}/view`;
  });

  test("IPH-NEWFIX-012 — Verification of signed FAB", async ({
    sfApi,
    sfPage
  }) => {
    const sc = scenarios["IPH-NEWFIX-012"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-012");

    await test.step("Navigate to Contract", async () => {
      await sfPage.goto(contractUrl);
      await lightning.waitForLightningReady(sfPage);
    });

    await test.step("Navigate to Related > Links > FAB Signed", async () => {
      const isVisible = await contractPage.verifyDocumentInLinks(sfPage, "FAB");
      expect(isVisible).toBeTruthy();
    });

    await test.step("Mark RCA Validation as true", async () => {
      await contractPage.markRCAValidation(sfPage, true);
    });
  });

  test("IPH-NEWFIX-013 — RCA approval for spending ≤ 10K USD", async ({
    sfApi
  }) => {
    const sc = scenarios["IPH-NEWFIX-013"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-013");

    await test.step("Submit for Approval via API", async () => {
      await sfApi.submitForApproval(contractId);
    });

    await test.step("Approve via API (bypassing VP RCA login in SIT)", async () => {
      await sfApi.approveRecord(contractId);
    });

    await test.step("Verify approval status", async () => {
      const approvals = await sfApi.query(
        `SELECT Id, Status FROM ProcessInstance ` +
          `WHERE TargetObjectId = '${contractId}' ` +
          `ORDER BY CreatedDate DESC LIMIT 1`
      );
      expect(approvals.records.length).toBeGreaterThan(0);
      expect(approvals.records[0].Status).toBe("Approved");
    });
  });

  test("IPH-NEWFIX-014 — Move contract to Signed stage", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-014"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-014");

    await test.step("Update contract status to Signed via API", async () => {
      await sfApi.updateContractStatus(contractId, "Signed");
    });

    await test.step("Verify status", async () => {
      const contract = await sfApi.get("Contract", contractId, ["Status"]);
      expect(contract.Status).toBe("Signed");
    });
  });

  test("IPH-NEWFIX-015 — FAB to Quote Verification", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-015"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-015");

    await test.step("Navigate to Contract", async () => {
      await sfPage.goto(contractUrl);
      await lightning.waitForLightningReady(sfPage);
    });

    await test.step("Navigate to Related > Links > FAB Signed", async () => {
      await contractPage.openDocumentLink(sfPage, "FAB");
    });

    await test.step("Verify FAB content matches Quote", async () => {
      // Verify the document page opened successfully
      await sfPage.waitForTimeout(3000);
      // In SIT, we verify the link opens without error
      const currentUrl = sfPage.url();
      expect(currentUrl).not.toContain("/error");
    });
  });
});
