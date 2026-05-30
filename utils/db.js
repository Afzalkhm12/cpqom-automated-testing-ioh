import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "sfdc_test_manager",
  user: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "enakmangan"
});

export async function getModule(moduleKey) {
  const { rows } = await pool.query(
    "SELECT * FROM test_modules WHERE module_key = $1",
    [moduleKey]
  );
  return rows[0];
}

export async function getUserIdForRun(runId) {
  const { rows } = await pool.query(
    "SELECT user_id FROM product_test_runs WHERE id = $1",
    [runId]
  );
  return rows[0]?.user_id ?? null;
}

export async function getTestParams(moduleKey, testCaseId, userId) {
  const { rows } = await pool.query(
    `SELECT tp.parameters
         FROM test_parameters tp
         JOIN test_modules tm ON tp.module_id = tm.id
         WHERE tm.module_key = $1 AND tp.test_case_id = $2 AND tp.user_id = $3`,
    [moduleKey, testCaseId, userId]
  );
  return rows[0]?.parameters ?? {};
}

export async function getRuntimeState(stateKey) {
  const { rows } = await pool.query(
    "SELECT state_value FROM runtime_state WHERE state_key = $1",
    [stateKey]
  );
  return rows[0]?.state_value ?? null;
}

export async function setRuntimeState(stateKey, stateValue) {
  await pool.query(
    `UPDATE runtime_state
         SET state_value = $1, last_updated_at = NOW()
         WHERE state_key = $2`,
    [stateValue, stateKey]
  );
}

export async function updateTestParams(moduleKey, testCaseId, userId, params) {
  await pool.query(
    `UPDATE test_parameters
         SET parameters = parameters || $1::jsonb, updated_at = NOW()
         WHERE module_id = (SELECT id FROM test_modules WHERE module_key = $2)
           AND test_case_id = $3
           AND user_id = $4`,
    [JSON.stringify(params), moduleKey, testCaseId, userId]
  );
}

export async function incrementModuleCounter(moduleKey) {
  const { rows } = await pool.query(
    `UPDATE test_modules
         SET counter = counter + 1
         WHERE module_key = $1
         RETURNING counter`,
    [moduleKey]
  );
  return rows[0]?.counter ?? null;
}

/**
 * Updates a product_test_runs row.
 * Only the fields present in payload are written; others are left unchanged.
 * Pass finished_at: new Date() (or true) to stamp the current time.
 */
export async function updateRun(
  runId,
  { status, log, created_ids, jira_ticket, finished_at } = {}
) {
  if (!runId) return;
  const setParts = [];
  const values = [];
  let i = 1;
  if (status !== undefined) {
    setParts.push(`status = $${i++}`);
    values.push(status);
  }
  if (log !== undefined) {
    setParts.push(`log = $${i++}`);
    values.push(log);
  }
  if (created_ids !== undefined) {
    setParts.push(`created_ids = $${i++}`);
    values.push(JSON.stringify(created_ids));
  }
  if (jira_ticket !== undefined) {
    setParts.push(`jira_ticket = $${i++}`);
    values.push(jira_ticket);
  }
  if (finished_at !== undefined) {
    setParts.push(`finished_at = $${i++}`);
    values.push(finished_at === true ? new Date() : finished_at);
  }
  if (setParts.length === 0) return;
  values.push(runId);
  await pool.query(
    `UPDATE product_test_runs SET ${setParts.join(", ")} WHERE id = $${i}`,
    values
  );
}

export async function closeDb() {
  await pool.end();
}
