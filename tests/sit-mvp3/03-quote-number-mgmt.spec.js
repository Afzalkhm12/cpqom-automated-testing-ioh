import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import { requireState } from "../../utils/runtime-state.js";
import * as numberMgmt from "../../pages/number-management.page.js";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

test.describe("SIT MVP3 — Quote: Number Management", () => {
  let quoteUrl;

  test.beforeAll(() => {
    const quoteId = requireState(
      "quoteId",
      "Run 02-quote-add-product.spec.js first"
    );
    quoteUrl = `${LIGHTNING_URL}/lightning/r/${quoteId}/view`;
  });

  test("IPH-NEWFIX-003 — No available fixed number", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-003"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-003");
    await allure.severity("normal");
    await allure.tag("Negative");

    await test.step("Navigate to Enterprise Quote", async () => {
      await sfPage.goto(quoteUrl);
      await sfPage.waitForLoadState("domcontentloaded");
      await sfPage.waitForTimeout(3000);

      const configureBtn = sfPage.getByRole("button", {
        name: /Configure Enterprise Quote/i
      });
      if (await configureBtn.isVisible().catch(() => false)) {
        await configureBtn.click();
        await sfPage.waitForURL("**/vlocity_cmt__EnterpriseSalesApp**", {
          timeout: 30000
        });
        await sfPage.waitForTimeout(5000); // wait for Cart to load fully
      }
    });

    await test.step("Open Number Management", async () => {
      await numberMgmt.openNumberManagement(sfPage);
    });

    await test.step("Select IPHONE product", async () => {
      await numberMgmt.selectProduct(sfPage, "IPHONE");
    });

    await test.step("Search with invalid prefix — verify no numbers", async () => {
      await numberMgmt.verifyNoNumberAvailable(sfPage, "00000");
    });
  });

  test("IPH-NEWFIX-004 — Reserve fixed number", async ({ sfPage }) => {
    const sc = scenarios["IPH-NEWFIX-004"];
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-004");
    await allure.severity("critical");

    await test.step("Navigate to Enterprise Quote", async () => {
      await sfPage.goto(quoteUrl);
      await sfPage.waitForLoadState("domcontentloaded");
      await sfPage.waitForTimeout(3000);

      const configureBtn = sfPage.getByRole("button", {
        name: /Configure Enterprise Quote/i
      });
      if (await configureBtn.isVisible().catch(() => false)) {
        await configureBtn.click();
        await sfPage.waitForURL("**/vlocity_cmt__EnterpriseSalesApp**", {
          timeout: 30000
        });
        await sfPage.waitForTimeout(5000); // wait for Cart to load fully
      }
    });

    await test.step("Open Number Management", async () => {
      await numberMgmt.openNumberManagement(sfPage);
    });

    await test.step("Select IPHONE product", async () => {
      await numberMgmt.selectProduct(sfPage, "IPHONE");
    });

    await test.step("Search and reserve number", async () => {
      const numbers = await numberMgmt.reserveNumber(sfPage, "62858");
      expect(numbers.length).toBeGreaterThan(0);
      console.log(`Available numbers: ${numbers.length}`);
    });

    await test.step("Select first number and confirm", async () => {
      await numberMgmt.selectNumber(sfPage, 0);
      await numberMgmt.confirmReservation(sfPage);
    });
  });
});
