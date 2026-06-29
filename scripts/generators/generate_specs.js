import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, "api_specs_data.json");
const templatePath = path.join(__dirname, "template.js");
const targetDir = path.join(__dirname, "../tests/api-readiness/ctlst");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const rawTemplate = fs.readFileSync(templatePath, "utf8");

data.forEach((api) => {
  let emptyPayloadComment = "";
  if (Object.keys(api.payload).length === 0) {
    emptyPayloadComment = `\n// TODO: Request Payload could not be parsed automatically from Confluence. Please add manually.\n`;
  }

  const fileName =
    api.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + ".spec.js";
  const filePath = path.join(targetDir, fileName);

  const envVarName = api.title.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const tcPrefixU = envVarName.split("_").slice(0, 2).join("").substring(0, 8);
  const tcPrefix = tcPrefixU.toLowerCase();
  const lowerTitle = fileName.replace(".spec.js", "");

  let content = rawTemplate
    .replace(/\{\{TITLE\}\}/g, api.title)
    .replace(/\{\{ID\}\}/g, api.id)
    .replace(/\{\{URL\}\}/g, api.url)
    .replace(/\{\{ENV_VAR\}\}/g, envVarName)
    .replace(/\{\{LOWER_TITLE\}\}/g, lowerTitle)
    .replace(/\{\{TC_PREFIX\}\}/g, tcPrefix)
    .replace(/\{\{TC_PREFIX_U\}\}/g, tcPrefixU)
    .replace(/\{\{COMMENT\}\}/g, emptyPayloadComment)
    .replace(/\{\{PAYLOAD\}\}/g, JSON.stringify(api.payload, null, 4));

  fs.writeFileSync(filePath, content);
  console.log(`Generated ${filePath}`);
});
