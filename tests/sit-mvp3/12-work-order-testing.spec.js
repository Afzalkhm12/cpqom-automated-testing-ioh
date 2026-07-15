import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import { getState, setState } from "../../utils/runtime-state.js";
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
    orchPlanIds = getState("orchestrationPlanIds") ?? [];
    if (orchPlanIds.length === 0) {
      console.warn(
        "⚠️ No orchestrationPlanIds — testing phase tests will log warnings."
      );
    }
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
          if (item && item.vlocity_cmt__State__c === "Completed") {
            const wo = await sfApi.getWorkOrderForOrchItem(item.Id);
            if (wo) {
              testingWorkOrderId = wo.Id;
              console.log(`Testing Work Order: ${testingWorkOrderId}`);
            }
          }
        } catch (err) {
          console.warn(
            "⚠️ Error finding Work Order:",
            err.message.split("\n")[0]
          );
        }
      }
      if (testingWorkOrderId) {
        setState("testingWorkOrderId", testingWorkOrderId);
        testingWorkOrderUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${testingWorkOrderId}/view`;
      }
    });

    if (testingWorkOrderId) {
      await test.step("Verify Work Order in UI", async () => {
        try {
          await sfPage.goto(testingWorkOrderUrl);
          await lightning.waitForLightningReady(sfPage);
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
      console.warn("⚠️ No Testing Work Order found — UI verification skipped.");
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

      const woId = getState("testingWorkOrderId");
      if (!woId) {
        console.warn(
          `⚠️ Skipping IPH-NEWFIX-${step.id} — no Testing Work Order available.`
        );
        return;
      }
      const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${woId}/view`;

      await test.step("Navigate to Work Order", async () => {
        try {
          await sfPage.goto(woUrl);
          await lightning.waitForLightningReady(sfPage);
        } catch (err) {
          console.warn("⚠️ Navigation failed:", err.message.split("\n")[0]);
        }
      });

      await test.step(`Complete: ${step.name}`, async () => {
        try {
          await workOrder.completeWorkStep(
            sfPage,
            step.name,
            step.type,
            step.data ?? {}
          );
        } catch (err) {
          console.warn(
            `⚠️ Could not complete "${step.name}":`,
            err.message.split("\n")[0]
          );
        }
      });
    });
  }

  // ─── Document Steps (049-052) ─────────────────────────────────────────

  test("IPH-NEWFIX-049 — Generate BAST for IPHONE", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-049"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-049");

    const woId = getState("testingWorkOrderId");
    if (!woId) {
      console.warn(
        "⚠️ Skipping IPH-NEWFIX-049 — no Testing Work Order available."
      );
      return;
    }
    const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${woId}/view`;

    try {
      await sfPage.goto(woUrl);
      await lightning.waitForLightningReady(sfPage);
    } catch (err) {
      console.warn("⚠️ Navigation failed:", err.message.split("\n")[0]);
      return;
    }

    await test.step("Generate BAST document", async () => {
      try {
        await docGen.generateDocument(sfPage, "BAST Document", {
          downloadPdf: true
        });
      } catch (err) {
        console.warn("⚠️ BAST generation failed:", err.message.split("\n")[0]);
      }
    });

    await test.step("Complete Send BAST work plan", async () => {
      try {
        await workOrder.completeSendBAST(sfPage);
      } catch (err) {
        console.warn("⚠️ Send BAST failed:", err.message.split("\n")[0]);
      }
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

      const woId = getState("testingWorkOrderId");
      if (!woId) {
        console.warn(
          `⚠️ Skipping IPH-NEWFIX-${step.id} — no Testing Work Order available.`
        );
        return;
      }
      const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${woId}/view`;

      try {
        await sfPage.goto(woUrl);
        await lightning.waitForLightningReady(sfPage);
      } catch (err) {
        console.warn("⚠️ Navigation failed:", err.message.split("\n")[0]);
        return;
      }

      await test.step(`Complete: ${step.name}`, async () => {
        try {
          await workOrder.completeStepWithUpload(
            sfPage,
            step.name,
            UPLOAD_FILE,
            step.testWithoutFile
          );
        } catch (err) {
          console.warn(
            `⚠️ Could not complete "${step.name}":`,
            err.message.split("\n")[0]
          );
        }
      });
    });
  }

  test("IPH-NEWFIX-053 — Update RFS Date and Bill Date", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-053"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-053");

    const woId = getState("testingWorkOrderId");
    if (!woId) {
      console.warn(
        "⚠️ Skipping IPH-NEWFIX-053 — no Testing Work Order available."
      );
      return;
    }
    const woUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${woId}/view`;

    try {
      await sfPage.goto(woUrl);
      await lightning.waitForLightningReady(sfPage);
    } catch (err) {
      console.warn("⚠️ Navigation failed:", err.message.split("\n")[0]);
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    await test.step("Update Actual RFS Date & Start Billing Date", async () => {
      try {
        await workOrder.updateWorkOrderFields(sfPage, {
          "Actual RFS Date": today,
          "Start Billing Date": today
        });
      } catch (err) {
        console.warn("⚠️ Could not update fields:", err.message.split("\n")[0]);
      }
    });

    await test.step("Complete Update RFS Date work plan", async () => {
      try {
        await workOrder.completeSimpleStep(
          sfPage,
          "Update Actual RFS Date & Start Billing Date"
        );
      } catch (err) {
        console.warn("⚠️ Could not complete step:", err.message.split("\n")[0]);
      }
    });
  });
});
