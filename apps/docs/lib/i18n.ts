import { defineI18n } from "fumadocs-core/i18n";

export const i18n = defineI18n({
  languages: ["en", "vi"],
  defaultLanguage: "en",
  parser: "dot",
  // Every page ships in both languages (enforced by test/content.test.ts), so
  // a missing translation is a bug, not something to paper over.
  fallbackLanguage: null,
});

export type Lang = (typeof i18n.languages)[number];
