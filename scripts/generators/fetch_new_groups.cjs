require("dotenv").config();
const https = require("https");
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
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

(async () => {
  const results = [];
  for (const api of apis) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`${api.group.toUpperCase()} | ${api.title} (ID: ${api.id})`);
    console.log("=".repeat(60));

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
    console.log("Method:", method);

    // Extract URL - look for SIT/dev/sit patterns
    const urlPatterns = [
      /(?:SIT|sit)[^:]*:\s*(https?:\/\/[^\s<>,"]+)/i,
      /(?:Lower Env|SIT URL|SIT\s+URL)[^:]*:\s*(https?:\/\/[^\s<>,"]+)/i,
      /(https?:\/\/(?:dev-cgw|tm-route)[^\s<>,"]+)/i,
      /(https?:\/\/[^\s<>,"]+(?:sit|dev|uat)[^\s<>,"]*)/i
    ];
    let url = "TBD";
    for (const pat of urlPatterns) {
      const m = text.match(pat);
      if (m) {
        url = m[1].replace(/\s/g, "");
        break;
      }
    }
    console.log("URL:", url);

    // Extract payload
    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body Example",
      "Sample"
    ];
    let payload = null;
    let payloadRaw = null;
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx === -1) continue;
      console.log(`Found marker: "${m}"`);
      const jsonStr = extractJsonBlock(text, idx);
      if (jsonStr) {
        try {
          const fixed = jsonStr
            .replace(/\u201c|\u201d/g, '"')
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]")
            .replace(/\n\s*\/\/[^\n]*/g, "");
          payload = JSON.parse(fixed);
          payloadRaw = JSON.stringify(payload, null, 2);
          console.log("✅ JSON valid. Preview:", payloadRaw.substring(0, 200));
        } catch (e) {
          payloadRaw = jsonStr.substring(0, 500);
          console.log("❌ JSON parse error:", e.message);
          console.log("Raw:", payloadRaw);
        }
      } else {
        const after = text.substring(idx, idx + 600);
        console.log("No JSON. Text after marker:", after);
      }
      break;
    }
    if (!payloadRaw) {
      console.log("No payload found. Showing first 800 chars:");
      console.log(text.substring(0, 800));
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

  const fs = require("fs");
  fs.writeFileSync(
    "scripts/generators/new_groups_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\n\nSaved to scripts/new_groups_specs.json");
})();
