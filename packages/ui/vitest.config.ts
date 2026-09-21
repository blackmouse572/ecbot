import { defineConfig } from "vitest/config";

export default defineConfig({
  // No JSX override needed: this run has no React plugin, so esbuild does the
  // transform and picks up `jsx: "react-jsx"` from tsconfig.json.
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
