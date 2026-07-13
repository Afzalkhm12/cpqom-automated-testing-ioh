import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runtime state management for sequential E2E test flows.
 *
 * Stores IDs (opportunityId, quoteId, contractId, orderId, etc.)
 * in a JSON file so that spec files running in sequence can share state.
 *
 * Example flow:
 *   01-opportunity.spec.js  → setState('opportunityId', '006xxx')
 *   02-quote.spec.js        → getState('opportunityId') → '006xxx'
 */

const DEFAULT_STATE_FILE = path.resolve(
  __dirname,
  "../test-data/sit-mvp3/runtime-state.json"
);

/**
 * Get the state file path (allows override via env variable).
 */
function getStateFilePath() {
  return process.env.RUNTIME_STATE_FILE ?? DEFAULT_STATE_FILE;
}

/**
 * Read the full runtime state object.
 * @returns {object} The full state object, or empty object if file doesn't exist.
 */
export function getAllState() {
  const filePath = getStateFilePath();
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Get a specific value from runtime state.
 * @param {string} key - State key (e.g. 'opportunityId', 'quoteId')
 * @returns {any} The value, or undefined if not set.
 */
export function getState(key) {
  const state = getAllState();
  return state[key];
}

/**
 * Get a required state value. Throws if not set.
 * @param {string} key
 * @param {string} [errorHint] - Extra context for the error message
 * @returns {any}
 */
export function requireState(key, errorHint) {
  const value = getState(key);
  if (value === undefined || value === null) {
    throw new Error(
      `Runtime state '${key}' is not set. ` +
        (errorHint ?? "Ensure the preceding test spec ran successfully.")
    );
  }
  return value;
}

/**
 * Set a value in runtime state.
 * @param {string} key
 * @param {any} value
 */
export function setState(key, value) {
  const filePath = getStateFilePath();
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const state = getAllState();
  state[key] = value;
  state._lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

/**
 * Set multiple values at once.
 * @param {object} entries - Key-value pairs to set
 */
export function setStates(entries) {
  const filePath = getStateFilePath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const state = getAllState();
  Object.assign(state, entries);
  state._lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

/**
 * Clear all runtime state (for fresh test runs).
 */
export function clearState() {
  const filePath = getStateFilePath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify({ _clearedAt: new Date().toISOString() }, null, 2)
  );
  console.log(`Runtime state cleared: ${filePath}`);
}

/**
 * Print current runtime state to console (for debugging).
 */
export function dumpState() {
  const state = getAllState();
  console.log("─── Runtime State ───");
  console.log(JSON.stringify(state, null, 2));
  console.log("─────────────────────");
}
