// The entry point: npm run dev (or npm start after npm run build).
import { createApp } from "./app.js";
import { createDependencies } from "./composition-root.js";
import { loadConfig } from "./config.js";
import { createPool } from "./shared/db/pool.js";
import { createLogger } from "./shared/logger.js";

const config = loadConfig(); // stops here with a clear message if .env is wrong
const logger = createLogger(config.LOG_LEVEL);
const pool = createPool(config.DATABASE_URL);
const app = createApp(createDependencies({ pool, logger }));

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, `Restaurants API running on http://localhost:${config.PORT}`);
});

// When you press Ctrl+C, stop taking requests and close the database connections cleanly.
process.on("SIGINT", () => {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
});
