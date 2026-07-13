import { test, expect, allure, LIGHTNING_URL } from "../../utils/base-test.js";
import { setState, getState } from "../../utils/runtime-state.js";
import scenarios from "../../test-data/sit-mvp3/scenarios.json" with { type: "json" };

const sc = scenarios["IPH-NEWFIX-001"];

test.describe("SIT MVP3 — Opportunity Management", () => {
  test(`IPH-NEWFIX-001 — ${sc.description}`, async ({ sfApi }) => {
    await allure.epic(sc.epic);
    await allure.feature(sc.scenario);
    await allure.story("IPH-NEWFIX-001");
    await allure.severity("critical");

    let opportunityId;

    await test.step("Find or create Opportunity", async () => {
      // Strategy 1: Already set in runtime state (resumed run)
      const existingId = getState("opportunityId");
      if (existingId) {
        opportunityId = existingId;
        console.log(`Resuming with existing Opportunity: ${opportunityId}`);
        return;
      }

      // Strategy 2: Find an existing Opportunity tagged for MVP3
      const mvp3Oppty = await sfApi
        .query(
          `SELECT Id, Name, StageName FROM Opportunity
         WHERE StageName IN ('Scoping', 'Quoting', 'Negotiation')
         AND Name LIKE '%MVP3%'
         ORDER BY CreatedDate DESC LIMIT 1`
        )
        .catch(() => ({ records: [] }));

      if (mvp3Oppty.records.length > 0) {
        opportunityId = mvp3Oppty.records[0].Id;
        console.log(
          `Found MVP3 Opportunity: ${mvp3Oppty.records[0].Name} (${mvp3Oppty.records[0].StageName})`
        );
        return;
      }

      // Strategy 3: Any active Opportunity in Quoting/Negotiation
      const activeOppty = await sfApi
        .query(
          `SELECT Id, Name, StageName FROM Opportunity
         WHERE StageName IN ('Quoting', 'Negotiation')
         AND IsClosed = false
         ORDER BY CreatedDate DESC LIMIT 1`
        )
        .catch(() => ({ records: [] }));

      if (activeOppty.records.length > 0) {
        opportunityId = activeOppty.records[0].Id;
        console.log(
          `Using latest active Opportunity: ${activeOppty.records[0].Name} (${activeOppty.records[0].StageName})`
        );
        return;
      }

      // Strategy 4: Create new Opportunity
      const recordTypeId = await sfApi
        .getRecordTypeId("Opportunity", "Enterprise")
        .catch(() => null);

      const customerRt = await sfApi
        .query(
          `SELECT Id FROM RecordType WHERE SobjectType = 'Account' AND DeveloperName LIKE '%Customer%' LIMIT 1`
        )
        .catch(() => ({ records: [] }));

      const opptyData = {
        Name: `Auto MVP3 IPHONE ${Date.now()}`,
        StageName: "Scoping",
        CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        Description: "Created by MVP3 SIT Automation",
        ...(recordTypeId ? { RecordTypeId: recordTypeId } : {})
      };

      if (customerRt.records.length > 0) {
        const accounts = await sfApi
          .query(
            `SELECT Id, Name FROM Account WHERE RecordTypeId = '${customerRt.records[0].Id}' ORDER BY CreatedDate DESC LIMIT 1`
          )
          .catch(() => ({ records: [] }));
        if (accounts.records.length > 0) {
          opptyData.AccountId = accounts.records[0].Id;
          console.log(`Using Account: ${accounts.records[0].Name}`);
        }
      }

      opportunityId = await sfApi.createOpportunity(opptyData);
      console.log(`Created new Opportunity: ${opportunityId}`);
    });

    expect(opportunityId).toBeTruthy();

    await test.step("Verify Opportunity and attempt stage advance", async () => {
      const oppty = await sfApi.get("Opportunity", opportunityId, [
        "StageName",
        "Name"
      ]);
      console.log(`Opportunity "${oppty.Name}" — Stage: ${oppty.StageName}`);

      // Attempt stage update — log warning if blocked by business rule
      if (oppty.StageName === "Scoping") {
        await sfApi
          .updateOpportunityStage(opportunityId, "Quoting")
          .catch((e) => {
            const body = e.message.split("Body:")[1]?.trim() ?? "";
            console.warn(`Stage update blocked: ${body}`);
            console.warn("→ Complete ScoreCard manually in UI, then re-run.");
          });
      }
    });

    await test.step("Save state for downstream tests", async () => {
      const opptyUrl = `${LIGHTNING_URL}/lightning/r/Opportunity/${opportunityId}/view`;
      setState("opportunityId", opportunityId);
      setState("opportunityUrl", opptyUrl);
      console.log(`Saved: opportunityId = ${opportunityId}`);
      console.log(`URL: ${opptyUrl}`);
    });
  });
});
