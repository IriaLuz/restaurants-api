import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import type { Logger } from "../logger.js";

/**
 * Logs one line per request (method, url, status, time it took) and gives every request an id.
 *
 * The id comes from the "X-Request-Id" header if the caller sent one (for example a gateway
 * in front of the API), or we create one. It goes back in the response header too.
 * Every log line for that request carries it, so you can follow one request from start to end.
 *
 * It also adds req.log: a logger that already includes the request id.
 */
export function createRequestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers["x-request-id"];
      const id = typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128 ? incoming : randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    // 5xx are our bugs (error), 4xx are the client's mistakes (warn), the rest is normal (info).
    customLogLevel(_req, res, error) {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  });
}
