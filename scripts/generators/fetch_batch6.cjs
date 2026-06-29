require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  // VAS (4)
  { id: "1089961985", group: "vas", title: "Query RBT Product Catalogue" },
  {
    id: "968359973",
    group: "vas",
    title: "VAS RBT Provisioning De-provisioning"
  },
  { id: "1076985857", group: "vas", title: "Query SDP Product Catalogue" },
  {
    id: "968359937",
    group: "vas",
    title: "VAS SDP Provisioning De-provisioning"
  },
  // VFREE (2)
  {
    id: "723583003",
    group: "vfree",
    title: "Billing Invoice Delivery Provisioning"
  },
  { id: "1162969155", group: "vfree", title: "Re-Invoice Trigger" },
  // VOUCHER-MGMT-SYSTEM (1)
  { id: "1162510475", group: "voucher-mgmt-system", title: "Voucher Refill" }
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
  for (const api of apis) {
    console.log(`\n--- [${api.group.toUpperCase()}] ${api.title} (${api.id})`);
    const page = await fetchPage(api.id);
    if (!page || !page.title) {
      console.log("❌ Not found");
      continue;
    }
    console.log("Title:", page.title);

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
    for (const marker of [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body Example",
      "Request Body"
    ]) {
      const idx = text.indexOf(marker);
      if (idx === -1) continue;
      const jsonStr = extractJsonBlock(text, idx);
      if (jsonStr) {
        try {
          const fixed = jsonStr
            .replace(/\u201c|\u201d/g, '"')
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]");
          payload = JSON.parse(fixed);
          console.log(`✅ [${marker}] Method:${method} URL:${url}`);
          console.log("   Preview:", JSON.stringify(payload).substring(0, 200));
        } catch (e) {
          console.log(`❌ [${marker}] JSON error: ${e.message}`);
          console.log("   Raw:", jsonStr.substring(0, 250));
        }
      } else {
        console.log(
          `⚠️  [${marker}] no JSON. Text after:`,
          text.substring(idx, idx + 300)
        );
      }
      break;
    }
    if (!payload) console.log(`⚠️  No payload. Method:${method} URL:${url}`);

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
    "scripts/generators/batch6_specs.json",
    JSON.stringify(results, null, 2)
  );
  const ok = results.filter((r) => r.payload).length;
  console.log(
    `\nSaved ${results.length} entries. ${ok} with payload, ${results.length - ok} missing.`
  );
})();
