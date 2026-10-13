// Populate process.env before any spec file's static imports load
// src/index.ts, which pulls in src/env.ts: a module-level v.parse() that
// throws if a required var is missing. Workers expose vars on process.env
// via nodejs_compat_populate_process_env; this mirrors that for vitest.
process.env.SERVER_URL = "http://api.test";
