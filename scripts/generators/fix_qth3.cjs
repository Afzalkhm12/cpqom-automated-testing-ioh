require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

// Fetch children/sibling pages of the user-provided page to find the real transaction history spec
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
  // Try the CMP space page - it might have the right content
  const page = await fetchPage("5679350");
  console.log("CMP Page Title:", page?.title);
  const html = page?.body?.storage?.value || "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Find URL
  const urls = text.match(/https?:\/\/[^\s,<>]+/gi);
  console.log("URLs:", urls);

  // Find payload markers
  const markers = [
    "Request Payload Example",
    "Request Payload",
    "Request Sample"
  ];
  for (const m of markers) {
    const idx = text.indexOf(m);
    if (idx !== -1) {
      console.log(`Found: "${m}"`);
      const json = extractJsonBlock(text, idx);
      if (json) {
        try {
          const fixed = json.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
          const parsed = JSON.parse(fixed);
          console.log("Payload:", JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log("Parse error. Raw:", json.substring(0, 500));
        }
      } else {
        console.log("No JSON after marker");
        console.log(text.substring(idx, idx + 500));
      }
      break;
    }
  }

  // Also check what URL pattern the flex portal uses
  // The page title in PSD is about flex-mobile-portal, likely the URL is /querytransactionhistory
  console.log("\n--- Checking PSD page children ---");
  // Fetch PSD ancestors
  const psdPage = await fetchPage("1162510337");
  const psdHtml = psdPage?.body?.storage?.value || "";
  const psdText = psdHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Search for querytransaction
  const qthIdx = psdText.indexOf("querytransaction");
  if (qthIdx !== -1) {
    console.log("Found querytransaction at", qthIdx);
    console.log(psdText.substring(qthIdx - 100, qthIdx + 200));
  } else {
    console.log("querytransaction not found in PSD page");
  }
})();
