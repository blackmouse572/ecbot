import path from "path";
import { defineConfig } from "vitest/config";

// Standalone vitest config. We intentionally don't pull in vite.config.ts because
// it loads Cloudflare/Tailwind plugins that don't play well with jsdom unit tests.
export default defineConfig({
  // Workspace packages (e.g. @repo/auth) inherit `jsx: "preserve"` from the
  // shared next tsconfig, which makes esbuild emit the classic runtime and blow
  // up with "React is not defined" under test. Pin the automatic runtime here.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@libs": path.resolve(__dirname, "./src/libs"),
      "@providers": path.resolve(__dirname, "./src/providers"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@i18n": path.resolve(__dirname, "./src/i18n"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "test/**/*.{test,spec}.{ts,tsx}",
    ],
    css: false,
  },
});
