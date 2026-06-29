require("dotenv").config();
const https = require("https");
const fs = require("fs");
const auth = Buffer.from(
  process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
).toString("base64");

const apis = [
  { id: "939589815", title: "Activate Profile PCRF RFS_NEWREG_PCRF ADD" },
  { id: "944930839", title: "Activate Volte HLR RFS_VOLTE_PROVISIONING ADD" },
  { id: "945291265", title: "Add Package PCRF RFS_CHANGE_BASIC_PO_PCRF ADD" },
  { id: "944766977", title: "Block Asset HLR RFS_BAR ADD" },
  {
    id: "944767052",
    title: "Change Package PCRF RFS_CHANGE_BASIC_PO_PCRF SET"
  },
  { id: "946176001", title: "Change SIM HLR RFS_CHANGE_IMSI ADD" },
  {
    id: "956628993",
    title: "Deactivate Network HLR RFS_NEWREG_VOICE_DATA_SUPP DEL"
  },
  { id: "955449420", title: "Deactivate Volte HLR RFS_VOLTE_PROVISIONING DEL" },
  {
    id: "945291340",
    title: "Delete Package PCRF RFS_CHANGE_BASIC_PO_PCRF DEL"
  },
  {
    id: "1109098497",
    title: "Modify IDD International Roaming RFS_CHANGE_BASIC_PO_IDD_INTL SET"
  },
  {
    id: "930644010",
    title: "Activate Network HLR RFS_NEWREG_VOICE_DATA_SUPP ADD"
  },
  { id: "955449495", title: "Resume Mobile Product HLR RFS_SUSPEND DEL" },
  { id: "955449345", title: "Suspend Mobile Product HLR RFS_SUSPEND SET" },
  { id: "956694529", title: "Terminate Profile PCRF RFS_NEWREG_PCRF DEL" },
  { id: "943882359", title: "Unblock Asset HLR RFS_BAR DEL" },
  { id: "955449570", title: "Unblock SMS HLR RFS_SMS DEL" },
  {
    id: "944799746",
    title: "Update Network HLR RFS_CHANGE_BASIC_PO_VOICE_DATA_SUPP SET"
  }
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

function cleanText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/\s+/g, " ");
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
  const results = [];
  for (const api of apis) {
    console.log(`\n--- ${api.title} (${api.id})`);
    const page = await fetchPage(api.id);
    if (!page || !page.title) {
      console.log("❌ Not found");
      continue;
    }

    const text = cleanText(page.body?.storage?.value || "");

    // Method
    const methodMatch =
      text.match(/Method\s*[:\|]\s*(GET|POST|PUT|PATCH|DELETE)/i) ||
      text.match(/(GET|POST|PUT|PATCH|DELETE)\s*\(?Rest\)?/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "POST";

    // URL
    const urlPatterns = [
      /(https?:\/\/(?:dev-cgw|tm-route|bi-)[^\s<>,"]+)/i,
      /(?:SIT)[^:]*:\s*(https?:\/\/[^\s<>,"]+)/i,
      /(https?:\/\/[^\s<>,"]+(?:sit|dev)[^\s<>,"]*)/i
    ];
    let url = "TBD";
    for (const pat of urlPatterns) {
      const m = text.match(pat);
      if (m) {
        url = m[1].replace(/\s/g, "").split(",")[0];
        break;
      }
    }

    // Payload
    const markers = [
      "Request Payload Example",
      "Request Payload",
      "Request Sample",
      "Request Body"
    ];
    let payload = null;
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx === -1) continue;
      const jsonStr = extractJsonBlock(text, idx);
      if (jsonStr) {
        try {
          const fixed = jsonStr
            .replace(/\u201c|\u201d/g, '"')
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]");
          payload = JSON.parse(fixed);
          console.log(`✅ [${m}] Method:${method} URL:${url}`);
          console.log("   Preview:", JSON.stringify(payload).substring(0, 160));
        } catch (e) {
          console.log(
            `❌ [${m}] parse error: ${e.message}. Raw:`,
            jsonStr.substring(0, 200)
          );
        }
      } else {
        console.log(
          `⚠️  [${m}] no JSON. After:`,
          text.substring(idx, idx + 300)
        );
      }
      break;
    }
    if (!payload)
      console.log("⚠️  No payload found. Method:", method, "URL:", url);

    results.push({
      id: api.id,
      group: "eda",
      title: page.title,
      method,
      url,
      payload
    });
  }

  fs.writeFileSync(
    "scripts/generators/eda_specs.json",
    JSON.stringify(results, null, 2)
  );
  console.log(`\n\nSaved ${results.length} results to scripts/eda_specs.json`);
})();
