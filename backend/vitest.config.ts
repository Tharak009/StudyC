import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
    sequence: { concurrent: false },
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"]
    }
  }
});

