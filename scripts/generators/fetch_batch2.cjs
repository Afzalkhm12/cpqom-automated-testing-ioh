require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  // AIR
  { id: "979632129", group: "air", title: "Activate Charging" },
  { id: "1052475400", group: "air", title: "GeneralGet" },
  { id: "1095041025", group: "air", title: "QueryOffers" },
  { id: "1095499777", group: "air", title: "QueryPromotionalPlan" },
  // B2C-ICARE
  {
    id: "1028554753",
    group: "b2c-icare",
    title: "ICareCreatePortOutOrder B2C to B2B"
  },
  // CTLST additions
  { id: "636715009", group: "ctlst", title: "Create BA" },
  { id: "635011073", group: "ctlst", title: "Create CA" },
  // CORP-PORTAL
  {
    id: "1018626120",
    group: "corp-portal",
    title: "Create User / Create New User Webtools Add User"
  },
  {
    id: "1100709929",
    group: "corp-portal",
    title: "Activate User Webtools Update User Status"
  },
  {
    id: "1099333763",
    group: "corp-portal",
    title: "Deactivate User Webtools Delete User Wallet"
  },
  {
    id: "1096876092",
    group: "corp-portal",
    title: "Pair Wallet Webtools Add User Wallet"
  },
  {
    id: "1101856769",
    group: "corp-portal",
    title: "Query Active User Query Corporate Users Details Webtools Query User"
  },
  {
    id: "1101987841",
    group: "corp-portal",
    title: "Query Pair Wallet Detail Webtools Query User Wallet"
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

    // Extract Method
    const methodMatch =
      text.match(/Method\s*[:\|]\s*(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/Operation\s*[:\|]\s*(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/(GET|POST|PUT|PATCH|DELETE)\s*\(Rest\)/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "POST";

    // Extract URL
    const urlPatterns = [
      /(https?:\/\/(?:dev-cgw|tm-route)[^\s<>,"]+)/i,
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

    // Extract payload
    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body Example",
      "Example Request"
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
          console.log(`✅ [${m}] JSON valid. Method:${method} URL:${url}`);
          console.log("   Preview:", JSON.stringify(payload).substring(0, 150));
        } catch (e) {
          console.log(
            `❌ JSON error: ${e.message}. Raw:`,
            jsonStr.substring(0, 200)
          );
        }
      } else {
        console.log(
          `⚠️  [${m}] found but no JSON block. Text:`,
          text.substring(idx, idx + 300)
        );
      }
      break;
    }
    if (!payload)
      console.log("⚠️  No payload found. Method:", method, "URL:", url);

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
    "scripts/generators/batch2_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log(
    `\n\nSaved ${results.length} results to scripts/batch2_specs.json`
  );
})();
