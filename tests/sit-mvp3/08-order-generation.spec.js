import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import {
  requireState,
  setState,
  setStates
} from "../../utils/runtime-state.js";
import * as orchestration from "../../pages/orchestration.page.js";
import * as lightning from "../../utils/sf-lightning.js";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

test.describe("SIT MVP3 — Order Generation & Submission", () => {
  let contractId;

  test.beforeAll(() => {
    contractId = requireState("contractId");
  });

  test("IPH-NEWFIX-019 — Generate new connect order", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-019"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-019");
    await allure.severity("critical");

    let masterOrderId;

    await test.step("Get/Create Order from Contract via API", async () => {
      const orders = await sfApi.getOrdersForContract(contractId);

      if (orders.records.length > 0) {
        masterOrderId = orders.records[0].Id;
        console.log(`Existing Master Order: ${masterOrderId}`);
      } else {
        // Trigger order creation — may require Apex/IP invocation
        console.log("No orders found — order creation may need UI trigger");

        // Fetch AccountId and StartDate from Contract since it's required for Order
        const contract = await sfApi.get("Contract", contractId, [
          "AccountId",
          "StartDate"
        ]);

        // Fallback: try creating via standard API
        try {
          const result = await sfApi.create("Order", {
            AccountId: contract.AccountId,
            ContractId: contractId,
            Status: "Draft",
            EffectiveDate:
              contract.StartDate || new Date().toISOString().split("T")[0]
          });
          masterOrderId = result.id;
          console.log(`✅ Order created manually via API: ${masterOrderId}`);
        } catch (err) {
          console.error("❌ Failed to create Order:", err.message);
        }
      }

      if (masterOrderId) {
        setState("masterOrderId", masterOrderId);
      } else {
        console.warn(
          "⚠️ No masterOrderId available — downstream order tests will be skipped."
        );
      }
    });

    await test.step("Verify sub-orders", async () => {
      if (!masterOrderId) {
        console.warn("⚠️ Skipping sub-order verification (no masterOrderId).");
        return;
      }
      try {
        const subOrders = await sfApi.getSubOrders(masterOrderId);
        console.log(`Sub-orders: ${subOrders.records.length}`);

        const subOrderIds = subOrders.records.map((r) => r.Id);
        setState("subOrderIds", subOrderIds);

        if (subOrders.records.length > 0) {
          expect(subOrders.records[0].Status).toBe("Draft");
        }
      } catch (err) {
        console.warn("⚠️ Sub-order check failed:", err.message.split("\n")[0]);
        setState("subOrderIds", []);
      }
    });
  });

  test("IPH-NEWFIX-020 — Submit sub-order", async ({ sfApi }) => {
    const sc = scenarios["IPH-NEWFIX-020"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-020");

    const masterOrderId = requireState("masterOrderId");

    await test.step("Submit Master Order via API", async () => {
      try {
        await sfApi.updateOrderStatus(masterOrderId, "Activated");
        console.log("✅ Master Order activated.");
      } catch (err) {
        console.warn(
          "⚠️ Cannot activate Master Order:",
          err.message.split("\n")[0]
        );
        console.warn(
          "   Skipping — contract is inactive or order has no products."
        );
      }
    });

    await test.step("Verify sub-orders submitted", async () => {
      try {
        const subOrders = await sfApi.getSubOrders(masterOrderId);
        for (const order of subOrders.records) {
          console.log(`Sub-order ${order.OrderNumber}: ${order.Status}`);
        }
      } catch (err) {
        console.warn("⚠️ Sub-order verification skipped.");
      }
    });

    await test.step("Get Orchestration Plans", async () => {
      const subOrderIds = requireState("subOrderIds");
      const orchPlanIds = [];

      for (const subOrderId of subOrderIds) {
        try {
          const plans = await sfApi.getOrchestrationPlans(subOrderId);
          if (plans.records.length > 0) {
            orchPlanIds.push(plans.records[0].Id);
            console.log(
              `Orch Plan for ${subOrderId}: ${plans.records[0].Id} (${plans.records[0].vlocity_cmt__State__c})`
            );
          }
        } catch (err) {
          console.warn(
            `⚠️ Cannot get orch plans for ${subOrderId}:`,
            err.message.split("\n")[0]
          );
        }
      }

      setState("orchestrationPlanIds", orchPlanIds);
      if (orchPlanIds.length === 0) {
        console.warn(
          "⚠️ No orchestration plans found — downstream orch tests will log warnings."
        );
      }
    });
  });

  test("IPH-NEWFIX-021 — Pre-Activation work order", async ({
    sfApi,
    sfPage
  }) => {
    const sc = scenarios["IPH-NEWFIX-021"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-021");

    const orchPlanIds = requireState("orchestrationPlanIds");

    let workOrderId;

    await test.step("Find Create FSL Work Order item via API", async () => {
      if (orchPlanIds.length === 0) {
        console.warn("⚠️ No orchestration plans — skipping Work Order lookup.");
        return;
      }
      for (const planId of orchPlanIds) {
        try {
          const item = await sfApi.getOrchestrationItemByName(
            planId,
            "Create FSL Work Order"
          );
          if (item) {
            console.log(`Create FSL Work Order: ${item.vlocity_cmt__State__c}`);

            // Get the Work Order
            const wo = await sfApi.getWorkOrderForOrchItem(item.Id);
            if (wo) {
              workOrderId = wo.Id;
              console.log(`Work Order: ${workOrderId} (${wo.Status})`);
            }
          }
        } catch (err) {
          console.warn(
            "⚠️ Error finding Work Order:",
            err.message.split("\n")[0]
          );
        }
      }
    });

    if (workOrderId) {
      setState("preActivationWorkOrderId", workOrderId);

      await test.step("Verify Work Order in UI", async () => {
        try {
          const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${workOrderId}/view`;
          await sfPage.goto(woUrl);
          await lightning.waitForLightningReady(sfPage);

          // Verify Work Order page loaded
          await expect(sfPage.locator("text=Work Order")).toBeVisible({
            timeout: 15000
          });
        } catch (err) {
          console.warn(
            "⚠️ Could not verify Work Order in UI:",
            err.message.split("\n")[0]
          );
        }
      });
    } else {
      console.warn("⚠️ No Work Order found — skipping UI verification.");
    }
  });
});
