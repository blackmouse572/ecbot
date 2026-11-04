/**
 * OpenRouter provider slugs that have a logo in `public/icons/providers/`.
 * `true` marks a one-color logo that is drawn black and needs inverting in
 * dark mode.
 */
export const PROVIDER_LOGOS: Record<string, boolean> = {
  amazon: false,
  anthropic: true,
  "bytedance-seed": false,
  cohere: false,
  deepseek: false,
  google: false,
  meta: false,
  minimax: false,
  mistralai: false,
  moonshotai: true,
  nvidia: false,
  openai: true,
  qwen: false,
  stepfun: false,
  tencent: false,
  upstage: false,
  "x-ai": true,
  xiaomi: true,
  "z-ai": true,
};

/** Providers that share another slug's logo file. */
export const PROVIDER_LOGO_ALIASES: Record<string, string> = {
  "meta-llama": "meta",
};
