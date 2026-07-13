import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import { requireState, setState } from "../../utils/runtime-state.js";
import * as workOrder from "../../pages/work-order.page.js";
import * as docGen from "../../pages/document-generation.page.js";
import * as lightning from "../../utils/sf-lightning.js";
import path from "path";
import { fileURLToPath } from "url";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FILE = path.resolve(
  __dirname,
  "../../test-data/file-upload-1.doc"
);

test.describe("SIT MVP3 — Work Order Testing Phase", () => {
  let orchPlanIds;
  let testingWorkOrderUrl;

  test.beforeAll(() => {
    orchPlanIds = requireState("orchestrationPlanIds");
  });

  test("IPH-NEWFIX-044 — Testing work order verification", async ({
    sfApi,
    sfPage
  }) => {
    const sc = scenarios["IPH-NEWFIX-044"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-044");

    let testingWorkOrderId;

    await test.step("Find Testing Work Order via API", async () => {
      for (const planId of orchPlanIds) {
        const item = await sfApi.getOrchestrationItemByName(
          planId,
          "Create FSL Work Order"
        );
        if (item && item.vlocity_cmt__State__c === "Completed") {
          const wo = await sfApi.getWorkOrderForOrchItem(item.Id);
          if (wo) {
            testingWorkOrderId = wo.Id;
            console.log(`Testing Work Order: ${testingWorkOrderId}`);
          }
        }
      }
      if (testingWorkOrderId) {
        setState("testingWorkOrderId", testingWorkOrderId);
        testingWorkOrderUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${testingWorkOrderId}/view`;
      }
    });

    if (testingWorkOrderId) {
      await test.step("Verify Work Order in UI", async () => {
        await sfPage.goto(testingWorkOrderUrl);
        await lightning.waitForLightningReady(sfPage);
        await expect(sfPage.locator("text=Work Order")).toBeVisible({
          timeout: 15000
        });
      });
    }
  });

  // ─── Testing Work Plan Steps (045-052) ────────────────────────────────

  const TESTING_STEPS = [
    {
      id: "045",
      name: "Assign Outtask/Partner for Installation",
      type: "form",
      data: { formData: { "3rd Party": "Auto Test Partner" } }
    },
    {
      id: "046",
      name: "Conduct Installation",
      type: "spk"
    },
    {
      id: "047",
      name: "Conduct Internal Testing",
      type: "simple"
    },
    {
      id: "048",
      name: "Integration to CPE",
      type: "simple"
    }
  ];

  for (const step of TESTING_STEPS) {
    test(`IPH-NEWFIX-${step.id} — ${step.name}`, async ({ sfPage }) => {
      const sc = scenarios[`IPH-NEWFIX-${step.id}`];
      await allure.epic(sc.epic);
      await allure.feature(sc.scenario);
      await allure.story(`IPH-NEWFIX-${step.id}`);

      const woId = requireState("testingWorkOrderId");
      const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${woId}/view`;

      await test.step("Navigate to Work Order", async () => {
        await sfPage.goto(woUrl);
        await lightning.waitForLightningReady(sfPage);
      });

      await test.step(`Complete: ${step.name}`, async () => {
        await workOrder.completeWorkStep(
          sfPage,
          step.name,
          step.type,
          step.data ?? {}
        );
      });
    });
  }

  // ─── Document Steps (049-052) ─────────────────────────────────────────

  test("IPH-NEWFIX-049 — Generate BAST for IPHONE", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-049"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-049");

    const woId = requireState("testingWorkOrderId");
    const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${woId}/view`;

    await sfPage.goto(woUrl);
    await lightning.waitForLightningReady(sfPage);

    await test.step("Generate BAST document", async () => {
      await docGen.generateDocument(sfPage, "BAST Document", {
        downloadPdf: true
      });
    });

    await test.step("Complete Send BAST work plan", async () => {
      await workOrder.completeSendBAST(sfPage);
    });
  });

  const UPLOAD_STEPS = [
    {
      id: "050",
      name: "Upload LLD",
      testWithoutFile: true
    },
    {
      id: "051",
      name: "Upload Signed BAST",
      testWithoutFile: true
    },
    {
      id: "052",
      name: "Upload Installation Report",
      testWithoutFile: true
    }
  ];

  for (const step of UPLOAD_STEPS) {
    test(`IPH-NEWFIX-${step.id} — ${step.name} for IPHONE`, async ({
      sfPage
    }) => {
      const sc = scenarios[`IPH-NEWFIX-${step.id}`];
      await allure.epic(sc.epic);
      await allure.feature(sc.scenario);
      await allure.story(`IPH-NEWFIX-${step.id}`);

      const woId = requireState("testingWorkOrderId");
      const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${woId}/view`;

      await sfPage.goto(woUrl);
      await lightning.waitForLightningReady(sfPage);

      await test.step(`Complete: ${step.name}`, async () => {
        await workOrder.completeStepWithUpload(
          sfPage,
          step.name,
          UPLOAD_FILE,
          step.testWithoutFile
        );
      });
    });
  }

  test("IPH-NEWFIX-053 — Update RFS Date and Bill Date", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-053"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-053");

    const woId = requireState("testingWorkOrderId");
    const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${woId}/view`;

    await sfPage.goto(woUrl);
    await lightning.waitForLightningReady(sfPage);

    const today = new Date().toISOString().split("T")[0];

    await test.step("Update Actual RFS Date & Start Billing Date", async () => {
      await workOrder.updateWorkOrderFields(sfPage, {
        "Actual RFS Date": today,
        "Start Billing Date": today
      });
    });

    await test.step("Complete Update RFS Date work plan", async () => {
      await workOrder.completeSimpleStep(
        sfPage,
        "Update Actual RFS Date & Start Billing Date"
      );
    });
  });
});
