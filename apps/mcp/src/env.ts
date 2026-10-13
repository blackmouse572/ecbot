import * as v from "valibot";

// Parsed once at module load, as in apps/edge: a misconfigured worker fails
// before it serves a request. Requires nodejs_compat_populate_process_env
// (default since compatibility_date 2025-04-01) so process.env carries the
// worker's vars.
export const envSchema = v.object({
  SERVER_URL: v.pipe(v.string(), v.url()),
});

export const env = v.parse(envSchema, process.env);
