import globals from "globals";
import { nextJsConfig } from "@repo/eslint-config/next-js";

export default [
  ...nextJsConfig,
  { ignores: [".next/**", ".source/**", "out/**", "next-env.d.ts"] },
  // Build and capture scripts run in Node; the capture script also runs code in the browser.
  {
    files: ["scripts/**", "*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "turbo/no-undeclared-env-vars": "off" },
  },
];
