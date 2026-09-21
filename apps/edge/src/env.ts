import * as v from "valibot";

// Validates the .env-sourced vars (wrangler secrets locally, `wrangler
// secret` in deployed envs) — not the Cloudflare resource bindings
// (INBOUND_QUEUE, CONVERSATION_DO), which are never exposed on process.env
// (only text/JSON vars are) and stay on the Hono Env/c.env binding instead.
export const envSchema = v.object({
  SERVER_URL: v.pipe(v.string(), v.url()),
  SERVER_API_KEY: v.pipe(v.string(), v.nonEmpty()),
  INTERNAL_SECRET: v.pipe(v.string(), v.nonEmpty()),
  FACEBOOK_WEBHOOK_SECRET: v.pipe(v.string(), v.nonEmpty()),
});

// Parsed once at module load — a misconfigured .env crashes the Worker
// before it serves a single request, instead of failing per-request deep
// in a handler. Requires nodejs_compat_populate_process_env (default since
// compatibility_date 2025-04-01, see wrangler.json) so process.env carries
// the same values as the underlying vars/secrets bindings.
export const env = v.parse(envSchema, process.env);
export type Env = typeof env;
export type Bindings = {
  INBOUND_QUEUE: Queue;
  CONVERSATION_DO: DurableObjectNamespace;
};
