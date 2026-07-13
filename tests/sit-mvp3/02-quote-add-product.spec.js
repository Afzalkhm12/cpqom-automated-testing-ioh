import { test, expect, allure } from "../../utils/base-test.js";
import { requireState, setState, getState } from "../../utils/runtime-state.js";
import * as quotePage from "../../pages/quote.page.js";
import * as lightning from "../../utils/sf-lightning.js";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

const sc = scenarios["IPH-NEWFIX-002"];

const PRODUCTS = ["DIOD", "IPHONE"];

test.describe("SIT MVP3 — Quote: Add Product", () => {
  let opportunityUrl;
  let activePage;
  let quoteUrl;

  test.beforeAll(() => {
    opportunityUrl = requireState(
      "opportunityUrl",
      "Run 01-opportunity-mgmt.spec.js first"
    );
    quoteUrl = getState("quoteUrl");
  });

  test("IPH-NEWFIX-002a — Create Enterprise Quote", async ({ sfPage }) => {
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-002 — Create Quote");
    await allure.severity("critical");

    if (quoteUrl) {
      console.log("Quote already created, reusing:", quoteUrl);
      activePage = sfPage;
    } else {
      await lightning.ensureApp(sfPage, "IOH ESM");
      activePage = await quotePage.createEnterpriseQuote(
        sfPage,
        opportunityUrl
      );
      quoteUrl = activePage.url();
      setState("quoteUrl", quoteUrl);
    }
    expect(activePage).toBeTruthy();
  });

  for (const product of PRODUCTS) {
    test(`IPH-NEWFIX-002 — Add ${product} to Quote`, async ({ sfPage }) => {
      await allure.epic(sc.epic);
      await allure.feature(sc.scenario);
      await allure.story(`IPH-NEWFIX-002 — Add ${product}`);

      await test.step(`Navigate to Quote`, async () => {
        if (!quoteUrl)
          throw new Error("quoteUrl is missing. Create Quote failed?");
        await lightning.ensureApp(sfPage, "IOH ESM");
        await sfPage.goto(quoteUrl);
        await lightning.waitForLightningReady(sfPage);
        activePage = sfPage;
      });

      await test.step(`Add ${product} from catalog`, async () => {
        const catalogPage = await quotePage.addProductFromCatalog(
          activePage,
          "Communication & Collaboration",
          product
        );
        expect(catalogPage).toBeTruthy();
      });

      await test.step("Add to Configuration Cart", async () => {
        await quotePage.addToConfigurationCart(activePage);
      });

      await test.step("Configure product", async () => {
        // Configure based on scenario — default config for now
        await quotePage.configureProduct(activePage);
      });
    });
  }

  test("Save Quote ID to state", async ({ sfApi }) => {
    const opportunityId = requireState("opportunityId");
    const quotes = await sfApi.getQuotesForOpportunity(opportunityId);

    if (quotes.records.length > 0) {
      const quoteId = quotes.records[0].Id;
      setState("quoteId", quoteId);
      console.log(`Quote ID saved: ${quoteId}`);
    }
  });
});
