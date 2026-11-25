// The entry point: npm run dev (or npm start after npm run build).
import { createApp } from "./app.js";
import { createDependencies } from "./composition-root.js";
import { loadConfig } from "./config.js";
import { createPool } from "./shared/db/pool.js";
import { createLogger } from "./shared/logger.js";

const config = loadConfig(); // stops here with a clear message if .env is wrong
const logger = createLogger(config.LOG_LEVEL);
const pool = createPool(config.DATABASE_URL, logger);
const app = createApp(createDependencies({ pool, logger }));

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, `Restaurants API running on http://localhost:${config.PORT}`);
});

// GRACEFUL SHUTDOWN
// Ctrl+C sends SIGINT. Docker, Kubernetes and Cloud Run send SIGTERM when they stop a container,
// and kill it for good a few seconds later. In both cases we stop taking new requests,
// let the ones in progress finish, and close the database connections cleanly.
const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down");

  // If something hangs, don't wait forever.
  setTimeout(() => {
    logger.error("Shutdown took too long, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  server.close(async (error) => {
    try {
      await pool.end();
    } finally {
      logger.info("Shutdown complete");
      process.exit(error ? 1 : 0);
    }
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// An error nobody caught means the app may be in a broken state. The safe thing is to log it
// and exit, so the platform starts a fresh process, instead of carrying on half-broken.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});
