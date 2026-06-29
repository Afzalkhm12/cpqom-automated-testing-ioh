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

(async () => {
  // ResumeApprovalRequest - we know it has XML payload, show more of it
  {
    const data = await fetchPage("5675074");
    const html = data.body.storage.value;
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    const idx = text.indexOf("Request Payload Example");
    console.log("=== ResumeApprovalRequest FULL PAYLOAD ===");
    console.log(text.substring(idx, idx + 1500));
  }

  // For the other two, show ALL text to find payload
  for (const api of apis.slice(1)) {
    const data = await fetchPage(api.id);
    const html = data.body.storage.value;
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    console.log(`\n=== ${api.title} FULL TEXT (${text.length} chars) ===`);
    console.log(text.substring(0, 3000));
    console.log("\n... (truncated) ...");
  }
})();
