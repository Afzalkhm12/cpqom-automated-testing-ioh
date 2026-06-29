require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  { id: "1009385510", group: "IN", title: "Reset VLR" },
  { id: "993919112", group: "IN", title: "INQueryFaFNumber" },
  { id: "994476093", group: "IN", title: "INQueryRemainingUsage" },
  {
    id: "1103757313",
    group: "FMP",
    title: "Create New User Activate New User"
  },
  { id: "1130692609", group: "FMP", title: "Deactivate User" },
  { id: "1162510337", group: "FMP", title: "Query Transaction History" }
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

function extractXmlBlock(text, startIdx) {
  let start = text.indexOf("<", startIdx);
  if (start === -1) return null;
  // Find end of XML by looking for the closing of the root tag
  let depth = 0;
  let inTag = false;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "<") inTag = true;
    if (text[i] === ">") {
      inTag = false;
    }
  }
  // Just return a generous chunk
  return text.substring(start, Math.min(start + 2000, text.length));
}

(async () => {
  const results = [];
  for (const api of apis) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`${api.group} | ${api.title} (ID: ${api.id})`);
    console.log("=".repeat(60));

    const page = await fetchPage(api.id);
    if (!page || !page.title) {
      console.log("❌ Page not found");
      continue;
    }

    console.log("Title:", page.title);
    const html = page.body?.storage?.value || "";
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    // Extract Method
    const methodMatch =
      text.match(/Operation\s+(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/Method\s+(GET|POST|PUT|PATCH|DELETE)/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "POST";
    console.log("Method:", method);

    // Extract URL
    const urlMatch =
      text.match(/(https?:\/\/[^\s,]+(?:sit|uat|dev)[^\s,]*)/i) ||
      text.match(/Lower Env URL[^:]*:\s*(https?:\/\/[^\s,]+)/i) ||
      text.match(/SIT[^:]*:\s*(https?:\/\/[^\s,]+)/i) ||
      text.match(/UAT[^:]*:\s*(https?:\/\/[^\s,]+)/i);
    const url = urlMatch ? urlMatch[1].replace(/\s+/g, "") : "TBD";
    console.log("URL:", url);

    // Extract Type (Sync/Async)
    const typeMatch = text.match(/Type\s+(Synchronous|Asynchronous)/i);
    const type = typeMatch ? typeMatch[1] : "Synchronous";

    // Extract payload
    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body",
      "Example Request"
    ];
    let payload = null;
    let payloadFormat = "json";
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx !== -1) {
        console.log(`Found marker: "${m}"`);
        const json = extractJsonBlock(text, idx);
        if (json) {
          try {
            const fixed = json
              .replace(/\u201c/g, '"')
              .replace(/\u201d/g, '"')
              .replace(/,\s*}/g, "}")
              .replace(/,\s*]/g, "]");
            payload = JSON.parse(fixed);
            console.log("✅ JSON payload extracted");
            console.log(JSON.stringify(payload, null, 2).substring(0, 300));
          } catch (e) {
            console.log("❌ JSON parse error:", e.message);
            console.log("Raw:", json.substring(0, 300));
          }
        } else {
          // Check if XML
          const afterMarker = text
            .substring(idx + m.length, idx + m.length + 100)
            .trim();
          if (afterMarker.startsWith("<")) {
            payloadFormat = "xml";
            console.log("XML payload detected");
            console.log(text.substring(idx, idx + 500));
          } else {
            console.log("No JSON/XML found after marker");
            console.log("Text after marker:", text.substring(idx, idx + 400));
          }
        }
        break;
      }
    }

    results.push({
      id: api.id,
      group: api.group,
      title: page.title,
      method,
      url,
      type,
      payload,
      payloadFormat
    });
  }

  const fs = require("fs");
  fs.writeFileSync(
    "scripts/generators/new_api_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\n\nSaved results to new_api_specs.json");
})();
