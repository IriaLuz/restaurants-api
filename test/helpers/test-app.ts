// Shared helpers for the integration tests, so every test file builds the app the same way.
import "dotenv/config";
import type pg from "pg";
import { createApp } from "../../src/app.js";
import { createDependencies } from "../../src/composition-root.js";
import { createPool } from "../../src/shared/db/pool.js";
import { createLogger } from "../../src/shared/logger.js";

export interface TestContext {
  pool: pg.Pool;
  app: ReturnType<typeof createApp>;
}

/** The REAL app, with the REAL Postgres repositories, pointed at the test database. */
export function createTestContext(): TestContext {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");

  const logger = createLogger("silent"); // no logs in the test output
  const pool = createPool(url, logger);
  const app = createApp(createDependencies({ pool, logger }));
  return { pool, app };
}

/**
 * Empties the tables, so every test starts from zero.
 * CASCADE also empties every table that points at restaurants with a foreign key
 * (like the opening hours you'll add), otherwise Postgres refuses to TRUNCATE.
 */
export async function resetDatabase(pool: pg.Pool): Promise<void> {
  await pool.query("TRUNCATE restaurants CASCADE");
}
