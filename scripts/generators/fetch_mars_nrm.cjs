require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  // MARS (4)
  { id: "718897153", group: "mars", title: "Activate bill on email" },
  { id: "719126529", group: "mars", title: "Deactivate bill on email" },
  { id: "755302406", group: "mars", title: "Get Bill On Email History" },
  { id: "723845123", group: "mars", title: "Modify bill on email address" },
  // NRM (55 unique)
  {
    id: "647495681",
    group: "nrm",
    title: "Activate Billing Prepaid Postpaid Minimum Commitment"
  },
  { id: "704446506", group: "nrm", title: "Create Minimum Commitment" },
  { id: "698580993", group: "nrm", title: "Create Adjustment" },
  { id: "634945537", group: "nrm", title: "Create CCA" },
  { id: "697008308", group: "nrm", title: "Create Installment" },
  { id: "704610305", group: "nrm", title: "Create Termin Bill" },
  { id: "688816131", group: "nrm", title: "Get Adjustment History" },
  { id: "696352928", group: "nrm", title: "Get Billing Account Summary" },
  { id: "677937153", group: "nrm", title: "Get Billing Detail" },
  { id: "677773485", group: "nrm", title: "Get Dunning Execution CSP" },
  { id: "678592513", group: "nrm", title: "Get Dunning History" },
  { id: "685244417", group: "nrm", title: "Get Failed Payment Allocation" },
  { id: "697696313", group: "nrm", title: "Get Termin Hold Bill" },
  { id: "684818433", group: "nrm", title: "Get Invoice Adjustment" },
  { id: "677806086", group: "nrm", title: "Get Invoice Detail" },
  { id: "678101004", group: "nrm", title: "Get Invoice Product Charge" },
  { id: "684294145", group: "nrm", title: "Get Invoice Revenue" },
  { id: "674988222", group: "nrm", title: "Get Ledger" },
  { id: "677773318", group: "nrm", title: "Get Invoice List" },
  { id: "677773425", group: "nrm", title: "Get Payment History" },
  { id: "705921093", group: "nrm", title: "Get Performance Invoice" },
  { id: "1164541953", group: "nrm", title: "Get Summary Statement" },
  { id: "686882931", group: "nrm", title: "Get Usage" },
  { id: "685015101", group: "nrm", title: "Get Virtual Account" },
  { id: "705921025", group: "nrm", title: "Modify Termin Bill" },
  { id: "697696373", group: "nrm", title: "Perform Delay Block" },
  { id: "706183174", group: "nrm", title: "Remove Minimum Commitment" },
  { id: "924647429", group: "nrm", title: "Request Hot Bill" },
  { id: "706215937", group: "nrm", title: "Request Performance Invoice" },
  { id: "789479683", group: "nrm", title: "Subscribe Dunning Order" },
  { id: "783056897", group: "nrm", title: "Subscribe First Bill Payment" },
  { id: "735510546", group: "nrm", title: "Update BA" },
  { id: "735576065", group: "nrm", title: "Update CA" },
  { id: "735117313", group: "nrm", title: "Update CCA" },
  { id: "1251508355", group: "nrm", title: "Calculate Total Penalty" },
  { id: "1151860796", group: "nrm", title: "Break Termin Bill" },
  { id: "1151860737", group: "nrm", title: "Cancel Termin Bill" },
  { id: "1150615675", group: "nrm", title: "Get Usage Billed Unbilled" },
  { id: "1150648502", group: "nrm", title: "Modify Virtual Account" },
  { id: "1150681089", group: "nrm", title: "Query Hot Billing History" },
  { id: "685015041", group: "nrm", title: "Get Invoice Dispute" },
  {
    id: "1109426648",
    group: "nrm",
    title: "Query SR Invoice Pick Applet Dispute"
  },
  { id: "1150615553", group: "nrm", title: "RBMAddBOMProduct" },
  { id: "1150615615", group: "nrm", title: "RBMModifyBOMProduct" },
  { id: "1116569601", group: "nrm", title: "RBM Modify Hold Bill" },
  { id: "1150648381", group: "nrm", title: "RBMQueryInfoBOM" },
  { id: "1150648321", group: "nrm", title: "RBMRemoveBOMProduct" },
  { id: "1151205377", group: "nrm", title: "Submit Modify Tiering Discount" },
  { id: "1151697017", group: "nrm", title: "Submit Termin Hold Bill" },
  { id: "1151664129", group: "nrm", title: "Cancel Tiering Discount" },
  {
    id: "1151696897",
    group: "nrm",
    title: "Check Tiering Discount Eligibility"
  },
  { id: "731578374", group: "nrm", title: "TMF620 Product Catalog Management" },
  {
    id: "1109426709",
    group: "nrm",
    title: "Query SR Invoice Pick Applet Reinvoice"
  },
  { id: "802160641", group: "nrm", title: "Query Tiering Discount History" },
  {
    id: "1173192717",
    group: "nrm",
    title: "Query Last Invoice History on tiering discount view"
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
  let ok = 0,
    fail = 0;

  for (const api of apis) {
    const page = await fetchPage(api.id);
    if (!page || !page.title) {
      console.log(`❌ [${api.group}] ${api.title} (${api.id}) - Not found`);
      fail++;
      continue;
    }

    const text = cleanText(page.body?.storage?.value || "");

    const methodMatch =
      text.match(/Method\s*[:\|]\s*(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/(GET|POST|PUT|PATCH|DELETE)\s*\(?Rest\)?/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "POST";

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

    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body Example",
      "Request Body"
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
        } catch (e) {
          /* will show as no payload */
        }
      }
      break;
    }

    const status = payload ? "✅" : "⚠️ ";
    console.log(
      `${status} [${api.group.toUpperCase()}] ${page.title} | Method:${method} | URL:${url.substring(0, 55)} | payload:${!!payload}`
    );
    if (payload) ok++;
    else fail++;

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
    "scripts/generators/mars_nrm_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log(
    `\nDone: ${ok} with payload, ${fail} without payload. Total ${results.length} saved.`
  );
})();
