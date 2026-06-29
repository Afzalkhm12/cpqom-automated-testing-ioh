require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

// Use Confluence REST API to search for pages by tinyui identifier
const tinyIds = [
  "B4aP",
  "EYaP",
  "E4aP",
  "D4aP",
  "IYaP",
  "HYaP",
  "H4aP",
  "9YWP"
];

function searchByTiny(tinyId) {
  return new Promise((resolve) => {
    // Confluence stores tiny links as base64-encoded page IDs
    // Decode: tinyId is base64url of the page ID bytes
    try {
      const buf = Buffer.from(tinyId, "base64");
      let pageId = 0;
      for (let i = 0; i < buf.length; i++) {
        pageId = pageId * 256 + buf[i];
      }
      resolve(pageId);
    } catch (e) {
      resolve(null);
    }
  });
}

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
              resolve({ status: res.statusCode });
            }
          });
        }
      )
      .end();
  });
}

(async () => {
  for (const tiny of tinyIds) {
    const pageId = await searchByTiny(tiny);
    console.log(`${tiny} => decoded pageId: ${pageId}`);
    if (pageId) {
      const page = await fetchPage(pageId);
      if (page && page.title) {
        console.log(`  ✅ Title: ${page.title}`);
        const html = page.body?.storage?.value || "";
        console.log(`  Content length: ${html.length} chars`);
      } else {
        console.log(
          `  ❌ Page not found or no access (status: ${page?.statusCode || page?.status})`
        );
      }
    }
  }
})();
