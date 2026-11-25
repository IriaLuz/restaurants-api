// Run with: npm run db:migrate
import { loadConfig } from "../config.js";
import { createPool } from "./pool.js";
import { runMigrations } from "./runMigrations.js";

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);

try {
  const ran = await runMigrations(pool);
  console.log(ran.length ? `Ran migrations: ${ran.join(", ")}` : "Database is already up to date.");
} finally {
  await pool.end();
}
