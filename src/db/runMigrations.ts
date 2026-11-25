import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";

// The .sql files live in db/migrations at the project root.
// From src/db (or dist/db after building) that is two folders up.
const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "db", "migrations");

/**
 * Runs every .sql file in db/migrations that hasn't run yet, in name order.
 * It remembers which ones ran in a small table called "schema_migrations".
 *
 * Real projects usually use a tool for this (Prisma, Knex, Flyway...).
 * We write a tiny one ourselves so you can see there's no magic.
 */
export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name   TEXT PRIMARY KEY,
      ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  const files = (await readdir(migrationsFolder)).filter((file) => file.endsWith(".sql")).sort();
  const alreadyRan = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  const ranNames = new Set(alreadyRan.rows.map((row) => row.name));

  const newlyRan: string[] = [];
  for (const file of files) {
    if (ranNames.has(file)) continue;

    const sql = await readFile(path.join(migrationsFolder, file), "utf8");
    // A transaction: the migration and its "I ran" record are saved together, or not at all.
    // If the SQL fails halfway, ROLLBACK undoes everything, so the database is never half-changed.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      newlyRan.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    } finally {
      client.release(); // give the connection back to the pool
    }
  }
  return newlyRan;
}
