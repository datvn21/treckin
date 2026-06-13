/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "src/test/**",
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "vitest.config.ts",
        "vite.config.ts",
      ],
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
  },
});
