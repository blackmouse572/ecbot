---
name: eccho-platform-adapters
description: Build chat channel integrations for the ecbot `apps/api` NestJS backend using the internal `platform` module (`PlatformAdapter` abstract class at `apps/api/src/modules/platform/`). Use whenever a developer asks to build, register, or modify a channel — Facebook Messenger, Instagram, WhatsApp Business, Zalo OA, TikTok Shop, Shopee, Telegram, the API channel, or the website widget — including handling inbound webhooks, verifying signatures, parsing platform events, sending operator replies, fetching conversations or sender profiles, wiring OAuth, adding a webhook route, or adding a new channel. Use even when the user does not explicitly say "platform adapter" — e.g. "make our bot reply on Zalo", "add a Shopee webhook", "send a message back to the customer on TikTok", "verify Meta signatures", "register an Instagram integration", "let a third party post messages over REST", "embed a chat widget on a customer site". This is the canonical pattern in this codebase and replaces the legacy Vercel Chat SDK; do not reach for the `chat` npm package or `@chat-adapter/*` — they have been removed.
---

# ecbot Platform Adapters

Every channel ecbot talks on lives at `apps/api/src/modules/platform/` as a
single NestJS class extending the abstract `PlatformAdapter`, registered in
`PlatformAdapterRegistry` and keyed by `ENUM_ACCOUNT_TYPE`.

Nine channels are registered today, in two groups:

- **Platform channels** — Messenger, Instagram, WhatsApp Business, Zalo OA,
  TikTok Shop, Shopee, Telegram. A third party pushes events to us and we call their API to reply.
  Inbound arrives through the shared webhook controller.
- **eccho-issued channels** — the API channel and the website widget. There is
  no third-party platform: ecbot issues the credential and owns both ends. They
  implement the same contract but their inbound arrives through their own
  controllers, not the webhook route (see "eccho-issued channels" below).

The previous Vercel `chat` SDK and `@chat-adapter/*` packages have been ripped
out. Do not add them back, and do not look for `Chat`, `Adapter`,
`createMessengerAdapter`, `RedisStateAdapter`, or `BaseFormatConverter` — those
symbols no longer exist in this repo.

## Start by reading these files

Before writing code, open these in order.

1. `apps/api/src/modules/platform/adapters/platform-adapter.base.ts` — the
   contract. Read this first; it is a concrete abstract class with real
   behaviour (capability gating, `degrade()`, error surfacing), not a bare
   interface.
2. `apps/api/src/modules/platform/interfaces/platform-adapter.interface.ts` and
   `interfaces/message-model.ts` — `PlatformWebhookEvent`, `OutboundMessage`,
   `AdapterCapabilities`.
3. `apps/api/src/modules/platform/adapters/messenger/messenger.platform-adapter.ts` —
   the richest platform adapter. Use it as the template for an OAuth platform.
4. `apps/api/src/modules/platform/adapters/telegram/telegram.platform-adapter.ts` —
   the template for a platform with a manual credential instead of OAuth.
5. `apps/api/src/modules/platform/controllers/platform-webhook.public.controller.ts` —
   the unified `GET/POST /v1/webhooks/:platform` entry point.
6. `apps/api/src/modules/platform/platform.module.ts` — wiring; the `ADAPTERS`
   array is the single source of truth for what is registered.
7. `apps/api/src/modules/platform/services/message-processor.service.ts` — the
   Turn pipeline every inbound event runs through.

For the outbound (operator → customer) flow, also read
`apps/api/src/modules/conversation/services/conversation-messaging.service.ts` —
it shows how the registry is consumed: `registry.get(account.type).sendMessage(...)`.

## Core concepts

- **`PlatformAdapter`** — one class per channel, extending the abstract base.
  The contract is **flat**, not namespaced: `type`, `capabilities`, `oauth`,
  `verifyChallenge`, `verifySignature`, `parse`, `fetchSenderProfile`, and the
  protected `doSend` hook. Optional hooks: `doEdit`, `doDelete`, `doReact`,
  `doTyping`, `doMarkRead`, `fetchConversations`, `fetchMessages`, `reconcile`.

- **Call `sendMessage`, implement `doSend`.** The base class's public methods
  are concrete: they check `this.capabilities`, run `degrade()` (card → text,
  drop unsupported buttons, fold quick replies into text) and only then call
  your protected hook. Never override `sendMessage` — declare capabilities
  honestly and let `degrade()` do its job.

- **`PlatformAdapterRegistry`** — injectable map keyed by `ENUM_ACCOUNT_TYPE`,
  built from each adapter's own `.type`. Resolve with `registry.get(account.type)`;
  throws `UnsupportedPlatformException` when nothing is registered.

- **`PlatformWebhookEvent`** — the normalized shape `parse()` produces:
  `kind`, `accountKey`, `senderId`, `recipientId`, `externalMessageId?`,
  `text?`, `timestamp`, `raw`, plus optional `action` / `attachments` /
  `reaction`. **`accountKey` must equal the stored `account.externalId`** —
  that is how `MessageProcessorService` resolves the account.

- **Durability and dedupe** — the webhook controller enqueues every event via
  `InboundInboxService.accept()` **before** it ACKs (receipt-before-ACK,
  ADR-0007). The BullMQ jobId is `${platform}-${externalMessageId}` and its
  26h retention *is* the redelivery dedupe. A second, shared Redis claim
  (`InboundEventDedupeService`) sits inside `MessageProcessorService.process()`
  so every ingress path is covered. Events with no `externalMessageId` are
  dropped as unde-dupable.

- **Slug → type map** — `apps/api/src/modules/platform/constants/platform-slug.constant.ts`
  resolves a URL slug (`messenger`, `zalo`, `instagram`, `whatsapp`, `tiktok`,
  `shopee`, `telegram`, `api`, `website`) to an `ENUM_ACCOUNT_TYPE`. Add an entry when
  adding a channel.

- **Raw body** — `main.ts` sets `rawBody: true` so HMAC verification runs
  against the exact bytes the provider sent. Always verify `req.rawBody`, never
  re-stringified JSON.

- **Tokens** — stored envelope-encrypted in `AccountEntity.accessToken`. Call
  `AccountService.decryptToken(account.accessToken)` before use. See
  `TelegramPlatformAdapter.token()`.

- **`AccountEntity.config`** — a nullable jsonb column carrying per-channel
  settings for the eccho-issued channels only (`{callbackUrl, signingSecret}`
  for the API channel, `{allowedOrigins, theme}` for the widget). Narrow it with
  the guards in `apps/api/src/modules/account/interfaces/account-config.interface.ts`;
  do not read it generically.

## When to do what

| User intent | What to build / where to edit |
| --- | --- |
| Add a new chat platform | New adapter in `adapters/<platform>/`, add to `ADAPTERS` in `platform.module.ts`, add the slug to `platform-slug.constant.ts`, add the `ENUM_ACCOUNT_TYPE` value **and a migration** widening the `accounts_type_check` and `contact_points_platform_check` constraints. |
| Send a message from the app to a customer | Don't call providers directly — `ConversationMessagingService.sendOperatorReply`, or `registry.get(account.type).sendMessage(...)`. |
| Register a new inbound webhook URL | Usually unnecessary: `POST /v1/webhooks/:platform` already handles it. Add a dedicated route **only** when the payload doesn't identify the target account (the Telegram `POST /webhooks/telegram/:botId` precedent). |
| Fetch conversation history from the provider | `adapter.fetchConversations` + `fetchMessages` (both optional). |
| Look up a customer's profile | `adapter.fetchSenderProfile`. |
| Refresh tokens / get the page/OA/shop's own profile | `adapter.oauth.refresh` / `adapter.oauth.getOwnerProfile`. Note the **account-linking** flow is a separate interface — `IOAuthPlatformService` under `apps/api/src/common/<platform>/`, dispatched by `OAuthPlatformFactory`. Adding a linkable platform means touching both. |
| Auto-reply to inbound messages (LLM, handoff) | NOT in the adapter. `MessageProcessorService` → `MessageDebounceService` (3s burst window) → `ReplyGenerationService` → `StreamingDelivery` → `adapter.sendMessage`. |
| Let a third party send/receive over REST | That is the **API channel** — it already exists. See below. |
| Embed a chat widget on a customer's site | That is the **website widget** — it already exists. See below. |

## eccho-issued channels

Two channels have no external platform behind them, so parts of the contract
are inert by design, and they authenticate differently on purpose: the **API
channel** is a third party's server holding a workspace-scoped
`ClientCredential` (hash-only secret shown once at create/rotate, revoke =
soft-delete) on the `/client` prefix; the **website widget** is a public
surface (`/public/widget/:key`, the key is `account.externalId` and ships in
the embed snippet) whose domain allowlist is enforced by the Worker's CSP
`frame-ancestors`, with Turnstile plus a per-visitor Redis budget for abuse
control. Keep the two contracts distinct.

- **API channel** (`ENUM_ACCOUNT_TYPE.API_CHANNEL`, slug `api`). Inbound is
  `POST /v1/client/channels/api/messages`, authenticated by `ClientCredentialGuard`
  (`x-api-key: key:secret`); the workspace comes from the credential, never the
  URL. Outbound POSTs the reply to `account.config.callbackUrl`, HMAC-signed
  with `x-eccho-signature`, retried through `API_CHANNEL_CALLBACK_QUEUE`.

- **Website widget** (`ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET`, slug `website`).
  Inbound is `POST /v1/public/widget/:key/messages`, and the reply streams back
  on that same request as SSE via `WidgetChatService` — it deliberately bypasses
  the queue and debounce, which exist for platform-pushed webhooks. `doSend` is
  a no-op: there is no push transport, so an operator's reply is delivered by
  the visitor's poll of `GET /v1/public/widget/:key/messages?after=`.

**Both return `false` from `verifySignature`, on purpose.** Their slugs are
registered, which also exposes them on the unauthenticated
`POST /v1/webhooks/:platform` route. Returning anything else there would turn
that route into a free message-injection endpoint. Do not "fix" this.

## Quick start — implementing a new platform adapter

```ts
import { ENUM_ACCOUNT_TYPE } from "@app/modules/account/enums/account.enum";
import { AccountEntity } from "@app/modules/account/repository/entities/account.entity";
import { AccountService } from "@app/modules/account/services/account.service";
import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import {
  AdapterCapabilities,
  OutboundMessage,
} from "../../interfaces/message-model";
import {
  PlatformOAuthCapability,
  PlatformUserProfile,
  PlatformWebhookEvent,
} from "../../interfaces/platform-adapter.interface";
import { PlatformAdapter } from "../platform-adapter.base";

@Injectable()
export class ZaloPlatformAdapter extends PlatformAdapter {
  readonly type = ENUM_ACCOUNT_TYPE.ZALO_PAGE;

  // Declare honestly — `degrade()` downgrades anything set to false.
  readonly capabilities: AdapterCapabilities = {
    cards: false,
    buttons: false,
    quickReplies: false,
    media: true,
    editMessage: false,
    deleteMessage: false,
    reactions: { inbound: false, outbound: false },
    typing: false,
    markRead: false,
  };

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly accounts: AccountService,
  ) {
    super();
  }

  private token(account: AccountEntity): string {
    return this.accounts.decryptToken(account.accessToken);
  }

  readonly oauth: PlatformOAuthCapability = {
    exchangeCode: async () => ({ accessToken: "" }), // linking goes through ZaloOAuthService
    refresh: async (account) => ({ accessToken: this.token(account) }),
    getOwnerProfile: async (account) => {
      /* GET https://openapi.zalo.me/v3.0/oa/getoa */
    },
  };

  verifyChallenge(_req: Request): Response | null {
    return null; // Zalo has no challenge handshake
  }

  verifySignature(rawBody: string, headers: Record<string, string>): boolean {
    const secret = this.config.get<string>("zalo.appSecret");
    if (!secret) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const incoming = headers["x-zevent-signature"] ?? "";
    // Hash both to a fixed length first — timingSafeEqual throws on a length
    // mismatch, which would itself leak the expected length.
    return timingSafeEqual(
      createHmac("sha256", secret).update(incoming).digest(),
      createHmac("sha256", secret).update(`mac=${expected}`).digest(),
    );
  }

  parse(rawBody: string): PlatformWebhookEvent[] {
    const body = JSON.parse(rawBody);
    // accountKey MUST equal the stored account.externalId.
    return [];
  }

  async fetchSenderProfile(
    account: AccountEntity,
    senderId: string,
  ): Promise<PlatformUserProfile> {
    return { id: senderId };
  }

  protected async doSend(
    account: AccountEntity,
    senderId: string,
    msg: OutboundMessage,
  ): Promise<{ externalId: string }> {
    // POST https://openapi.zalo.me/v3.0/oa/message/cs
    // On an HTTP error call this.rethrowPlatformError(err, 'zalo sendMessage')
    // so the provider's real reason reaches the logs instead of an AxiosError.
    return { externalId: "..." };
  }
}
```

Then add the class to `ADAPTERS` in `platform.module.ts` — the `PLATFORM_ADAPTER`
factory and `PlatformAdapterRegistry.onModuleInit` pick it up from there.

## Provider quick reference

| Platform | Signature header | Algorithm | GET challenge | Outbound endpoint |
| --- | --- | --- | --- | --- |
| Messenger / Instagram | `x-hub-signature-256` | `HMAC-SHA256(rawBody, appSecret)` | yes (`hub.challenge`) | `https://graph.facebook.com/<v>/me/messages` |
| Zalo OA | `x-zevent-signature` | `mac=HMAC-SHA256(rawBody, appSecret)` | no | `https://openapi.zalo.me/v3.0/oa/message/cs` |
| TikTok Shop | `x-tts-signature` | `HMAC-SHA256(app_key + timestamp + body, appSecret)` | no | TikTok Customer Service API |
| Shopee | `authorization` | `HMAC-SHA256(partner_id + path + timestamp, partner_key)` | no | Shopee Open Platform Chat API |
| WhatsApp Business | `x-hub-signature-256` (same Meta app as Messenger) | `HMAC-SHA256(rawBody, appSecret)` | yes (`hub.challenge`) | `https://graph.facebook.com/<v>/<phone_number_id>/messages` |
| Telegram | `x-telegram-bot-api-secret-token` | shared secret, compared timing-safe | no | `https://api.telegram.org/bot<token>/sendMessage` |
| API channel | — (`ClientCredentialGuard` on `/client`) | n/a — `verifySignature` returns false | no | the account's own `config.callbackUrl` |
| Website widget | — (widget key + Turnstile on `/public`) | n/a — `verifySignature` returns false | no | none; delivery is the visitor's poll |

## What's intentionally out of scope for adapters

Adapters are HTTP clients with normalization on top. Do **not** put any of the
following inside one:

- DB writes (`MessageRepository`, `ConversationService` own those).
- Handoff detection, LLM calls, BullMQ queueing.
- Controller or routing logic.

`MessageProcessorService` coordinates persistence, handoff and reply generation.

## Verification checklist before claiming a new channel is done

1. `pnpm -F api exec tsc --noEmit` — your adapter typechecks.
2. `npx jest --config test/jest.json <platform>-adapter` from `apps/api` — unit
   tests for `verifySignature`, `parse` and `doSend` pass.
3. `grep -rn "from 'chat'\|@chat-adapter" apps/api/src` returns nothing.
4. GET handshake (Meta-style platforms only):
   `curl "https://<host>/v1/webhooks/<slug>?hub.mode=subscribe&hub.verify_token=…&hub.challenge=ping"` → `ping`.
5. POST a captured payload with a valid signature → `200 EVENT_RECEIVED`, and a
   BullMQ job lands on `INBOUND_EVENT_QUEUE`.
6. POST the same payload again → no second Turn (the jobId retention and the
   Redis claim both dedupe it).
7. POST with a tampered body → 403.
8. The account has a `chatbot` attached — `MessageProcessorService` silently
   no-ops without one, which is the most common "nothing happens" trap.
9. Operator outbound: send via
   `POST /v1/workspace/:w/conversations/:id/messages` on a conversation whose
   `account.type` is yours. `messages` should go `PENDING → SENT` with the
   provider's `externalId`.

If any of those fail, fix the adapter — don't bypass the registry or the
controller.
