import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    root: "./src",
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/types/**"],
    },
    projects: [
      {
        test: {
          name: "unit",
          include: [
            "__tests__/unit/**/*.test.ts",
            "__tests__/property/**/*.test.ts",
          ],
          environment: "node",
          globals: true,
          pool: "threads",
        },
      },
      {
        test: {
          name: "integration",
          include: ["__tests__/integration/**/*.test.ts"],
          environment: "node",
          globals: true,
          pool: "forks",
          maxWorkers: 1,
          globalSetup: ["__tests__/setup/globalSetup.ts"],
          setupFiles: ["__tests__/setup/integrationSetup.ts"],
          sequence: {
            concurrent: false,
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
