require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

// Check correct URLs for DWH Charging History, COM pages (TMF641)
const toCheck = [
  { id: "1001881601", name: "Charging History DWH" },
  { id: "1161134477", name: "Query Volte Status" },
  { id: "1136689170", name: "Update Service Order Item TMF641" },
  { id: "1136295966", name: "Update Milestone to Salesforce TMF641" }
];

async function fetchPage(id) {
  return new Promise((resolve) => {
    https
      .request(
        {
          hostname: "indosat.atlassian.net",
          path: "/wiki/rest/api/content/" + id + "?expand=body.storage",
          method: "GET",
          headers: {
            Authorization: "Basic " + auth,
            Accept: "application/json"
          }
        },
        (res) => {
          let data = "";
          res.on("data", (d) => (data += d));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(null);
            }
          });
        }
      )
      .end();
  });
}

(async () => {
  const results = JSON.parse(
    fs.readFileSync("scripts/generators/batch3_specs.json", "utf8")
  );

  for (const item of toCheck) {
    const page = await fetchPage(item.id);
    const text = (page?.body?.storage?.value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ");

    const urls = text.match(/https?:\/\/[^\s<>,"]+/gi) || [];
    const devUrls = urls.filter(
      (u) =>
        u.includes("dev-cgw") || u.includes("ioh.co.id") || u.includes("ocpmw")
    );
    console.log(`\n${item.name} (${item.id}):`);
    console.log("Dev URLs:", devUrls.slice(0, 5));

    const r = results.find((r) => r.id === item.id);
    if (r && devUrls.length > 0 && r.url === "TBD") {
      r.url = devUrls[0];
      console.log("Updated URL to:", r.url);
    }
  }

  fs.writeFileSync(
    "scripts/generators/batch3_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\nUpdated batch3_specs.json");
})();
