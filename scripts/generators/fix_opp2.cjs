require("dotenv").config();
const https = require("https");
const http = require("http");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

function followRedirects(url, maxRedirects = 10) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          Authorization: "Basic " + auth,
          Accept: "text/html,application/json"
        }
      },
      (res) => {
        if (
          (res.statusCode === 301 || res.statusCode === 302) &&
          res.headers.location &&
          maxRedirects > 0
        ) {
          let loc = res.headers.location;
          if (loc.startsWith("/"))
            loc = parsed.protocol + "//" + parsed.hostname + loc;
          resolve(followRedirects(loc, maxRedirects - 1));
        } else {
          let data = "";
          res.on("data", (d) => (data += d));
          res.on("end", () => {
            // Extract page ID from final URL or body
            const finalUrl = parsed.pathname + parsed.search;
            const pageMatch = data.match(/\/pages\/(\d+)/);
            resolve({
              finalUrl: url,
              status: res.statusCode,
              pageId: pageMatch ? pageMatch[1] : null,
              bodyLen: data.length
            });
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

const allUrls = [
  { name: "Contact", url: "https://indosat.atlassian.net/wiki/x/B4aP" },
  { name: "Contact", url: "https://indosat.atlassian.net/wiki/x/EYaP" },
  { name: "Contact", url: "https://indosat.atlassian.net/wiki/x/E4aP" },
  { name: "Contact", url: "https://indosat.atlassian.net/wiki/x/D4aP" },
  { name: "Header", url: "https://indosat.atlassian.net/wiki/x/IYaP" },
  { name: "Header", url: "https://indosat.atlassian.net/wiki/x/HYaP" },
  { name: "Header", url: "https://indosat.atlassian.net/wiki/x/H4aP" },
  { name: "Header", url: "https://indosat.atlassian.net/wiki/x/9YWP" }
];

(async () => {
  for (const item of allUrls) {
    console.log(`\n--- ${item.name}: ${item.url} ---`);
    const result = await followRedirects(item.url);
    console.log("Result:", JSON.stringify(result));

    if (result.pageId) {
      const page = await fetchPageById(result.pageId);
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

        const markers = [
          "Request Payload Example",
          "Request Payload",
          "Request Sample",
          "Request Body"
        ];
        for (const m of markers) {
          const idx = text.indexOf(m);
          if (idx !== -1) {
            console.log(`Found: "${m}"`);
            const json = extractJsonBlock(text, idx);
            if (json) {
              console.log("JSON:", json.substring(0, 300));
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
            } else {
              // Maybe XML
              console.log("Text after marker:", text.substring(idx, idx + 400));
            }
            break;
          }
        }
      }
    }
  }
})();
