import { Router } from "express";
import type { Logger } from "../../shared/logger.js";

export interface HealthDependencies {
  logger: Logger;
  /** Resolves if the database answers, rejects if it doesn't. */
  checkDatabase: () => Promise<void>;
}

/**
 * Two health checks, the way platforms like Kubernetes or Cloud Run use them:
 *
 *   GET /health        "liveness":  is the process alive? Never touches the database.
 *                      If this fails, the platform restarts the app.
 *   GET /health/ready  "readiness": can it serve requests right now? Checks the database.
 *                      If this fails, the platform stops sending traffic, but doesn't restart it.
 */
export function createHealthRouter({ logger, checkDatabase }: HealthDependencies): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/ready", async (_req, res) => {
    try {
      await checkDatabase();
      res.json({ status: "ready" });
    } catch (error) {
      logger.warn({ err: error }, "Readiness check failed: the database isn't answering");
      res.status(503).json({ status: "unavailable" }); // 503 Service Unavailable
    }
  });

  return router;
}
