require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

// Search for "Query Transaction History" in Confluence
const searchPath =
  "/wiki/rest/api/content/search?cql=title%3D%22Query+Transaction+History%22+and+type%3Dpage&limit=10";
const req = https.request(
  {
    hostname: "indosat.atlassian.net",
    path: searchPath,
    method: "GET",
    headers: { Authorization: "Basic " + auth, Accept: "application/json" }
  },
  (res) => {
    let data = "";
    res.on("data", (d) => (data += d));
    res.on("end", () => {
      const result = JSON.parse(data);
      console.log("Search results:", result.results?.length || 0);
      (result.results || []).forEach((r) => {
        console.log(
          `  - ID: ${r.id} | Title: ${r.title} | Space: ${r._expandable?.space}`
        );
      });
    });
  }
);
req.end();
