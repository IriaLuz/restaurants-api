import "dotenv/config"; // reads the .env file into process.env
import { z } from "zod";
import { LOG_LEVELS } from "./shared/logger.js";

// Environment variables are just strings from outside the app, so we validate them once, at startup.
// If something is missing, the app stops straight away with a clear message,
// instead of failing later in a confusing way.
const configSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is missing. Copy .env.example to .env"),
  PORT: z.coerce.number().int().positive().default(3000), // "3000" (string) -> 3000 (number)
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid configuration:\n${problems.join("\n")}`);
  }
  return result.data;
}
