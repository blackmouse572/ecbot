const path = require("path");

const uiPath = path.resolve(require.resolve("@repo/auth"));
const componentPath = path.resolve(require.resolve("@repo/ui/components"));
const commonComponentPath = path.resolve(
  require.resolve("@repo/ui/common-components")
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@medusajs/ui-preset")],
  darkMode: "class",
  content: [
    "./node_modules/@medusajs/ui/dist/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/**/*{.js,.ts,.jsx,.tsx}",
    // "../..",
    // "**/_*.{js,jsx,ts,tsx}",
    uiPath,
    commonComponentPath,
    componentPath,
  ],
  theme: {
    extend: {
      typography: {
        // `--fg-*`/`--border-*` are the app's own theme tokens, which already
        // flip under `.dark` — pointing `prose` at them (instead of
        // Typography's built-in gray palette) makes markdown dark-mode-aware
        // for free, no `dark:prose-invert` needed.
        DEFAULT: {
          css: {
            "--tw-prose-body": "var(--fg-subtle)",
            "--tw-prose-headings": "var(--fg-base)",
            "--tw-prose-lead": "var(--fg-subtle)",
            "--tw-prose-links": "var(--fg-interactive)",
            "--tw-prose-bold": "var(--fg-base)",
            "--tw-prose-counters": "var(--fg-subtle)",
            "--tw-prose-bullets": "var(--fg-muted)",
            "--tw-prose-hr": "var(--border-base)",
            "--tw-prose-quotes": "var(--fg-base)",
            "--tw-prose-quote-borders": "var(--border-base)",
            "--tw-prose-captions": "var(--fg-muted)",
            "--tw-prose-code": "var(--fg-base)",
            "--tw-prose-pre-code": "var(--fg-base)",
            "--tw-prose-pre-bg": "var(--bg-component)",
            "--tw-prose-th-borders": "var(--border-base)",
            "--tw-prose-td-borders": "var(--border-base)",
          },
        },
      },
    },
  },
  // Powers the `prose` class used to render markdown (skill instructions,
  // chatbot general knowledge, knowledge base content, the TipTap editor).
  plugins: [require("@tailwindcss/typography")],
};
