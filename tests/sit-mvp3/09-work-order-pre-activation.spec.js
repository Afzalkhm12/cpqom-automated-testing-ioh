import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import { requireState } from "../../utils/runtime-state.js";
import * as workOrder from "../../pages/work-order.page.js";
import * as lightning from "../../utils/sf-lightning.js";
import path from "path";
import { fileURLToPath } from "url";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FILE = path.resolve(
  __dirname,
  "../../test-data/file-upload-1.doc"
);

/**
 * Work Order Pre-Activation steps (IPH-NEWFIX-022 → 030).
 *
 * Data-driven: all 9 steps follow the same pattern (verify step → complete step),
 * differing only in step type (simple, form, upload, spk, fields).
 */

const WORK_STEPS = [
  {
    id: "022",
    name: "Conduct COM with Customer",
    type: "simple"
  },
  {
    id: "023",
    name: "Assess Necessity for Site Survey",
    type: "simple"
  },
  {
    id: "024",
    name: "Sourcing Process & Upload PO",
    type: "simple"
  },
  {
    id: "025",
    name: "Obtain Survey Permit",
    type: "simple"
  },
  {
    id: "026",
    name: "Assign Outtask/Partner for Site Survey",
    type: "form",
    data: { formData: { "3rd Party": "Auto Test Partner" } }
  },
  {
    id: "027",
    name: "Conduct Site Survey",
    type: "spk"
  },
  {
    id: "028",
    name: "Upload Site Survey Result",
    type: "upload",
    data: { filePath: UPLOAD_FILE, testWithoutFile: true }
  },
  {
    id: "029",
    name: "Input Additional Technical Requirements",
    type: "fields",
    data: {
      fields: {
        "IP Address": "192.168.1.100",
        VLAN: "100",
        "AS Number": "65001"
      }
    }
  },
  {
    id: "030",
    name: "Customer Preparation",
    type: "simple"
  }
];

test.describe("SIT MVP3 — Work Order Pre-Activation", () => {
  let workOrderUrl;

  test.beforeAll(() => {
    const workOrderId = requireState(
      "preActivationWorkOrderId",
      "Run 08-order-generation.spec.js first"
    );
    workOrderUrl = `${LIGHTNING_URL}/lightning/r/WorkOrder/${workOrderId}/view`;
  });

  for (const step of WORK_STEPS) {
    test(`IPH-NEWFIX-${step.id} — ${step.name}`, async ({ sfPage }) => {
      const sc = scenarios[`IPH-NEWFIX-${step.id}`];
      await allure.epic(sc.epic);
      await allure.feature(sc.scenario);
      await allure.story(`IPH-NEWFIX-${step.id}`);

      await test.step("Navigate to Work Order", async () => {
        await sfPage.goto(workOrderUrl);
        await lightning.waitForLightningReady(sfPage);
      });

      await test.step(`Verify "${step.name}" is available`, async () => {
        const exists = await workOrder.verifyWorkPlanStepExists(
          sfPage,
          step.name
        );
        expect(exists).toBeTruthy();
      });

      await test.step(`Complete step: ${step.name}`, async () => {
        await workOrder.completeWorkStep(
          sfPage,
          step.name,
          step.type,
          step.data ?? {}
        );
      });
    });
  }
});
