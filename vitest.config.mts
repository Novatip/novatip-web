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
    // lib/config.ts validates this at module load and throws when it is absent,
    // which is the point of it — but that means importing anything that reaches
    // config needs a syntactically valid id present. Placeholder, never dialled.
    env: {
      NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
    },
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
