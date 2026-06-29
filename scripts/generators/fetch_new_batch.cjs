require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  { id: "1065451521", group: "dukcapil", title: "Validate NIK NOKK" },
  { id: "913702913", group: "esim", title: "Send QR in Mail" },
  { id: "954761217", group: "esim", title: "Update Profile State" },
  { id: "1074692097", group: "esim", title: "Query Profile State" },
  { id: "1064697857", group: "adm", title: "Get Device Info ADM" },
  {
    id: "1065025571",
    group: "adm",
    title: "Get Subscriber Device History ADM"
  },
  {
    id: "1065025537",
    group: "adm",
    title: "Get Subscriber Settings History ADM"
  },
  { id: "1064960001", group: "adm", title: "Get Device Capabilities ADM" },
  {
    id: "1065091073",
    group: "adm",
    title: "Get Subscriber Blacklist Status ADM"
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

function cleanText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

(async () => {
  const results = [];
  for (const api of apis) {
    console.log(`\nFetching: ${api.title} (${api.id})...`);
    const page = await fetchPage(api.id);
    if (!page || !page.title) {
      console.log("  ❌ Not found");
      continue;
    }

    const text = cleanText(page.body?.storage?.value || "");

    // Extract Method
    const methodMatch =
      text.match(/Operation\s+(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/Method\s+(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/\b(GET|POST|PUT|PATCH|DELETE)\b.*?(?:Rest|HTTP)/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "POST";

    // Extract URL - look for SIT/dev URLs
    const urlPatterns = [
      /Lower Env[^:]*:\s*(https?:\/\/[^\s,<>"]+)/i,
      /SIT\s*URL[^:]*:\s*(https?:\/\/[^\s,<>"]+)/i,
      /SIT[^:]*:\s*(https?:\/\/[^\s,<>"]+)/i,
      /(https?:\/\/[^\s,<>"]*(?:sit|dev|cgw|mashery)[^\s,<>"]*)/i
    ];
    let url = "TBD";
    for (const pat of urlPatterns) {
      const m = text.match(pat);
      if (m) {
        url = m[1].replace(/\s+/g, "").replace(/[,;>]+$/, "");
        break;
      }
    }

    // Extract payload
    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body",
      "Sample Request"
    ];
    let payload = null;
    let payloadRaw = null;
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx !== -1) {
        const jsonStr = extractJsonBlock(text, idx);
        if (jsonStr) {
          try {
            const fixed = jsonStr
              .replace(/\u201c|\u201d/g, '"')
              .replace(/,(\s*[}\]])/g, "$1");
            payload = JSON.parse(fixed);
            payloadRaw = jsonStr;
          } catch (e) {
            payloadRaw = jsonStr.substring(0, 300);
            console.log(`  ⚠️  JSON parse error for "${m}": ${e.message}`);
          }
        } else {
          // Check for XML
          const xmlStart = text.indexOf("<", idx + m.length);
          if (xmlStart !== -1 && xmlStart < idx + m.length + 200) {
            payloadRaw = "XML: " + text.substring(xmlStart, xmlStart + 300);
          }
          console.log(`  ⚠️  No JSON block after "${m}"`);
          console.log("  Text after marker:", text.substring(idx, idx + 300));
        }
        break;
      }
    }

    console.log(
      `  ✅ Title: ${page.title} | Method: ${method} | URL: ${url.substring(0, 80)}`
    );
    console.log(
      `  Payload: ${payload ? "✅ JSON" : payloadRaw ? "⚠️ raw" : "❌ none"}`
    );
    results.push({
      id: api.id,
      group: api.group,
      title: page.title,
      method,
      url,
      payload,
      payloadRaw
    });
  }

  fs.writeFileSync(
    "scripts/generators/new_batch_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\n✅ Saved to new_batch_specs.json");
})();
