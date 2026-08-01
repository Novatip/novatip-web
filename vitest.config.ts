/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest configuration for novatip-web.
 *
 * - jsdom environment so React components render correctly
 * - vite-tsconfig-paths resolves the @/* alias from tsconfig.json
 * - setupFiles loads @testing-library/jest-dom matchers globally
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    alias: {
      // Resolve the uninstalled workspace package to our hand-written stub
      "@novatip/sdk": new URL("./src/test/mocks/novatip-sdk.ts", import.meta.url)
        .pathname,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
});
