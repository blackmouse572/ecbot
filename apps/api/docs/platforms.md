# Platforms

The `platform` module is the unified integration layer for every external chat
platform the API talks to — Facebook Messenger, Instagram, Zalo OA, TikTok
Shop, Shopee. Each platform is wrapped in a single class implementing
`IPlatformAdapter`, exposing three namespaces:

- `oauth` — token exchange / refresh / owner-profile lookup
- `webhook` — challenge handshake, signature verification, event parsing
- `messaging` — send/fetch messages, fetch sender profile, typing/read indicators

Replacing the previous `chat` SDK setup, this module owns:

- Operator outbound replies (`ConversationMessagingService` → adapter.messaging.sendMessage)
- The public webhook endpoint `POST /v1/webhooks/:platform`
- Redis-backed webhook idempotency (`WebhookDedupeService`)

# Table of contents

- [Architecture](#architecture)
- [Folder layout](#folder-layout)
- [Adapter contract](#adapter-contract)
- [Webhook endpoint](#webhook-endpoint)
    - [URL scheme and slug mapping](#url-scheme-and-slug-mapping)
    - [GET — challenge handshake](#get--challenge-handshake)
    - [POST — events](#post--events)
- [Registering a new platform](#registering-a-new-platform)
    - [1. Create the adapter](#1-create-the-adapter)
    - [2. Register it in PlatformModule](#2-register-it-in-platformmodule)
    - [3. Map a URL slug](#3-map-a-url-slug)
    - [4. Verify with the provider](#4-verify-with-the-provider)
- [Provider checklist (per platform)](#provider-checklist-per-platform)
- [Operational notes](#operational-notes)

## Architecture

```
                       ┌────────────────────────────────┐
   POST /v1/webhooks/  │ PlatformWebhookPublicController│
   :platform           │   (in PlatformModule)          │
   ──────────────────► │  1. slug → ENUM_ACCOUNT_TYPE   │
                       │  2. adapter.verifySignature    │
                       │  3. 200 EVENT_RECEIVED         │
                       │  4. adapter.parse(rawBody)     │
                       │  5. dedupe per externalMid     │
                       │  6. dispatch (TODO: processor) │
                       └──────────────┬─────────────────┘
                                      │
                                      ▼
                       ┌────────────────────────────────┐
                       │     PlatformAdapterRegistry    │
                       │   Map<ENUM_ACCOUNT_TYPE,       │
                       │       IPlatformAdapter>        │
                       └──────────────┬─────────────────┘
                                      │
                ┌─────────────────────┼──────────────────────┐
                ▼                     ▼                      ▼
          MessengerAdapter      ZaloAdapter (stub)    ShopeeAdapter (stub)
          (oauth/webhook/messaging)
```

Operator → customer messages go the other direction:

```
ConversationWorkspaceController.sendMessage
    → ConversationMessagingService.sendOperatorReply
        → MessageRepository.insertPendingOutbound (status=PENDING)
        → PlatformAdapterRegistry.get(account.type).messaging.sendMessage
        → MessageRepository.markOutboundSent (status=SENT)
```

## Folder layout

```
apps/api/src/modules/platform/
├── interfaces/
│   └── platform-adapter.interface.ts          # IPlatformAdapter + types
├── exceptions/
│   └── unsupported-platform.exception.ts
├── constants/
│   └── platform-slug.constant.ts              # URL slug → ENUM_ACCOUNT_TYPE
├── controllers/
│   └── platform-webhook.public.controller.ts  # GET/POST /v1/webhooks/:platform
├── services/
│   ├── platform-adapter.registry.ts           # DI registry
│   └── webhook-dedupe.service.ts              # Redis SETNX-style idempotency
├── adapters/
│   ├── base-stub.platform-adapter.ts          # Throws NotImplemented
│   ├── messenger/
│   │   ├── messenger.platform-adapter.ts
│   │   └── messenger.types.ts
│   ├── zalo/ instagram/ tiktok/ shopee/       # stubs
└── platform.module.ts
```

## Adapter contract

```ts
export interface IPlatformAdapter {
    readonly type: ENUM_ACCOUNT_TYPE;
    readonly oauth: PlatformOAuthCapability;
    readonly webhook: PlatformWebhookCapability;
    readonly messaging: PlatformMessagingCapability;
}

export interface PlatformWebhookCapability {
    verifyChallenge(req: Request): Response | null;
    verifySignature(
        rawBody: string,
        headers: Headers | Record<string, string>
    ): boolean;
    parse(rawBody: string): PlatformWebhookEvent[];
}

export interface PlatformMessagingCapability {
    sendMessage(
        account,
        senderId,
        text,
        attachments?
    ): Promise<{ externalId: string }>;
    fetchConversations(account, senderId): Promise<PlatformConversation[]>;
    fetchMessages(account, conversationId): Promise<PlatformMessage[]>;
    fetchSenderProfile(account, senderId): Promise<PlatformUserProfile>;
    markRead?(account, senderId): Promise<void>;
    sendTyping?(account, senderId, on: boolean): Promise<void>;
}
```

A `PlatformWebhookEvent` is the normalized shape every adapter must produce:

```ts
{
    kind: 'message' | 'echo' | 'postback' | 'reaction' | 'delivery' | 'read' | 'unknown';
    accountKey: string;          // page id / OA id / shop id  → matches AccountEntity.externalId
    senderId: string;
    recipientId: string;
    externalMessageId?: string;  // platform mid — used for dedupe
    text?: string;
    timestamp: Date;
    raw: unknown;                // raw provider event for downstream consumers
}
```

`MessengerPlatformAdapter` is the reference implementation; see
`src/modules/platform/adapters/messenger/messenger.platform-adapter.ts`.

## Webhook endpoint

### URL scheme and slug mapping

All providers POST to the same controller, distinguished by slug:

| Slug                           | Account type     | Adapter                           |
| ------------------------------ | ---------------- | --------------------------------- |
| `messenger` (alias `facebook`) | `FACEBOOK_PAGE`  | `MessengerPlatformAdapter`        |
| `zalo`                         | `ZALO_PAGE`      | `ZaloPlatformAdapter` (stub)      |
| `instagram`                    | `INSTAGRAM_PAGE` | `InstagramPlatformAdapter` (stub) |
| `tiktok`                       | `TIKTOK_SHOP`    | `TiktokPlatformAdapter` (stub)    |
| `shopee`                       | `SHOPEE_SHOP`    | `ShopeePlatformAdapter` (stub)    |

The map lives in `constants/platform-slug.constant.ts`.

### GET — challenge handshake

```http
GET /v1/webhooks/messenger?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=12345
```

Each adapter implements `verifyChallenge(req)`:

- Returns a `Response` to be relayed verbatim (Messenger expects the challenge echoed back).
- Returns `null` for providers without a challenge step (Zalo, Shopee, TikTok).

If the adapter returns `null` the controller responds `404 Not Found`.

### POST — events

```http
POST /v1/webhooks/messenger
X-Hub-Signature-256: sha256=...
Content-Type: application/json
```

Controller pipeline:

1. `adapter.webhook.verifySignature(rawBody, headers)` — 403 on failure.
2. `res.status(200).send('EVENT_RECEIVED')` — ACK fast; providers retry on slow ACK.
3. `adapter.webhook.parse(rawBody)` — normalize the body into `PlatformWebhookEvent[]`.
4. For each event with `externalMessageId`: `WebhookDedupeService.seenAndMark` (Redis, 5 min TTL).
5. Dispatch — currently logged with a TODO. When `MessageProcessorService` lands it consumes
   the event here. Existing platform-specific BullMQ flows (e.g. `FacebookHandlerService`) are
   not affected.

Raw body access requires `rawBody: true` on `NestFactory.create` (already enabled in
`src/main.ts`). Signature verification reads `req.rawBody` directly to avoid drift from
JSON re-serialization.

## Registering a new platform

The Zalo example below assumes the OAuth service already exists under
`src/common/zalo/` (true today). You're only filling in messaging + webhook.

### 1. Create the adapter

Replace the stub at `src/modules/platform/adapters/zalo/zalo.platform-adapter.ts`:

```ts
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountService } from '@app/modules/account/services/account.service';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
    IPlatformAdapter,
    PlatformWebhookEvent,
} from '../../interfaces/platform-adapter.interface';

@Injectable()
export class ZaloPlatformAdapter implements IPlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.ZALO_PAGE;

    constructor(
        private readonly config: ConfigService,
        private readonly http: HttpService,
        private readonly accounts: AccountService
    ) {}

    readonly oauth = {
        exchangeCode: async (code: string) => {
            /* ... */
        },
        refresh: async account => {
            /* ... */
        },
        getOwnerProfile: async account => {
            /* ... */
        },
    };

    readonly webhook = {
        verifyChallenge: () => null, // Zalo has no GET handshake
        verifySignature: (rawBody: string, headers): boolean => {
            const mac = headers['x-zevent-signature'];
            const secret = this.config.get<string>('zalo.appSecret');
            const expected = createHmac('sha256', secret)
                .update(rawBody)
                .digest('hex');
            return mac === `mac=${expected}`;
        },
        parse: (rawBody: string): PlatformWebhookEvent[] => {
            const body = JSON.parse(rawBody);
            // …map Zalo's event shape to PlatformWebhookEvent
            return [];
        },
    };

    readonly messaging = {
        sendMessage: async (account, senderId, text) => {
            /* POST /v3.0/oa/message/cs */
        },
        fetchConversations: async (account, senderId) => {
            /* ... */
        },
        fetchMessages: async (account, conversationId) => {
            /* ... */
        },
        fetchSenderProfile: async (account, senderId) => {
            /* ... */
        },
    };
}
```

Refer to `MessengerPlatformAdapter` for HMAC patterns, error handling, and the
namespace-as-readonly-field shape.

### 2. Register it in PlatformModule

Already done for stubs — when you replace the stub with a real implementation
nothing changes in `platform.module.ts`. The `ADAPTERS` array is the single
source of truth:

```ts
const ADAPTERS = [
    MessengerPlatformAdapter,
    ZaloPlatformAdapter, // ← already listed
    InstagramPlatformAdapter,
    TiktokPlatformAdapter,
    ShopeePlatformAdapter,
];
```

Adapters are auto-collected into `PLATFORM_ADAPTER` and indexed by `adapter.type`
in `PlatformAdapterRegistry`.

If your adapter needs extra dependencies (HTTP module overrides, a third-party
SDK, an OAuth service from `src/common/<platform>/`), add them to the module's
`imports` or `providers` block.

### 3. Map a URL slug

`src/modules/platform/constants/platform-slug.constant.ts` — add an entry only if
the slug isn't already there:

```ts
export const PLATFORM_SLUG_TO_TYPE: Record<string, ENUM_ACCOUNT_TYPE> = {
    messenger: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
    facebook: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
    zalo: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
    instagram: ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
    tiktok: ENUM_ACCOUNT_TYPE.TIKTOK_SHOP,
    shopee: ENUM_ACCOUNT_TYPE.SHOPEE_SHOP,
};
```

Your endpoint is now `POST /v1/webhooks/<slug>`.

### 4. Verify with the provider

1. **Public URL** — expose `https://<your-host>/v1/webhooks/<slug>` via tunnel
   (ngrok, Cloudflare Tunnel) or a deployed environment.
2. **Configure the provider portal** with that URL plus the verify token /
   secret you've set in env config.
3. **Smoke test the handshake** (where applicable):
    ```bash
    curl "https://<host>/v1/webhooks/messenger?hub.mode=subscribe&hub.verify_token=$FACEBOOK_WEBHOOK_VERIFY_TOKEN&hub.challenge=ping"
    # → ping
    ```
4. **Send a test event** from the provider portal and tail logs:
    ```
    Webhook event accepted: platform=FACEBOOK_PAGE kind=message sender=… mid=…
    ```
    Duplicate retries should log:
    ```
    Duplicate webhook event ignored: FACEBOOK_PAGE:<mid>
    ```
5. **Send an outbound test** through the operator console — the operator reply
   goes through the same adapter via `ConversationMessagingService` and proves
   `messaging.sendMessage` end-to-end.

## Provider checklist (per platform)

| Platform              | Signature header      | Algorithm                                      | GET challenge         | API endpoint                                 |
| --------------------- | --------------------- | ---------------------------------------------- | --------------------- | -------------------------------------------- |
| Messenger / Instagram | `x-hub-signature-256` | HMAC-SHA256 over raw body, key = app secret    | yes (`hub.challenge`) | `https://graph.facebook.com/<v>/me/messages` |
| Zalo OA               | `x-zevent-signature`  | `mac=<HMAC-SHA256(rawBody, appSecret)>`        | no                    | `https://openapi.zalo.me/v3.0/oa/message/cs` |
| TikTok Shop           | `x-tts-signature`     | HMAC-SHA256 over `app_key + timestamp + body`  | no                    | TikTok Customer Service API                  |
| Shopee                | `authorization`       | HMAC-SHA256 of `partner_id + path + timestamp` | no                    | Shopee Open Platform Chat API                |

Always implement the verification against the **raw bytes** received — never the
re-stringified parsed JSON. The controller hands the adapter `req.rawBody` for
that reason.

## Operational notes

- **Idempotency.** Providers retry aggressively on non-2xx ACKs. The controller
  always returns `200 EVENT_RECEIVED` once the signature passes, even before
  events are dispatched. `WebhookDedupeService` keeps a 5-minute Redis key per
  `(platform, externalMessageId)` so retries are silently dropped.
- **Token storage.** Tokens are AES-256 encrypted in `AccountEntity.accessToken`.
  Adapters must call `AccountService.decryptToken(account.accessToken)` before
  using them — see `MessengerPlatformAdapter.token()`.
- **Configuration.** All secrets (`appSecret`, `webhookSecret`, `apiVersion`)
  come from `ConfigService`. Don't read `process.env` directly inside adapters.
- **Failure surface.** Stub adapters throw `NotImplementedException` (HTTP 501)
  for every method except the no-op `verifyChallenge`. Unknown slugs → 404.
  Registered slug but missing adapter → 400. Signature failure → 403.
- **Future processor.** Dispatch step (controller line: `TODO(processor)`) will
  hand events to a `MessageProcessorService` that handles persistence, handoff
  detection, and LLM streaming. Until that lands, Facebook continues using the
  existing `FacebookHandlerService` + BullMQ flow under `src/common/facebook/`.
