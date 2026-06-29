require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  // EOC
  {
    id: "1028554812",
    group: "eoc",
    title: "PortOutCompletionNotification B2B to B2C"
  },
  {
    id: "1028554753",
    group: "eoc",
    title: "ICareCreatePortOutOrder B2C to B2B"
  },
  {
    id: "1028620289",
    group: "eoc",
    title: "SalesforceCreatePortOutOrder B2B to B2C"
  },
  {
    id: "1031143456",
    group: "eoc",
    title: "ResponseIndiToCorpPortOutOrder B2C to B2B"
  },
  // ERP
  { id: "984612865", group: "erp", title: "Create Project Sync Project" },
  { id: "1179385951", group: "erp", title: "Create Product Sync Product" },
  // HPM
  { id: "1059291137", group: "hpm", title: "Reserve Cancel Homepass" },
  { id: "694943794", group: "hpm", title: "Get Cluster Name" },
  { id: "694943745", group: "hpm", title: "Get Commercial Name" },
  { id: "695042049", group: "hpm", title: "Validate Homepass" },
  { id: "1161134507", group: "hpm", title: "Update Homepass Status" },
  // IDA
  { id: "796852225", group: "ida", title: "Create Credential" },
  { id: "802062337", group: "ida", title: "Remove Credential" },
  // HBASE
  { id: "975929346", group: "hbase", title: "Create Subscriber" },
  { id: "977469441", group: "hbase", title: "Delete Subscriber" },
  // IVS
  { id: "639303681", group: "ivs", title: "IVS Check Eligibility" },
  // JASPER
  { id: "993296385", group: "jasper", title: "Change Ownership" },
  { id: "989495297", group: "jasper", title: "Status Change" },
  { id: "991264769", group: "jasper", title: "Deactivate Jasper" },
  { id: "969113904", group: "jasper", title: "New Activation" },
  // KAFKA
  {
    id: "1251508285",
    group: "kafka",
    title: "Product Catalog Management TMF620"
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
    .replace(/&mdash;/g, "-")
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
  const seen = new Set();

  for (const api of apis) {
    // Skip duplicates (Status Change listed twice)
    if (seen.has(api.id + api.group)) continue;
    seen.add(api.id + api.group);

    console.log(`\n--- [${api.group.toUpperCase()}] ${api.title} (${api.id})`);
    const page = await fetchPage(api.id);
    if (!page || !page.title) {
      console.log("❌ Not found");
      continue;
    }

    const text = cleanText(page.body?.storage?.value || "");

    // Method
    const methodMatch =
      text.match(/Method\s*[:\|]\s*(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/(GET|POST|PUT|PATCH|DELETE)\s*\(?Rest\)?/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "POST";

    // URL
    const urlPatterns = [
      /(https?:\/\/(?:dev-cgw|tm-route|bi-)[^\s<>,"]+)/i,
      /(?:SIT)[^:]*:\s*(https?:\/\/[^\s<>,"]+)/i,
      /(https?:\/\/[^\s<>,"]+(?:sit|dev)[^\s<>,"]*)/i
    ];
    let url = "TBD";
    for (const pat of urlPatterns) {
      const m = text.match(pat);
      if (m) {
        url = m[1].replace(/\s/g, "").split(",")[0];
        break;
      }
    }

    // Payload
    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body Example",
      "Request Body",
      "Sample Request",
      "Body"
    ];
    let payload = null;
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx === -1) continue;
      const jsonStr = extractJsonBlock(text, idx);
      if (jsonStr) {
        try {
          const fixed = jsonStr
            .replace(/\u201c|\u201d/g, '"')
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]");
          payload = JSON.parse(fixed);
          console.log(`✅ [${m}] Method:${method} URL:${url}`);
          console.log("   Preview:", JSON.stringify(payload).substring(0, 180));
        } catch (e) {
          console.log(`❌ [${m}] error: ${e.message}`);
          console.log("   Raw:", jsonStr.substring(0, 200));
        }
      } else {
        console.log(
          `⚠️  [${m}] no JSON. Text:`,
          text.substring(idx, idx + 250)
        );
      }
      break;
    }
    if (!payload) {
      console.log("⚠️  No payload found. Method:", method, "| URL:", url);
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
    "scripts/generators/batch4_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log(
    `\n\nSaved ${results.length} results to scripts/batch4_specs.json`
  );
})();
