import { defineConfig } from "vitest/config";

// Two kinds of tests, as two Vitest "projects":
//   npm run test:unit         -> fast, no database, run in parallel
//   npm run test:integration  -> the whole API against a real PostgreSQL
//   npm test                  -> both
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "test/*.todo.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          // Runs once before all integration files: checks the database and runs the migrations.
          globalSetup: ["test/integration/global-setup.ts"],
          // Every integration file shares ONE test database and empties it before each test.
          // If two files ran at the same time, one could wipe the other's data in the middle of a test.
          fileParallelism: false,
        },
      },
    ],
  },
});
