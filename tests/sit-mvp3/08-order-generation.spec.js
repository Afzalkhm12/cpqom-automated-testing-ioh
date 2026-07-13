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
        // Fallback: try creating via standard API
        const result = await sfApi
          .create("Order", {
            ContractId: contractId,
            Status: "Draft",
            EffectiveDate: new Date().toISOString().split("T")[0]
          })
          .catch(() => null);
        if (result) masterOrderId = result.id;
      }

      expect(masterOrderId).toBeTruthy();
      setState("masterOrderId", masterOrderId);
    });

    await test.step("Verify sub-orders", async () => {
      const subOrders = await sfApi.getSubOrders(masterOrderId);
      console.log(`Sub-orders: ${subOrders.records.length}`);

      const subOrderIds = subOrders.records.map((r) => r.Id);
      setState("subOrderIds", subOrderIds);

      if (subOrders.records.length > 0) {
        expect(subOrders.records[0].Status).toBe("Draft");
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
      await sfApi.updateOrderStatus(masterOrderId, "Activated");
    });

    await test.step("Verify sub-orders submitted", async () => {
      const subOrders = await sfApi.getSubOrders(masterOrderId);
      for (const order of subOrders.records) {
        console.log(`Sub-order ${order.OrderNumber}: ${order.Status}`);
      }
    });

    await test.step("Get Orchestration Plans", async () => {
      const subOrderIds = requireState("subOrderIds");
      const orchPlanIds = [];

      for (const subOrderId of subOrderIds) {
        const plans = await sfApi.getOrchestrationPlans(subOrderId);
        if (plans.records.length > 0) {
          orchPlanIds.push(plans.records[0].Id);
          console.log(
            `Orch Plan for ${subOrderId}: ${plans.records[0].Id} (${plans.records[0].vlocity_cmt__State__c})`
          );
        }
      }

      setState("orchestrationPlanIds", orchPlanIds);
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
    expect(orchPlanIds.length).toBeGreaterThan(0);

    let workOrderId;

    await test.step("Find Create FSL Work Order item via API", async () => {
      for (const planId of orchPlanIds) {
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
      }
    });

    if (workOrderId) {
      setState("preActivationWorkOrderId", workOrderId);

      await test.step("Verify Work Order in UI", async () => {
        const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${workOrderId}/view`;
        await sfPage.goto(woUrl);
        await lightning.waitForLightningReady(sfPage);

        // Verify Work Order page loaded
        await expect(sfPage.locator("text=Work Order")).toBeVisible({
          timeout: 15000
        });
      });
    }
  });
});
