require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

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

// The Request Spec pages
const pages = [
  { name: "Contact Request Spec", id: "9405969" },
  { name: "Header Request Spec", id: "9405981" },
  // Also try the parent pages
  { name: "Contact Parent", id: "9419670" },
  { name: "Header Parent", id: "9405939" }
];

(async () => {
  for (const p of pages) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`${p.name} (ID: ${p.id})`);
    console.log("=".repeat(60));

    const page = await fetchPage(p.id);
    if (!page || !page.title) {
      console.log("Page not found");
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
    console.log("Text length:", text.length);

    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body",
      "Sample Request",
      "Example Request",
      "Example"
    ];
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx !== -1) {
        console.log(`Found: "${m}" at pos ${idx}`);
        console.log("Content:", text.substring(idx, idx + 800));

        const json = extractJsonBlock(text, idx);
        if (json) {
          console.log("\nJSON:", json.substring(0, 500));
          try {
            JSON.parse(
              json
                .replace(/\u201c/g, '"')
                .replace(/\u201d/g, '"')
                .replace(/,\s*}/g, "}")
            );
            console.log("✅ VALID");
          } catch (e) {
            console.log("❌", e.message);
          }
        }
        break;
      }
    }
  }
})();
