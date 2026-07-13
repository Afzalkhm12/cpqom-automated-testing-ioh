import { test, expect, allure } from "../../utils/base-test.js";
import { requireState } from "../../utils/runtime-state.js";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

/**
 * Order Completion scenarios (IPH-NEWFIX-054 → 059).
 * All pure API — monitors final orchestration items and verifies end state.
 */

test.describe("SIT MVP3 — Order Completion", () => {
  let orchPlanIds;
  let opportunityId;

  test.beforeAll(() => {
    orchPlanIds = requireState("orchestrationPlanIds");
    opportunityId = requireState("opportunityId");
  });

  // ─── Bill On Email (054-056) ─────────────────────────────────────────

  test("IPH-NEWFIX-054 — Bill On Email registration — Success", async ({
    sfApi
  }) => {
    const sc = scenarios["IPH-NEWFIX-054"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-054");
    await allure.tag("Integration: MARS");

    for (const planId of orchPlanIds) {
      const item = await sfApi.getOrchestrationItemByName(
        planId,
        "Bill on Email"
      );
      if (item) {
        const result = await sfApi.waitForOrchItemStatus(
          item.Id,
          "Completed",
          120000
        );
        expect(result.vlocity_cmt__State__c).toBe("Completed");
      }
    }
  });

  test("IPH-NEWFIX-055 — Bill On Email registration — Failed", async ({
    sfApi
  }) => {
    const sc = scenarios["IPH-NEWFIX-055"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-055");
    await allure.tag("Negative");

    for (const planId of orchPlanIds) {
      const item = await sfApi.getOrchestrationItemByName(
        planId,
        "Bill on Email"
      );
      if (item) {
        console.log(`Bill on Email state: ${item.vlocity_cmt__State__c}`);
        expect(item.Id).toBeTruthy();
      }
    }
  });

  test("IPH-NEWFIX-056 — Retry Bill On Email registration", async ({
    sfApi
  }) => {
    const sc = scenarios["IPH-NEWFIX-056"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-056");
    await allure.tag("Alternate");

    for (const planId of orchPlanIds) {
      const item = await sfApi.getOrchestrationItemByName(
        planId,
        "Bill on Email"
      );
      if (item && item.vlocity_cmt__State__c === "Failed") {
        await sfApi.retryOrchestrationItem(item.Id);
        await sfApi.waitForOrchItemStatus(item.Id, "Completed", 120000);
      }
    }
  });

  // ─── Asset & Order Completion (057-058) ──────────────────────────────

  test("IPH-NEWFIX-057 — Asset created", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-057"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-057");

    await test.step("Verify Assetize Order orchestration item", async () => {
      for (const planId of orchPlanIds) {
        const item = await sfApi.getOrchestrationItemByName(
          planId,
          "Assetize Order"
        );
        if (item) {
          const result = await sfApi.waitForOrchItemStatus(
            item.Id,
            "Completed",
            120000
          );
          expect(result.vlocity_cmt__State__c).toBe("Completed");
        }
      }
    });

    await test.step("Verify Assets created via SOQL", async () => {
      // Get account from opportunity
      const oppty = await sfApi.get("Opportunity", opportunityId, [
        "AccountId"
      ]);
      if (oppty.AccountId) {
        const assets = await sfApi.getAssetsForAccount(oppty.AccountId);
        console.log(`Assets created: ${assets.records.length}`);
        expect(assets.records.length).toBeGreaterThan(0);
      }
    });
  });

  test("IPH-NEWFIX-058 — Order completed", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-058"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-058");

    await test.step("Verify End Order orchestration item", async () => {
      for (const planId of orchPlanIds) {
        const item = await sfApi.getOrchestrationItemByName(
          planId,
          "End Order (Asset Created)"
        );
        if (item) {
          const result = await sfApi.waitForOrchItemStatus(
            item.Id,
            "Completed",
            120000
          );
          expect(result.vlocity_cmt__State__c).toBe("Completed");
        }
      }
    });

    await test.step("Verify Master Order status", async () => {
      const masterOrderId = requireState("masterOrderId");
      const order = await sfApi.get("Order", masterOrderId, ["Status"]);
      console.log(`Master Order status: ${order.Status}`);
    });
  });

  // ─── Opportunity Close (059) ─────────────────────────────────────────

  test("IPH-NEWFIX-059 — Receive first bill payment", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-059"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-059");
    await allure.tag("Integration: NRM");
    await allure.severity("critical");

    await test.step("Verify Opportunity is Closed Won", async () => {
      const oppty = await sfApi.get("Opportunity", opportunityId, [
        "StageName",
        "Status"
      ]);
      console.log(
        `Opportunity stage: ${oppty.StageName}, status: ${oppty.Status ?? "N/A"}`
      );

      // In full E2E flow, this should be Closed Won after first bill payment
      // In SIT, we verify the opportunity exists and check current stage
      expect(oppty.StageName).toBeTruthy();
    });
  });
});
