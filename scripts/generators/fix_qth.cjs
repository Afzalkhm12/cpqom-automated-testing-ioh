require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const req = https.request(
  {
    hostname: "indosat.atlassian.net",
    path: "/wiki/rest/api/content/1162510337?expand=body.storage",
    method: "GET",
    headers: { Authorization: "Basic " + auth, Accept: "application/json" }
  },
  (res) => {
    let data = "";
    res.on("data", (d) => (data += d));
    res.on("end", () => {
      const page = JSON.parse(data);
      const html = page.body.storage.value;
      const text = html
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      // Look for all instances of "Request Payload"
      let idx = 0;
      let count = 0;
      while ((idx = text.indexOf("Request Payload", idx)) !== -1) {
        count++;
        console.log(`\n--- Instance ${count} at pos ${idx} ---`);
        console.log(text.substring(idx, idx + 500));
        idx += 20;
      }

      // Also look for URL endpoints
      const urlMatch = text.match(
        /querytransaction|transaction.history|query.transaction/gi
      );
      console.log("\n\nURL mentions:", urlMatch);

      // Look for all URLs
      const urls = text.match(/https?:\/\/[^\s,<>]+/gi);
      console.log("All URLs:", urls);

      // Show full text to understand structure
      console.log("\n\nFULL TEXT (first 3000 chars):");
      console.log(text.substring(0, 3000));
    });
  }
);
req.end();
