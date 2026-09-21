// Populate process.env before any spec file's static imports load
// src/index.ts, which pulls in src/env.ts — a module-level v.parse() that
// throws immediately if a required var is missing. Cloudflare Workers
// exposes vars/secrets on process.env via nodejs_compat_populate_process_env
// in the real runtime; this mirrors that for the plain-Node vitest
// environment used here (no @cloudflare/vitest-pool-workers).
process.env.SERVER_URL = "http://nest";
process.env.SERVER_API_KEY = "k:s";
process.env.INTERNAL_SECRET = "shh";
process.env.FACEBOOK_WEBHOOK_SECRET = "verify-me";
