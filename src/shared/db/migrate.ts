// Run with: npm run db:migrate
import { loadConfig } from "../../config.js";
import { createLogger } from "../logger.js";
import { createPool } from "./pool.js";
import { runMigrations } from "./run-migrations.js";

const config = loadConfig();
const pool = createPool(config.DATABASE_URL, createLogger(config.LOG_LEVEL));

try {
  const ran = await runMigrations(pool);
  console.log(ran.length ? `Ran migrations: ${ran.join(", ")}` : "Database is already up to date.");
} finally {
  await pool.end();
}
