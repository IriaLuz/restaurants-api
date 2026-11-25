// Runs ONCE before all the integration tests (see vitest.config.ts).
// If the test database isn't configured or isn't running, we stop here with a clear message,
// instead of letting every test fail with a confusing connection error.
import "dotenv/config";
import { createPool } from "../../src/shared/db/pool.js";
import { runMigrations } from "../../src/shared/db/run-migrations.js";

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Copy .env.example to .env (cp .env.example .env).");
  }

  const pool = createPool(url);
  try {
    await runMigrations(pool); // creates or updates the tables, once for the whole run
  } catch (error) {
    throw new Error(
      `Can't prepare the test database. Is it running? Try: docker compose up -d\n${(error as Error).message}`,
    );
  } finally {
    await pool.end();
  }
}
