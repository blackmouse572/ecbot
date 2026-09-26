import { cloudflare } from "@cloudflare/vite-plugin";
import { existsSync } from "node:fs";
import { syncFavicon } from "@repo/favicons/sync";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import checker from "vite-plugin-checker";
import dts from "vite-plugin-dts";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

// Copies the right dev/staging/production favicon set into public/favicon
// based on `--mode`, before serve/build reads the public dir.
function faviconSync(): Plugin {
  return {
    name: "favicon-sync",
    config(_, { mode }) {
      const env =
        mode === "production" || mode === "staging" ? mode : "dev";
      syncFavicon(env, path.resolve(import.meta.dirname, "public/favicon"));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({ typescript: true }),
    dts(),
    svgr(),
    tsconfigPaths(),
    tailwindcss(),
    // Deploy-only: a clean clone has no wrangler.json and must still build.
    ...(existsSync(path.resolve(import.meta.dirname, "wrangler.json")) ? [cloudflare()] : []),
    faviconSync(),
  ],
  optimizeDeps: {
    exclude: ["../../node_modules/.vite", "../../node_modules/.cache"],
  },
  assetsInclude: ["src/**/*.svg"],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@components": path.resolve(import.meta.dirname, "./src/components"),
      "@hooks": path.resolve(import.meta.dirname, "./src/hooks"),
      "@libs": path.resolve(import.meta.dirname, "./src/libs"),
      "@providers": path.resolve(import.meta.dirname, "./src/providers"),
      "@assets": path.resolve(import.meta.dirname, "./src/assets"),
      "@i18n": path.resolve(import.meta.dirname, "./src/i18n"),
    },
  },
  build: {
    cssCodeSplit: false,
    minify: false,
    sourcemap: false,
    outDir: "./dist",
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
      defaultIsModuleExports: true,
      requireReturnsDefault: "auto",
    },
    rollupOptions: {},
  },
  server: {
    port: 5173,
  },
});
