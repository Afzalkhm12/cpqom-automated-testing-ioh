/**
 * Parse B2B-SIT-MVP3.csv into scenarios.json
 *
 * Run: node scripts/generators/parse-mvp3-csv.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.resolve(__dirname, "B2B-SIT-MVP3.csv");
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../../test-data/sit-mvp3/scenarios.json"
);

/**
 * Parse a semicolon-delimited CSV with quoted multi-line fields.
 */
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ";") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        // Skip \r
      } else if (char === "\n" && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((f) => f !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  // Push last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Read and parse
const raw = fs.readFileSync(CSV_FILE, "utf8");
const rows = parseCSV(raw);

// Header row
const headers = rows[0];
console.log("Headers:", headers);

// Parse data rows into structured JSON
const scenarios = {};

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const id = row[0]; // No column
  if (!id || !id.startsWith("IPH-")) continue;

  scenarios[id] = {
    id,
    scenario: row[1] || "",
    description: row[2] || "",
    prerequisites: (row[3] || "")
      .split(/\n/)
      .map((s) => s.replace(/^\d+\.\d+\s*/, "").trim())
      .filter(Boolean),
    testData: row[4] || "",
    steps: (row[5] || "")
      .split(/\n/)
      .map((s) => s.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean),
    expectedResults: (row[6] || "")
      .split(/\n/)
      .map((s) => s.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean),
    startDate: row[7] || "",
    dueDate: row[8] || "",
    environment: row[9] || "SIT",
    epic: row[10] || "New Connect Fixed Line IPHONE",
    status: row[11] || "",
    category: row[12] || "Positive",
    integration: row[13] || "None",
    downstream: row[14] || ""
  };
}

// Write output
const dir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(scenarios, null, 2));

console.log(`\nParsed ${Object.keys(scenarios).length} scenarios`);
console.log(`Output: ${OUTPUT_FILE}`);
