import pg from "pg";
import type { Logger } from "../logger.js";

// A "pool" keeps a few database connections open and reuses them.
// Opening a new connection for every request would be slow.
export function createPool(databaseUrl: string, logger: Logger): pg.Pool {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });

  // If an IDLE connection breaks (the database restarts, the network drops), the pool emits "error".
  // Without a listener, Node treats it as an unhandled error and the whole app crashes.
  // The pool already throws away the broken connection, so logging it is enough.
  pool.on("error", (error) => {
    logger.error({ err: error }, "Idle database connection error");
  });

  return pool;
}
