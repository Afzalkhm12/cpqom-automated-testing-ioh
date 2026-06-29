import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const email = process.env.JIRA_EMAIL;
const token = process.env.JIRA_API_TOKEN;
const auth = Buffer.from(`${email}:${token}`).toString("base64");

const pageIds = [
  "5680716",
  "5679120",
  "5679577",
  "5674965",
  "5678704",
  "5680304",
  "5678068",
  "5674748",
  "5679212",
  "5676234",
  "5679305",
  "5679096",
  "5669821",
  "5679340",
  "5681082",
  "45613263",
  "5679473",
  "5679070",
  "5682601",
  "5675074",
  "7766978",
  "5682028",
  "5680627",
  "9419670",
  "9405939",
  "1009385510"
];

async function fetchPage(id) {
  const res = await fetch(
    `https://indosat.atlassian.net/wiki/rest/api/content/${id}?expand=body.storage`,
    {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" }
    }
  );
  if (!res.ok) {
    console.error(`Failed to fetch page ${id}:`, res.status, res.statusText);
    return null;
  }
  return res.json();
}

function extractJson(text, marker) {
  const index = text.indexOf(marker);
  if (index === -1) return null;

  let start = text.indexOf("{", index);
  if (start === -1) return null;

  let stack = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") stack++;
    if (text[i] === "}") {
      stack--;
      if (stack === 0) {
        return text.substring(start, i + 1);
      }
    }
  }
  return null;
}

async function run() {
  const results = [];

  for (const id of pageIds) {
    console.log(`Fetching ${id}...`);
    const data = await fetchPage(id);
    if (!data) continue;

    const title = data.title;
    const html = data.body?.storage?.value || "";

    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");

    let url = "TBD";
    const urlMatch = text.match(/(http:\/\/[^\s]+?\/sit\/[^\s<]+)/i);
    if (urlMatch) {
      url = urlMatch[1];
    }

    let payloadStr =
      extractJson(text, "Request Payload Example") ||
      extractJson(text, "Request Payload") ||
      extractJson(text, "Example");
    let payload = {};
    if (payloadStr) {
      try {
        payloadStr = payloadStr
          .replace(/“/g, '"')
          .replace(/”/g, '"')
          .replace(/\s+/g, " ");
        payload = JSON.parse(payloadStr);
      } catch (e) {
        console.error(`Failed to parse JSON for ${id}:`, e.message);
      }
    } else {
      console.warn(`No Request Payload found for ${id}`);
    }

    results.push({
      id,
      title,
      url,
      payloadStr: payloadStr ? "found" : "not found",
      payload
    });
  }

  fs.writeFileSync(
    path.join(__dirname, "api_specs_data.json"),
    JSON.stringify(results, null, 2)
  );
  console.log("Done extracting data! Total extracted: " + results.length);
}

run();
