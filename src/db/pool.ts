import pg from "pg";

// A "pool" keeps a few database connections open and reuses them.
// Opening a new connection for every request would be slow.
export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl, max: 10 });
}
