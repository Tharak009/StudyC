import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    sequence: { concurrent: false },
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"]
    }
  }
});
