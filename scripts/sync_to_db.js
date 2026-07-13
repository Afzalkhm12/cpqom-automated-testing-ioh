import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();
const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYNC_DIRS = [
  path.resolve(__dirname, "../tests/api-readiness"),
  path.resolve(__dirname, "../tests/sit-mvp3")
];

const pool = new Pool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "sfdc_test_manager",
  user: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "enakmangan"
});

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (fullPath.endsWith(".spec.js")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function syncToDb() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Default system user for these params
    const userRes = await client.query(
      "SELECT id FROM users ORDER BY id ASC LIMIT 1"
    );
    const defaultUserId = userRes.rows[0]?.id || 1;

    let files = [];
    for (const dir of SYNC_DIRS) {
      if (fs.existsSync(dir)) {
        files = files.concat(scanDirectory(dir));
      }
    }
    let specsCreated = 0;
    let modulesUpdated = 0;

    console.log(`Found ${files.length} specs to sync.`);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf8");

      // Identify base directory to determine group name
      const baseDir =
        SYNC_DIRS.find((dir) => filePath.startsWith(dir)) || SYNC_DIRS[0];
      const relativePath = path.relative(baseDir, filePath);

      let baseFolderName = path.basename(baseDir); // e.g. "api-readiness" or "sit-mvp3"
      let groupName = path.dirname(relativePath).split(path.sep)[0];
      if (groupName === ".") groupName = path.basename(filePath, ".spec.js");

      // For display logic
      const categoryPrefix =
        baseFolderName === "sit-mvp3" ? "SIT MVP3" : "API Readiness";
      const specDisplayName = `${categoryPrefix} - ${groupName.toUpperCase()}`;
      const specRunnerKey =
        `${baseFolderName.replace("-", "_")}_${groupName.toLowerCase()}`.replace(
          /[^a-z0-9_]/g,
          "_"
        );

      // Ensure TestSpec exists
      let specId;
      const specRes = await client.query(
        "SELECT id FROM test_specs WHERE runner_key = $1",
        [specRunnerKey]
      );
      if (specRes.rows.length > 0) {
        specId = specRes.rows[0].id;
      } else {
        const insertSpec = await client.query(
          `INSERT INTO test_specs (display_name, runner_key, test_type, created_at, updated_at) 
           VALUES ($1, $2, 'api', NOW(), NOW()) RETURNING id`,
          [specDisplayName, specRunnerKey]
        );
        specId = insertSpec.rows[0].id;
        specsCreated++;
      }

      // Extract metadata from file
      const titleMatch = content.match(/\* API Readiness Test — (.*)/);
      const title = titleMatch
        ? titleMatch[1].trim()
        : path.basename(filePath, ".spec.js");

      const moduleKeyMatch = content.match(/getTestParams\(['"]([^'"]+)['"]/);
      if (!moduleKeyMatch) continue;
      const moduleKey = moduleKeyMatch[1];

      const tcMatch = content.match(/getTestParams\([^,]+,\s*['"]([^'"]+)['"]/);
      const testCaseId = tcMatch ? tcMatch[1].substring(0, 20) : "tc_default";

      // Ensure TestModule exists (no conflict on category/salesforce_module since they might not be unique constraints, but we rely on module_key which should be unique).
      // Assuming test_modules.module_key is UNIQUE.

      const existingMod = await client.query(
        "SELECT id FROM test_modules WHERE module_key = $1",
        [moduleKey]
      );

      let moduleId;
      if (existingMod.rows.length > 0) {
        moduleId = existingMod.rows[0].id;
        await client.query(
          `UPDATE test_modules SET display_name = $1, spec_id = $2, updated_at = NOW() WHERE id = $3`,
          [title, specId, moduleId]
        );
      } else {
        const insMod = await client.query(
          `
          INSERT INTO test_modules (module_key, display_name, category, salesforce_module, spec_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id
        `,
          [moduleKey, title, categoryPrefix, groupName.toUpperCase(), specId]
        );
        moduleId = insMod.rows[0].id;
      }

      modulesUpdated++;

      // Ensure TestParameter exists so it can be seen/edited
      const existingParam = await client.query(
        "SELECT id FROM test_parameters WHERE module_id = $1 AND test_case_id = $2 AND user_id = $3",
        [moduleId, testCaseId, defaultUserId]
      );

      if (existingParam.rows.length === 0) {
        await client.query(
          `
          INSERT INTO test_parameters (module_id, user_id, test_case_id, parameters, created_at, updated_at)
          VALUES ($1, $2, $3, '{}'::jsonb, NOW(), NOW())
        `,
          [moduleId, defaultUserId, testCaseId]
        );
      }
    }

    await client.query("COMMIT");
    console.log(
      `Sync complete! Specs Created: ${specsCreated}, Modules Synced: ${modulesUpdated}`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error during sync:", err);
  } finally {
    client.release();
    pool.end();
  }
}

syncToDb();
