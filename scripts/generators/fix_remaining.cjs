require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  { id: "5675074", title: "ResumeApprovalRequest" },
  { id: "9419670", title: "Create Update Opportunity Contact" },
  { id: "9405939", title: "Create Update Opportunity Header" }
];

function fetchPage(id) {
  return new Promise((resolve) => {
    https
      .request(
        {
          hostname: "indosat.atlassian.net",
          path: "/wiki/rest/api/content/" + id + "?expand=body.storage",
          method: "GET",
          headers: { Authorization: "Basic " + auth }
        },
        (res) => {
          let data = "";
          res.on("data", (d) => (data += d));
          res.on("end", () => resolve(JSON.parse(data)));
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
    console.log(`API: ${api.title} (ID: ${api.id})`);
    console.log("=".repeat(60));

    const data = await fetchPage(api.id);
    const html = data.body.storage.value;
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    // Try multiple markers
    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body",
      "request",
      "Example",
      "Sample"
    ];
    let found = false;
    for (const marker of markers) {
      const idx = text.indexOf(marker);
      if (idx !== -1) {
        console.log(`✅ Found marker "${marker}" at pos ${idx}`);
        // Show 800 chars after marker
        console.log(text.substring(idx, idx + 800));
        console.log("---");

        // Try extracting JSON
        const jsonBlock = extractJsonBlock(text, idx);
        if (jsonBlock) {
          console.log(`JSON block found (${jsonBlock.length} chars):`);
          console.log(jsonBlock.substring(0, 500));
          try {
            let fixed = jsonBlock
              .replace(/\u201c/g, '"')
              .replace(/\u201d/g, '"')
              .replace(/,\s*}/g, "}")
              .replace(/,\s*]/g, "]");
            JSON.parse(fixed);
            console.log("\n✅ JSON VALID");
          } catch (e) {
            console.log("\n❌ JSON parse error:", e.message);
          }
        }
        found = true;
        break;
      }
    }
    if (!found) {
      console.log("❌ No known marker found. Showing first 1000 chars:");
      console.log(text.substring(0, 1000));
    }
  }
})();
