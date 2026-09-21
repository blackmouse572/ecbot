---
applyTo: "apps/api/**/*.ts"
description: "Multi-platform OAuth account linking: architecture, factory pattern, token encryption, and token refresh cron job"
---

# OAuth Account Connect Instructions

## Overview

Account linking uses a unified OAuth flow across 5 platforms: **Facebook**, **Instagram**, **Zalo**, **TikTok Shop**, and **Shopee**. All platforms share a single endpoint and a factory-based dispatch pattern.

```
POST /:workspace/account/link
Body: { code: string, platform: ENUM_ACCOUNT_TYPE }
```

---

## Platform Enum Values

```typescript
export enum ENUM_ACCOUNT_TYPE {
  FACEBOOK_ACCOUNT = "FACEBOOK_ACCOUNT",
  FACEBOOK_PAGE = "FACEBOOK_PAGE",
  INSTAGRAM_ACCOUNT = "INSTAGRAM_ACCOUNT",
  ZALO_ACCOUNT = "ZALO_ACCOUNT",
  TIKTOK_SHOP = "TIKTOK_SHOP",
  SHOPEE_SHOP = "SHOPEE_SHOP",
}
```

`FACEBOOK_PAGE` is created automatically as child records when a `FACEBOOK_ACCOUNT` is linked — it is **not** a valid value for the link endpoint.

---

## Architecture

### Factory Pattern

All platform OAuth services implement `IOAuthPlatformService` from `src/common/oauth/interfaces/oauth-platform.interface.ts`:

```typescript
interface IOAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  externalId: string; // Platform-assigned entity ID (stable, used as upsert key)
  name: string;
  avatar?: string;
  link?: string;
}

interface IOAuthPlatformService {
  getTokenAndProfile(code: string): Promise<IOAuthTokenResult>;
  refreshToken(refreshToken: string): Promise<IOAuthTokenResult>;
}
```

`OAuthPlatformFactory` (`src/common/oauth/oauth-platform.factory.ts`) maps `ENUM_ACCOUNT_TYPE` to the correct service:

```typescript
const service = this.oauthFactory.getService(platform); // throws BadRequestException for unsupported
const tokenResult = await service.getTokenAndProfile(code);
```

### Platform Service Locations

| Platform    | Service File                                                   |
| ----------- | -------------------------------------------------------------- |
| Facebook    | `src/common/oauth/services/facebook-oauth-adapter.service.ts`  |
| Instagram   | `src/common/instagram/services/instagram-oauth.service.ts`     |
| Zalo        | `src/common/zalo/services/zalo-oauth.service.ts`               |
| TikTok Shop | `src/common/tiktok-shop/services/tiktok-shop-oauth.service.ts` |
| Shopee      | `src/common/shopee/services/shopee-oauth.service.ts`           |

All are registered in `OAuthModule` (`src/common/oauth/oauth.module.ts`) and imported into `AccountModule`.

---

## Token Encryption

Access tokens and refresh tokens are **always encrypted at rest** using AES-256-CBC before being stored in the database.

```typescript
// Encrypt before saving
const encrypted = this.helperEncryptionService.aes256Encrypt(
  plainToken,
  key,
  iv,
);

// Decrypt before use
const plain = this.helperEncryptionService.aes256Decrypt(
  encryptedToken,
  key,
  iv,
);
```

Encryption keys come from env vars loaded via `OAuthConfig` (`src/configs/oauth.config.ts`):

```
OAUTH_TOKEN_ENCRYPT_KEY=   # 32-character key
OAUTH_TOKEN_ENCRYPT_IV=    # 16-character IV
```

**Never store or log plain-text tokens.**

---

## externalId Convention

`externalId` is the platform's own entity identifier (e.g. Facebook user ID, Instagram user ID, Shopee shop ID). It is:

- Stored as-is from the OAuth token response
- Used as the upsert key: re-linking an already-connected account updates the existing record instead of creating a duplicate
- Not encrypted — it is a non-sensitive public identifier

```typescript
await this.accountRepository.upsert(
    {
        externalId: tokenResult.externalId,  // platform ID
        workspace: ...,
        accessToken: this.encryptToken(tokenResult.accessToken),
        ...
    },
    actionBy
);
```

---

## Universal Upsert Pattern

**All platforms** use `AccountRepository.upsert()` keyed on `externalId + workspaceId`. Re-linking an already-connected account updates the existing record (refreshes tokens, name, avatar) rather than creating a duplicate.

```typescript
// Applied for every platform — Instagram, Zalo, TikTok Shop, Shopee, and Facebook
await this.accountRepository.upsert(
  {
    externalId: tokenResult.externalId, // platform entity ID — upsert key
    workspace: this.em.getReference(WorkspaceEntity, workspaceId),
    accessToken: this.encryptToken(tokenResult.accessToken),
    refreshToken: this.encryptToken(tokenResult.refreshToken),
    tokenExpiresAt: tokenResult.tokenExpiresAt,
    name: tokenResult.name,
    slug: slugify(tokenResult.name + tokenResult.externalId),
    avatar: tokenResult.avatar,
    link: tokenResult.link,
    type: platform,
    status: ENUM_ACCOUNT_STATUS.ACTIVE,
  },
  actionBy,
);
```

The controller endpoint is identical for all platforms — only `platform` in the request body changes:

```
POST /:workspace/account/link
{ "code": "...", "platform": "INSTAGRAM_ACCOUNT" }
{ "code": "...", "platform": "SHOPEE_SHOP" }
```

---

## Facebook-Specific Additional Steps

Facebook linking has **extra steps** on top of the universal upsert:

1. Exchange code for user access token
2. Subscribe pages to webhook via `FacebookWebhookService`
3. Upsert the main `FACEBOOK_ACCOUNT` record (same universal pattern above)
4. Fetch all managed pages and upsert each as a `FACEBOOK_PAGE` child record

```typescript
// Page upsert — build object directly from page data
// DO NOT use mapPageToAccountEntity: it calls plainToInstance with
// excludeExtraneousValues:true but AccountEntity has no @Expose() decorators,
// which silently strips ALL fields including externalId.
const pageUpsertPromises = pages.map(page =>
    this.accountRepository.upsert(
        {
            externalId: page.id,
            workspace: ...,
            accessToken: this.encryptToken(page.access_token),
            name: page.name,
            slug: slugify(page.name + page.id),
            avatar: page.picture?.data?.url,
            link: `https://www.facebook.com/${page.id}`,
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            status: ENUM_ACCOUNT_STATUS.ACTIVE,
            account: account.id,
        },
        actionBy
    )
);
```

The response for `FACEBOOK_ACCOUNT` includes the parent account plus `pages[]` as child records. All other platforms return `pages: []`.

---

## Token Refresh Cron Job

`AccountTokenRefreshScheduler` (`src/modules/account/schedulers/account-token-refresh.scheduler.ts`) runs **every hour** and refreshes tokens expiring within 30 minutes.

```
@Cron(CronExpression.EVERY_HOUR)
```

Failure behavior:

- If `platformService.refreshToken()` throws, the account `status` is set to `BLOCKED`
- The user must re-link the account to restore access
- Other accounts continue processing after a partial failure

`AccountRepository.findExpiringSoon(thresholdMinutes = 30)` returns accounts where:

- `tokenExpiresAt < now + threshold`
- `status != BLOCKED`
- `refreshToken IS NOT NULL`

---

## Adding a New Platform

1. Create `src/common/<platform>/services/<platform>-oauth.service.ts` implementing `IOAuthPlatformService`
2. Add `<PLATFORM> = '<PLATFORM>'` to `ENUM_ACCOUNT_TYPE`
3. Register the service in `OAuthModule` providers and exports
4. Map it in `OAuthPlatformFactory.getService()` switch
5. Add env vars to `oauth.config.ts` and `.env.example`
6. Add the platform to `LINKABLE_PLATFORMS` array in `account.link.request.dto.ts`

---

## Environment Variables

```
# Token encryption (required for all platforms)
OAUTH_TOKEN_ENCRYPT_KEY=
OAUTH_TOKEN_ENCRYPT_IV=

# Facebook
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Instagram
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=

# Zalo
ZALO_APP_ID=
ZALO_APP_SECRET=
ZALO_REDIRECT_URI=

# TikTok Shop
TIKTOK_APP_KEY=
TIKTOK_APP_SECRET=
TIKTOK_REDIRECT_URI=

# Shopee
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_REDIRECT_URI=
```

---

## Security Notes

- **Never bypass encryption** — always call `encryptToken()` before persisting; always decrypt before using in API calls
- **Shopee and TikTok** use HMAC-SHA256 request signing — see their respective service implementations for the signing algorithm
- **Token expiry** — store `tokenExpiresAt` from the OAuth response so the cron job can proactively refresh before expiry
- **Disconnect** — deletes the local account record only; does not revoke the token on the platform side
