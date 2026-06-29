require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  { id: "1065451521", group: "dukcapil", title: "Validate NIK NOKK" },
  { id: "913702913", group: "esim", title: "Send QR in Mail" },
  { id: "954761217", group: "esim", title: "Update Profile State" },
  { id: "1074692097", group: "esim", title: "Query Profile State" }
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

(async () => {
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

    // Method
    const methodMatch =
      text.match(/Operation\s+(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/Method\s+(GET|POST|PUT|PATCH|DELETE)/i);
    console.log("Method:", methodMatch ? methodMatch[1].toUpperCase() : "POST");

    // URL
    const urls = text.match(/https?:\/\/[^\s,<>"]+/gi) || [];
    const sitUrl = urls.find((u) => /sit|dev|uat/i.test(u)) || urls[0] || "TBD";
    console.log("URL:", sitUrl);

    // Payload markers
    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body",
      "Example Request"
    ];
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
            const parsed = JSON.parse(fixed);
            console.log("✅ JSON payload:");
            console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
          } catch (e) {
            console.log("❌ JSON parse error:", e.message);
            console.log("Raw:", json.substring(0, 400));
          }
        } else {
          // Check XML
          const after = text
            .substring(idx + m.length, idx + m.length + 100)
            .trim();
          if (after.startsWith("<")) {
            console.log("XML payload detected:");
            console.log(text.substring(idx, idx + 500));
          } else {
            console.log("No JSON/XML after marker. Text:");
            console.log(text.substring(idx, idx + 500));
          }
        }
        break;
      }
    }
  }
})();
