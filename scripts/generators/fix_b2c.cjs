require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

https
  .request(
    {
      hostname: "indosat.atlassian.net",
      path: "/wiki/rest/api/content/1028554753?expand=body.storage",
      method: "GET",
      headers: { Authorization: "Basic " + auth, Accept: "application/json" }
    },
    (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        const page = JSON.parse(data);
        const text = page.body.storage.value
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&ndash;/g, "-")
          .replace(/\s+/g, " ");

        const idx = text.indexOf("Request Payload");
        console.log("Around payload:", text.substring(idx, idx + 600));

        // Find and fix: extract field values manually
        const msisdnM = text.match(/"MSISDN"\s*:\s*"(\d+)"/);
        const migTypeM = text.match(/"MigrationType"\s*:\s*"([^"]+)"/);
        const portInM = text.match(/"PortInOrderNum"\s*:\s*"([^"]+)"/);
        const eventSrcM = text.match(/"EventSource"\s*:\s*"([^"]+)"/);

        const payload = {
          MSISDN: msisdnM ? msisdnM[1] : "6285711461620",
          MigrationType: "PreToPostCorp",
          PortInOrderNum: portInM ? portInM[1] : "2-538076578639",
          EventSource: eventSrcM ? eventSrcM[1] : "Salesforce"
        };

        console.log("\nExtracted payload:", JSON.stringify(payload, null, 2));

        // Update the saved JSON
        const results = JSON.parse(
          fs.readFileSync("scripts/generators/batch2_specs.json", "utf8")
        );
        const b2c = results.find((r) => r.id === "1028554753");
        if (b2c) {
          b2c.payload = payload;
          console.log("Updated b2c payload in batch2_specs.json");
        }
        fs.writeFileSync(
          "scripts/generators/batch2_specs.json",
          JSON.stringify(results, null, 2)
        );
      });
    }
  )
  .end();
