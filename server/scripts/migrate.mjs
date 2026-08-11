#!/usr/bin/env node
/**
 * Tiny forward-only migration runner for Treckin.
 *
 * Applies every `drizzle/<NNNN_*.sql>` file in lexical order whose filename has
 * not yet been recorded in the `__migrations` table. Designed to be the only
 * thing the backend container has to do at boot to be ready to serve traffic.
 *
 *   • Idempotent (safe to re-run on every container start)
 *   • No external dependencies — runs against the `pg` driver shipped as an
 *     application dep, no `drizzle-kit` binary required at runtime
 *   • Aborts the process on any error so the orchestrator can restart it
 *
 * Configure with DATABASE_URL (or PG*) env vars.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = resolve(__dirname, "..", "drizzle");

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
await client.query(`
  CREATE TABLE IF NOT EXISTS __migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
`);

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let applied = 0;
for (const file of files) {
  const { rows } = await client.query(
    "SELECT 1 FROM __migrations WHERE filename = $1",
    [file],
  );
  if (rows.length > 0) continue;

  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8").trim();
  if (!sql) continue;

  console.log(`[migrate] applying ${file}`);
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO __migrations(filename) VALUES ($1)", [file]);
    await client.query("COMMIT");
    applied += 1;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`[migrate] failed on ${file}:`, err);
    process.exit(1);
  }
}

await client.end();
console.log(`[migrate] done (${applied} new, ${files.length - applied} already applied)`);