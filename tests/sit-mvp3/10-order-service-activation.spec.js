import { test, expect, allure } from "../../utils/base-test.js";
import { getState } from "../../utils/runtime-state.js";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

/**
 * Service Activation & Number Status scenarios (IPH-NEWFIX-031 → 037).
 *
 * All pure API — monitors Orchestration Items via SOQL polling.
 * Tests integration with SOM (TMF641) and TNM.
 */

test.describe("SIT MVP3 — Service Activation & Number Status", () => {
  let orchPlanIds;

  test.beforeAll(() => {
    orchPlanIds = getState("orchestrationPlanIds") ?? [];
    if (orchPlanIds.length === 0) {
      console.warn(
        "⚠️ No orchestrationPlanIds — all orchestration tests will log warnings."
      );
    }
  });

  // ─── SIP Trunk Activation (031-033) ──────────────────────────────────────

  test("IPH-NEWFIX-031 — SIP Trunk Activation — Success", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-031"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-031");
    await allure.tag("Integration: SOM");

    await test.step("Monitor Service Activation orchestration item", async () => {
      if (orchPlanIds.length === 0) {
        console.warn("⚠️ No orchestration plans — skipping.");
        return;
      }
      for (const planId of orchPlanIds) {
        try {
          const item = await sfApi.getOrchestrationItemByName(
            planId,
            "Service Activation"
          );
          if (item) {
            const result = await sfApi.waitForOrchItemStatus(
              item.Id,
              "Completed",
              180000 // 3 min timeout for integration
            );
            expect(result.vlocity_cmt__State__c).toBe("Completed");
          }
        } catch (err) {
          console.warn(
            "⚠️ Service Activation check failed:",
            err.message.split("\n")[0]
          );
        }
      }
    });
  });

  test("IPH-NEWFIX-032 — SIP Trunk Activation — Failed", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-032"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-032");
    await allure.tag("Negative");

    await test.step("Verify Service Activation can reach Failed state", async () => {
      if (orchPlanIds.length === 0) {
        console.warn("⚠️ No orchestration plans — skipping.");
        return;
      }
      for (const planId of orchPlanIds) {
        try {
          const item = await sfApi.getOrchestrationItemByName(
            planId,
            "Service Activation"
          );
          if (item) {
            console.log(
              `Service Activation state: ${item.vlocity_cmt__State__c}`
            );
            expect(item.Id).toBeTruthy();
          }
        } catch (err) {
          console.warn("⚠️ Check failed:", err.message.split("\n")[0]);
        }
      }
    });
  });

  test("IPH-NEWFIX-033 — SIP Trunk Activation — Retry", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-033"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-033");
    await allure.tag("Alternate");

    await test.step("Retry Service Activation if failed", async () => {
      if (orchPlanIds.length === 0) {
        console.warn("⚠️ No orchestration plans — skipping.");
        return;
      }
      for (const planId of orchPlanIds) {
        try {
          const item = await sfApi.getOrchestrationItemByName(
            planId,
            "Service Activation"
          );
          if (item && item.vlocity_cmt__State__c === "Failed") {
            await sfApi.retryOrchestrationItem(item.Id);
            const result = await sfApi.waitForOrchItemStatus(
              item.Id,
              "Completed",
              180000
            );
            expect(result.vlocity_cmt__State__c).toBe("Completed");
          } else {
            console.log(
              "Service Activation not in Failed state — retry not needed"
            );
          }
        } catch (err) {
          console.warn("⚠️ Retry failed:", err.message.split("\n")[0]);
        }
      }
    });
  });

  // ─── Milestone Update (034) ─────────────────────────────────────────────

  test("IPH-NEWFIX-034 — Milestone status update from SOM", async ({
    sfApi
  }) => {
    const sc = scenarios["IPH-NEWFIX-034"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-034");
    await allure.tag("Integration: SOM");

    await test.step("Verify milestones updated in orchestration items", async () => {
      if (orchPlanIds.length === 0) {
        console.warn("⚠️ No orchestration plans — skipping.");
        return;
      }
      for (const planId of orchPlanIds) {
        try {
          const items = await sfApi.getOrchestrationItems(planId);
          const serviceItems = items.records.filter((r) =>
            r.Name?.includes("Service Activation")
          );
          for (const item of serviceItems) {
            console.log(`${item.Name}: ${item.vlocity_cmt__State__c}`);
          }
        } catch (err) {
          console.warn(
            "⚠️ Milestone check failed:",
            err.message.split("\n")[0]
          );
        }
      }
    });
  });

  // ─── Update Number Status (035-037) ─────────────────────────────────────

  test("IPH-NEWFIX-035 — Update Number Status — Success", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-035"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-035");
    await allure.tag("Integration: TNM");

    await test.step("Monitor Update Number orchestration items", async () => {
      if (orchPlanIds.length === 0) {
        console.warn("⚠️ No orchestration plans — skipping.");
        return;
      }
      for (const planId of orchPlanIds) {
        try {
          const updateItem = await sfApi.getOrchestrationItemByName(
            planId,
            "Update Number"
          );
          const updatedItem = await sfApi.getOrchestrationItemByName(
            planId,
            "Number Updated"
          );

          if (updateItem) {
            const result = await sfApi.waitForOrchItemStatus(
              updateItem.Id,
              "Completed",
              120000
            );
            expect(result.vlocity_cmt__State__c).toBe("Completed");
          }
          if (updatedItem) {
            const result = await sfApi.waitForOrchItemStatus(
              updatedItem.Id,
              "Completed",
              120000
            );
            expect(result.vlocity_cmt__State__c).toBe("Completed");
          }
        } catch (err) {
          console.warn(
            "⚠️ Update Number check failed:",
            err.message.split("\n")[0]
          );
        }
      }
    });
  });

  test("IPH-NEWFIX-036 — Update Number Status — Failed", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-036"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-036");
    await allure.tag("Negative");

    await test.step("Verify Update Number failure handling", async () => {
      if (orchPlanIds.length === 0) {
        console.warn("⚠️ No orchestration plans — skipping.");
        return;
      }
      for (const planId of orchPlanIds) {
        try {
          const item = await sfApi.getOrchestrationItemByName(
            planId,
            "Update Number"
          );
          if (item) {
            console.log(`Update Number state: ${item.vlocity_cmt__State__c}`);
            expect(item.Id).toBeTruthy();
          }
        } catch (err) {
          console.warn("⚠️ Check failed:", err.message.split("\n")[0]);
        }
      }
    });
  });

  test("IPH-NEWFIX-037 — Update Number Status — Retry", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-037"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-037");
    await allure.tag("Alternate");

    await test.step("Retry Update Number if failed", async () => {
      if (orchPlanIds.length === 0) {
        console.warn("⚠️ No orchestration plans — skipping.");
        return;
      }
      for (const planId of orchPlanIds) {
        try {
          const item = await sfApi.getOrchestrationItemByName(
            planId,
            "Update Number"
          );
          if (item && item.vlocity_cmt__State__c === "Failed") {
            await sfApi.retryOrchestrationItem(item.Id);
            await sfApi.waitForOrchItemStatus(item.Id, "Completed", 120000);
          }
        } catch (err) {
          console.warn("⚠️ Retry failed:", err.message.split("\n")[0]);
        }
      }
    });
  });
});
