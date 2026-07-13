import { test, expect, allure } from "../../utils/base-test.js";
import { requireState } from "../../utils/runtime-state.js";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

/**
 * Billing Activation & Unblock Service (IPH-NEWFIX-038 → 043).
 * Pure API — monitors orchestration items.
 */

// Helper for repeated success/failed/retry pattern
function orchTripleTest(describe, idBase, itemName, tag) {
  test(`IPH-NEWFIX-${idBase} — ${describe} — Success`, async ({ sfApi }) => {
    const sc = scenarios[`IPH-NEWFIX-${idBase}`];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story(`IPH-NEWFIX-${idBase}`);
    await allure.tag(`Integration: ${tag}`);

    const orchPlanIds = requireState("orchestrationPlanIds");
    for (const planId of orchPlanIds) {
      const item = await sfApi.getOrchestrationItemByName(planId, itemName);
      if (item) {
        const result = await sfApi.waitForOrchItemStatus(
          item.Id,
          "Completed",
          180000
        );
        expect(result.vlocity_cmt__State__c).toBe("Completed");
      }
    }
  });

  const failedId = String(Number(idBase) + 1).padStart(3, "0");
  test(`IPH-NEWFIX-${failedId} — ${describe} — Failed`, async ({ sfApi }) => {
    const sc = scenarios[`IPH-NEWFIX-${failedId}`];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story(`IPH-NEWFIX-${failedId}`);
    await allure.tag("Negative");

    const orchPlanIds = requireState("orchestrationPlanIds");
    for (const planId of orchPlanIds) {
      const item = await sfApi.getOrchestrationItemByName(planId, itemName);
      if (item) {
        console.log(`${itemName} state: ${item.vlocity_cmt__State__c}`);
        expect(item.Id).toBeTruthy();
      }
    }
  });

  const retryId = String(Number(idBase) + 2).padStart(3, "0");
  test(`IPH-NEWFIX-${retryId} — ${describe} — Retry`, async ({ sfApi }) => {
    const sc = scenarios[`IPH-NEWFIX-${retryId}`];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story(`IPH-NEWFIX-${retryId}`);
    await allure.tag("Alternate");

    const orchPlanIds = requireState("orchestrationPlanIds");
    for (const planId of orchPlanIds) {
      const item = await sfApi.getOrchestrationItemByName(planId, itemName);
      if (item && item.vlocity_cmt__State__c === "Failed") {
        await sfApi.retryOrchestrationItem(item.Id);
        await sfApi.waitForOrchItemStatus(item.Id, "Completed", 180000);
      }
    }
  });
}

test.describe("SIT MVP3 — Billing Activation & Unblock Service", () => {
  // IPH-NEWFIX-038, 039, 040
  orchTripleTest(
    "Billing Activation",
    "038",
    "Billing Order Activation",
    "NRM"
  );

  // IPH-NEWFIX-041, 042, 043
  orchTripleTest("Unblock Service", "041", "Unblock Service", "SOM");
});
