require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  // COM
  { id: "1099399169", group: "com", title: "Update Asset Evidence API" },
  { id: "1136689170", group: "com", title: "Update Service Order Item TMF641" },
  {
    id: "1136295966",
    group: "com",
    title: "Update Milestone to Salesforce TMF641"
  },
  // CRS
  { id: "1065025611", group: "crs", title: "MSISDN Per NIK" },
  { id: "1065353217", group: "crs", title: "Update to CRS" },
  // DSA
  { id: "975929525", group: "dsa", title: "evDSA Request" },
  // DWH
  {
    id: "1001881601",
    group: "dwh",
    title: "Charging History Call History more than 24 hours"
  },
  { id: "1161134477", group: "dwh", title: "Query Volte Status" },
  {
    id: "1103527937",
    group: "dwh",
    title: "Transaction History more than 24 hours"
  }
];

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

function cleanText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ndash;/g, "-")
    .replace(/\s+/g, " ");
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
  const results = [];
  for (const api of apis) {
    console.log(`\n${"=".repeat(55)}`);
    console.log(`${api.group.toUpperCase()} | ${api.title} (ID: ${api.id})`);

    const page = await fetchPage(api.id);
    if (!page || !page.title) {
      console.log("❌ Not found");
      continue;
    }
    console.log("Title:", page.title);

    const text = cleanText(page.body?.storage?.value || "");

    const methodMatch =
      text.match(/Method\s*[:\|]\s*(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/Operation\s*[:\|]\s*(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/(GET|POST|PUT|PATCH|DELETE)\s*\(?Rest\)?/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "POST";

    const urlPatterns = [
      /(https?:\/\/(?:dev-cgw|tm-route|bi-)[^\s<>,"]+)/i,
      /(?:SIT|sit)[^:]*:\s*(https?:\/\/[^\s<>,"]+)/i,
      /(https?:\/\/[^\s<>,"]+(?:sit|dev|uat)[^\s<>,"]*)/i
    ];
    let url = "TBD";
    for (const pat of urlPatterns) {
      const m = text.match(pat);
      if (m) {
        url = m[1].replace(/\s/g, "").split(",")[0];
        break;
      }
    }

    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body Example",
      "Request Body",
      "Sample Request"
    ];
    let payload = null;
    let markerUsed = "";
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx === -1) continue;
      markerUsed = m;
      const jsonStr = extractJsonBlock(text, idx);
      if (jsonStr) {
        try {
          const fixed = jsonStr
            .replace(/\u201c|\u201d/g, '"')
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]");
          payload = JSON.parse(fixed);
          console.log(`✅ [${m}] JSON valid. Method:${method} URL:${url}`);
          console.log("   Preview:", JSON.stringify(payload).substring(0, 180));
        } catch (e) {
          console.log(`❌ [${m}] JSON error: ${e.message}`);
          console.log("   Raw:", jsonStr.substring(0, 250));
        }
      } else {
        console.log(
          `⚠️  [${m}] no JSON block. After marker:`,
          text.substring(idx, idx + 350)
        );
      }
      break;
    }
    if (!payload) {
      console.log("⚠️  No payload. Method:", method, "| URL:", url);
      // Show some text to understand format
      console.log("Text snippet:", text.substring(0, 500));
    }

    results.push({
      id: api.id,
      group: api.group,
      title: page.title,
      method,
      url,
      payload
    });
  }

  fs.writeFileSync(
    "scripts/generators/batch3_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log(
    `\n\nSaved ${results.length} results to scripts/batch3_specs.json`
  );
})();
