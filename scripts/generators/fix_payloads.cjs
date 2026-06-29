require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  { id: "5679120", title: "QUERY ASSET INFO", marker: "Request Sample" },
  {
    id: "5679577",
    title: "GetCustomerDetailsService",
    marker: "Request Payload Example"
  },
  {
    id: "5674965",
    title: "CheckSiebelDataLoc",
    marker: "Request Payload Example"
  },
  {
    id: "5678068",
    title: "QUERY SR STATUS",
    marker: "Request Payload Example"
  },
  { id: "5679212", title: "QUERY ACTIVITY CODES", marker: "Request Sample" },
  { id: "5679096", title: "QUERY SR LIST", marker: "Request Sample" },
  {
    id: "5679340",
    title: "SIMReplacementValidation",
    marker: "Request Payload Example"
  },
  { id: "5682601", title: "evValidateCatSR", marker: "Request Payload" }
];

function fetchPage(id) {
  return new Promise((resolve, reject) => {
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
    console.log(`Marker: "${api.marker}"`);
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

    const idx = text.indexOf(api.marker);
    if (idx === -1) {
      console.log("❌ Marker NOT FOUND in document");
      const altMarkers = [
        "Request Sample",
        "Request Payload Example",
        "Request Payload",
        "request payload",
        "Example"
      ];
      for (const alt of altMarkers) {
        const altIdx = text.indexOf(alt);
        if (altIdx !== -1) {
          console.log(
            `  Found alternate marker "${alt}" at position ${altIdx}`
          );
          const jsonBlock = extractJsonBlock(text, altIdx);
          if (jsonBlock) {
            console.log(`  JSON block (first 300 chars):`);
            console.log(jsonBlock.substring(0, 300));
          }
        }
      }
      continue;
    }

    console.log(`✅ Marker found at position ${idx}`);
    const jsonBlock = extractJsonBlock(text, idx);
    if (jsonBlock) {
      console.log(`JSON block (first 500 chars):`);
      console.log(jsonBlock.substring(0, 500));

      try {
        let fixed = jsonBlock
          .replace(/\u201c/g, '"')
          .replace(/\u201d/g, '"')
          .replace(/'/g, "'")
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]");
        JSON.parse(fixed);
        console.log("\n✅ JSON is VALID after cleanup");
      } catch (e) {
        console.log("\n❌ JSON parse error:", e.message);
      }
    } else {
      console.log("❌ No JSON block found after marker");
    }
  }
})();
