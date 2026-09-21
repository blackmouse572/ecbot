# eccho-edge

A front server to handle thousands of message inbound webhooks sequentially
to make sure the api service do not flood. It is a **dumb receipt**: no
signature verification or payload parsing happens here — it just durably
queues the raw request and ACKs, so a platform never sees a retry-worthy
failure. Verification and parsing run downstream in `apps/api`'s queue
consumer instead (see References).

## Routes

| Method | Path                      | Behavior                                               |
| ------ | ------------------------- | ------------------------------------------------------- |
| GET    | `/health`                 | Liveness check                                           |
| GET    | `/robots.txt`             | `Disallow: /` for every crawler (see Bots & crawlers)     |
| GET    | `/webhooks/:platform`     | Facebook/Messenger `hub.challenge` verification, checked locally (see Env / bindings); 404 for every other slug |
| POST   | `/webhooks/telegram/:botId` | Telegram (botId comes from the URL, not the payload)   |
| POST   | `/webhooks/:platform`     | Every other platform (slug-based)                        |

## Webhook configuration per platform

### Facebook Messenger

- Slug: `messenger` (`facebook` also accepted)
- Path: `POST /webhooks/messenger`
- **GET challenge required at setup** — Meta calls the webhook URL with
  `hub.mode=subscribe&hub.verify_token=...&hub.challenge=...` once, before
  it will send any POST events. This worker verifies the handshake itself
  (`GET /webhooks/messenger`, `GET /webhooks/facebook`), comparing the token
  against its own local config (see Env / bindings) — no round-trip to
  apps/api needed.
- Signature: header `x-hub-signature-256`, `sha256=<hex>` HMAC over the raw
  body, keyed with `FACEBOOK_APP_SECRET` (apps/api env — POST events are
  still verified downstream in apps/api, not here).

### Zalo OA

- Slug: `zalo`
- Path: `POST /webhooks/zalo`
- No GET challenge — Zalo has no verification handshake, so it's safe to
  register this worker's URL directly.
- Signature: header `x-zevent-signature`, `mac=<sha256hex>` of
  `appId + rawBody + timestamp + OASecretKey`, keyed with `ZALO_APP_ID` /
  `ZALO_APP_SECRET` (apps/api env). `timestamp` is read from the payload
  itself; requests older than 5 minutes are rejected.

### TikTok Shop

- Slug: `tiktok`
- Path: `POST /webhooks/tiktok`
- No GET challenge.
- **Adapter is a stub** — `TiktokPlatformAdapter` has no real
  `verifySignature`/`parse` yet, so events queued here will fail processing
  (501) until the adapter is implemented. Safe to point the URL here ahead
  of time; nothing will process end-to-end yet.
- Planned: header `x-tts-signature`, HMAC-SHA256 of `app_key + timestamp + body`,
  keyed with `TIKTOK_APP_SECRET`.

### Shopee

- Slug: `shopee`
- Path: `POST /webhooks/shopee`
- No GET challenge.
- **Adapter is a stub** — same caveat as TikTok: `ShopeePlatformAdapter` has
  no real `verifySignature`/`parse` yet.
- Planned: header `authorization`, HMAC-SHA256 of `partner_id + path + timestamp`,
  keyed with `SHOPEE_PARTNER_KEY`.

## Adding a GET challenge for another platform

GET-challenge verification lives in `src/platforms/`, one file per platform,
behind a shared `ChallengeVerifier` interface (`src/platforms/challenge-verifier.ts`)
so the route in `index.ts` never needs to change:

```ts
export interface ChallengeVerifier {
  readonly slugs: readonly string[]; // e.g. ["messenger", "facebook"]
  verify(url: URL): Response;
}
```

`src/platforms/facebook.ts` is the reference implementation. To add another
platform (e.g. once Zalo/TikTok/Shopee grow a real GET handshake):

1. Create `src/platforms/<platform>.ts` exporting a `ChallengeVerifier`.
   Import `{ env }` from `../env` directly if it needs config.
2. Register it in `src/platforms/registry.ts`'s `verifiers` array.
3. Add any required var to the schema in `src/env.ts` (and `.env.example`).

## Bots & crawlers

This worker only serves API/webhook traffic — nothing here is meant to be
indexed. `robots.txt` disallows everything, and every response carries
`X-Robots-Tag: noindex, nofollow` for crawlers that fetch before checking
`robots.txt`.

**Do not** enable Cloudflare Bot Fight Mode / Super Bot Fight Mode (or any
bot-score challenge) on this domain without excluding `/webhooks/*` first —
Meta, Zalo, and Telegram's webhook senders are themselves unverified bots by
Cloudflare's classification, and a blanket challenge would block real
platform traffic, not just scanners. Rate limiting / WAF managed rules are
fine to add at the zone level (Cloudflare Dashboard, not this repo) as long
as `/webhooks/*` stays scoped to genuine abuse (e.g. volume from a single IP
far beyond a legit platform's pattern), not bot classification.

## Env / bindings

`wrangler.json` declares the two Cloudflare resource bindings —
`INBOUND_QUEUE`, `CONVERSATION_DO` — accessed via `c.env`.

Everything else (`SERVER_URL`, `SERVER_API_KEY`, `INTERNAL_SECRET`,
`FACEBOOK_WEBHOOK_SECRET`) is plain config, read from `process.env` (see
`.env.example` for local dev, `wrangler secret put <NAME>` for deployed
environments) and validated once at module load by `src/env.ts` with
[valibot](https://valibot.dev) — a missing, empty, or invalid value crashes
the Worker before it serves a single request, instead of failing per-request
deep in a handler. Add a new required var to both the schema in `src/env.ts`
and `.env.example`.

`FACEBOOK_WEBHOOK_SECRET` is duplicated in both `apps/api`'s env and this
worker's — **rotate both together**, they must match exactly. Note
`apps/api/.env.example` currently documents this var as
`FACEBOOK_WEBHOOK_VERIFY_TOKEN`, which apps/api's code does not read; the
real key is `FACEBOOK_WEBHOOK_SECRET`.

`wrangler.json`'s `secrets.required` lists the three secrets above — `wrangler
deploy`/`versions upload` validate they're already set on the Worker before
uploading, failing fast with a clear message instead of the harder-to-read
crash from `src/env.ts`'s module-load check. `wrangler.json`'s `routes` pins
the Custom Domain (`edge.ecbot.dev`) — it lives outside `wrangler.json` on
the Dashboard otherwise, and a deploy would silently detach it.

## Commands

```bash
pnpm --filter edge dev      # wrangler dev --env-file .env
pnpm --filter edge test     # vitest run
pnpm --filter edge deploy   # wrangler deploy
```

## References

- [`apps/api/docs/platforms.md`](../api/docs/platforms.md) — the platform
  adapter contract, and `apps/api`'s synchronous webhook alternative
- `PlatformWebhookPublicController` (apps/api) — synchronous verify+receive
  alternative to this worker's queue-based flow
- `PocSystemController.inbound` (apps/api) — the endpoint this worker's
  queue consumer posts each message to
