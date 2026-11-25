import { pino } from "pino";

// STRUCTURED LOGS: every line is a JSON object, not free text. For example:
//   {"level":30,"time":1764100000000,"reqId":"7f3c...","req":{"method":"GET","url":"/restaurants"},"msg":"request completed"}
// Machines can search and filter them (e.g. "every error for this reqId"), which is what
// log tools in the cloud, like Google Cloud Logging, expect.
// In development, "npm run dev" pipes them through pino-pretty, so they're easy to read.

export type Logger = pino.Logger;
export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export function createLogger(level: LogLevel): Logger {
  return pino({
    level,
    // Never write secrets to the logs, even by accident.
    redact: ["req.headers.authorization", "req.headers.cookie"],
  });
}
