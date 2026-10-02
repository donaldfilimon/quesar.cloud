#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs explicitly via `bun run db:migrate` before deployment, applying pending files
 * in ../migrations to DATABASE_URL. Each file is applied in one transaction and
 * recorded in a `_migrations` table, so it runs once and is safe to re-run.
 *
 * The read is non-recursive, so the opt-in auth schema under migrations/auth/
 * is not applied to an app that never asked for sign-in.
 *
 * An explicit migration requires DATABASE_URL; local PGLite applies the same
 * files lazily instead (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { pendingMigrations } from "./migration-plan.ts";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

export async function migrate(databaseUrl: string, directory = migrationsDir) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  let client: pg.PoolClient | undefined;
  try {
    client = await pool.connect();
    // Session lock lives on this exact connection through discovery and recording.
    await client.query("SELECT pg_advisory_lock(716483, 1)");
    const entries = await readdir(directory);
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query<{ name: string }>("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(directory, name), "utf8");
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(
      count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.",
    );
  } finally {
    try {
      if (client) {
        try {
          await client.query("SELECT pg_advisory_unlock(716483, 1)");
        } finally {
          client.release();
        }
      }
    } finally {
      await pool.end();
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("[migrate] DATABASE_URL is required for explicit migration.");
    process.exitCode = 1;
  } else {
    migrate(databaseUrl).catch(() => {
      // Driver errors may embed connection URLs or SQL data; never print them.
      console.error(
        "[migrate] failed; inspect database state using the authorized operator connection.",
      );
      process.exitCode = 1;
    });
  }
}
