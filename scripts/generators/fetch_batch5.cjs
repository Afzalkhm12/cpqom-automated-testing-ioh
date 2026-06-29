require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  // OCS (2)
  {
    id: "1103396898",
    group: "ocs",
    title: "Transaction History under 24 Hours"
  },
  {
    id: "1103396872",
    group: "ocs",
    title: "Get Charging Usage Call History under 24 Hours"
  },
  // OWS (10)
  { id: "709623809", group: "ows", title: "Cancel Reservation" },
  { id: "709165135", group: "ows", title: "Create Forecast" },
  { id: "710639617", group: "ows", title: "Extend Reservation" },
  { id: "714244101", group: "ows", title: "Get Devices" },
  { id: "710443009", group: "ows", title: "Get Forecast Details" },
  { id: "709165066", group: "ows", title: "Get Nearest Sites" },
  { id: "726892545", group: "ows", title: "Get Power" },
  { id: "726990864", group: "ows", title: "Get Tower Provider Details" },
  { id: "1164542038", group: "ows", title: "Create Ticket to Network" },
  { id: "1164542106", group: "ows", title: "Update Ticket to Network" },
  // SENSUM (1)
  { id: "735805441", group: "sensum", title: "Submit Case Events" },
  // SMSC (1)
  { id: "976879634", group: "smsc", title: "Send SMS Notification" },
  // SOM (9 unique)
  {
    id: "1139408933",
    group: "som",
    title: "Provisioning for IPHONE FTTH Create Modify Order TMF641"
  },
  {
    id: "1076985909",
    group: "som",
    title: "Work Order Progress Update Update Installation Evidence to SOM"
  },
  { id: "1144324099", group: "som", title: "Order Cancellation TMF641" },
  {
    id: "1144324322",
    group: "som",
    title: "Query IPhone Network Features TMF638 All Services"
  },
  { id: "1144913921", group: "som", title: "SOM Service Delete TMF641" },
  {
    id: "1145569420",
    group: "som",
    title: "SOM Service Inventory GET TMF638 All Services"
  },
  { id: "1251442689", group: "som", title: "SOM Service Inventory Update" },
  {
    id: "1144324241",
    group: "som",
    title: "SOM Service Order GET TMF641 All Service Orders"
  },
  { id: "1148190800", group: "som", title: "Update Fallout Status" },
  // TNM (14)
  { id: "728858626", group: "tnm", title: "Query ICCID List" },
  { id: "728858687", group: "tnm", title: "Query MSISDN List" },
  { id: "728858752", group: "tnm", title: "Reserve Unreserve ICCID" },
  { id: "734101592", group: "tnm", title: "Reserve Unreserve MSISDN" },
  { id: "951484417", group: "tnm", title: "Activate Postpaid DSA SIM" },
  { id: "948666545", group: "tnm", title: "Get IMSI D and KiK4 Usim Non-usim" },
  { id: "1037369345", group: "tnm", title: "Good Issue" },
  { id: "921239553", group: "tnm", title: "Pair MSISDN and SIM" },
  {
    id: "1103134736",
    group: "tnm",
    title: "Port-in and Port-out EOC Salesforce"
  },
  { id: "921894913", group: "tnm", title: "Unpair MSISDN from SIM" },
  { id: "1167589378", group: "tnm", title: "Query ICCID Details" },
  { id: "1167589437", group: "tnm", title: "Query MSISDN Details" },
  { id: "1095499803", group: "tnm", title: "Update MSISDN Status IPhone" },
  { id: "1267139135", group: "tnm", title: "Deactivate SIM" }
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
      console.log(`❌ ${api.title} (${api.id})`);
      fail++;
      continue;
    }

    const text = cleanText(page.body?.storage?.value || "");

    const methodMatch =
      text.match(/Method\s*[:\|]\s*(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/(GET|POST|PUT|PATCH|DELETE)\s*\(?Rest\)?/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "POST";

    let url = "TBD";
    for (const pat of [
      /(https?:\/\/(?:dev-cgw|tm-route|bi-)[^\s<>,"]+)/i,
      /(?:SIT)[^:]*:\s*(https?:\/\/[^\s<>,"]+)/i,
      /(https?:\/\/[^\s<>,"]+(?:sit|dev)[^\s<>,"]*)/i
    ]) {
      const m = text.match(pat);
      if (m) {
        url = m[1].replace(/\s/g, "").split(",")[0];
        break;
      }
    }

    let payload = null;
    for (const m of [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body Example",
      "Request Body"
    ]) {
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
          /* ignore */
        }
      }
      break;
    }

    const s = payload ? "✅" : "⚠️ ";
    console.log(
      `${s} [${api.group.toUpperCase()}] ${page.title} | ${method} | url:${url.substring(0, 50)} | payload:${!!payload}`
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
    "scripts/generators/batch5_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log(
    `\nDone: ${ok} with payload, ${fail} missing. Total ${results.length} saved.`
  );
})();
