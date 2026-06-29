require("dotenv").config();
const https = require("https");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

// Confluence short links (/wiki/x/...) resolve via redirect. Let's follow them.
const urls = {
  "Opportunity Contact": [
    "/wiki/x/B4aP",
    "/wiki/x/EYaP",
    "/wiki/x/E4aP",
    "/wiki/x/D4aP"
  ],
  "Opportunity Header": [
    "/wiki/x/IYaP",
    "/wiki/x/HYaP",
    "/wiki/x/H4aP",
    "/wiki/x/9YWP"
  ]
};

function followRedirect(path) {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "indosat.atlassian.net",
        path: path,
        method: "GET",
        headers: { Authorization: "Basic " + auth }
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          resolve(res.headers.location);
        } else {
          let data = "";
          res.on("data", (d) => (data += d));
          res.on("end", () => {
            // Try to extract page ID from the response or URL
            const match = data.match(/\/pages\/(\d+)\//);
            resolve(
              match
                ? "pageId:" + match[1]
                : "status:" + res.statusCode + " path:" + path
            );
          });
        }
      }
    );
    req.end();
  });
}

function fetchPageById(id) {
  return new Promise((resolve) => {
    https
      .request(
        {
          hostname: "indosat.atlassian.net",
          path: "/wiki/rest/api/content/" + id + "?expand=body.storage,title",
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
  for (const [name, paths] of Object.entries(urls)) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`API: ${name}`);
    console.log("=".repeat(60));

    for (const path of paths) {
      console.log(`\n--- Checking ${path} ---`);
      const result = await followRedirect(path);
      console.log("Redirect result:", result);

      // Try to extract page ID from redirect URL
      let pageId = null;
      if (result && result.startsWith("pageId:")) {
        pageId = result.replace("pageId:", "");
      } else if (result) {
        const match = result.match(/\/pages\/(\d+)/);
        if (match) pageId = match[1];
      }

      if (pageId) {
        console.log("Page ID:", pageId);
        const page = await fetchPageById(pageId);
        if (page && page.title) {
          console.log("Title:", page.title);
          const html = page.body?.storage?.value || "";
          const text = html
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");

          // Search for payload markers
          const markers = [
            "Request Payload Example",
            "Request Payload",
            "Request Sample",
            "Request Body",
            "Example"
          ];
          for (const m of markers) {
            const idx = text.indexOf(m);
            if (idx !== -1) {
              console.log(`Found marker "${m}"`);
              console.log(text.substring(idx, idx + 600));

              const json = extractJsonBlock(text, idx);
              if (json) {
                console.log("\nJSON block:");
                console.log(json.substring(0, 400));
                try {
                  JSON.parse(
                    json
                      .replace(/\u201c/g, '"')
                      .replace(/\u201d/g, '"')
                      .replace(/,\s*}/g, "}")
                  );
                  console.log("✅ JSON VALID");
                } catch (e) {
                  console.log("❌ JSON error:", e.message);
                }
              }
              break;
            }
          }
        }
      }
    }
  }
})();
