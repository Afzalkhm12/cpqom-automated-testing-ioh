require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

// APIs that returned "No JSON block found after marker"
const apis = [
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
    id: "5679340",
    title: "SIMReplacementValidation",
    marker: "Request Payload Example"
  },
  { id: "5682601", title: "evValidateCatSR", marker: "Request Payload" }
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

    const idx = text.indexOf(api.marker);
    if (idx === -1) {
      console.log("Marker not found");
      continue;
    }

    // Show 1000 chars after marker to see what format the payload is in
    console.log(`Content after "${api.marker}" (1000 chars):`);
    console.log(text.substring(idx, idx + 1000));
  }
})();
