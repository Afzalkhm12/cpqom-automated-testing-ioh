require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

function fetchPage(id) {
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
          res.on("end", () => resolve(JSON.parse(data)));
        }
      )
      .end();
  });
}

function extractJsonBlock(text, startIdx) {
  let start = text.indexOf("{", startIdx);
  if (start === -1) return null;
  let stack = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") stack++;
    if (text[i] === "}") {
      stack--;
      if (stack === 0) return text.substring(start, i + 1);
    }
  }
  return null;
}

(async () => {
  const pages = [
    { name: "Contact", id: "9405969" },
    { name: "Header", id: "9405981" }
  ];
  const results = {};
  for (const p of pages) {
    const page = await fetchPage(p.id);
    const html = page.body.storage.value;
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
    const idx = text.indexOf("Request Payload Example");
    const jsonStr = extractJsonBlock(text, idx);
    const fixed = jsonStr
      .replace(/\u201c/g, '"')
      .replace(/\u201d/g, '"')
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");
    results[p.name] = JSON.parse(fixed);
  }
  const fs = require("fs");
  fs.writeFileSync(
    "scripts/generators/opp_payloads.json",
    JSON.stringify(results, null, 2)
  );
  console.log("Saved to opp_payloads.json");
})();
