// e2e/config.ts — shared env-derived config for specs, fixtures, and helpers.
// Single source of truth so URLs/keys aren't redefined per file.
export const API_URL = process.env.API_URL ?? "http://localhost:8080";
export const AI_URL = process.env.AI_URL ?? "http://localhost:8000";
export const API_KEY = process.env.E2E_API_KEY ?? "";

// Pre-seeded, already-verified account (apps/api seed:user). Used to authenticate
// without the sign-up + email-confirmation flow. Run `pnpm migrate:seed:e2e` first.
export const SEED_USER_EMAIL =
  process.env.E2E_SEED_EMAIL ?? "individual@mail.com";
export const SEED_USER_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "aaAA@123";
