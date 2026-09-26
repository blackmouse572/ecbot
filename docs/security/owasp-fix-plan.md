# OWASP security fix plan — branch `fix/security-owasp` (from `main`)

Worktree: `/home/jaden-nguyen/workspaces/ecbot-security`. Source: OWASP scan (Top 10:2025, ASVS 5.0,
LLM Top 10) of 2026-09-24. Line numbers below are approximate — always verify against the code.

## Decisions (confirmed by the user)

- Branch from `main`; the WhatsApp feature branch rebases on top later.
- Forgot-password → generic "check your email" screen; the reset token travels only via the emailed link.
- apps/api → apps/ai auth: header `X-Internal-Token: $API_INTERNAL_TOKEN`, constant-time compare, fail closed.
  Not `Authorization` — on Cloud Run that header carries the GCP IAM ID token, keep it there.
- Invitable users: fuzzy name search only over users sharing a workspace with the caller, no `email` in
  fuzzy results; full-email searches do an exact match.
- Skipped: write-tool gating on customer channels. Deferred: refresh-token rotation, dashboard CSP /
  widget origin split.

## Global Constraints

- TDD: write the failing test first, see it fail, then the minimal code to pass. Read `AGENTS.md`.
- Minimal changes. Reuse existing helpers (`findOneByIdInWorkspace`, `HelperEgressService`, `FileTypePipe`,
  `joinWorkspaceViaInvitation`, `sessionService.updateManyRevokeByUser`). No speculative abstractions.
- Follow area conventions: `apps/api/docs/*`, `.github/instructions/api/*`, `.github/instructions/app/*`,
  `apps/ai/README.md`. Kebab-case files, one class per file.
- i18n: every new user-facing string in apps/app goes in both `apps/app/src/i18n/translations/en.json`
  and `vi.json`; API messages follow `.github/instructions/api/response.instructions.md`.
- API tests: unit specs under `apps/api/test/modules/**` (Jest, mocked providers). Run one file with
  `cd apps/api && pnpm test -- <path>`. apps/ai: `cd apps/ai && uv run pytest -m "not integration" <path>`.
  apps/app / apps/edge / packages/ui: `pnpm --filter <name> test`.
- Migrations: `apps/api/migrations/`, hand-written, timestamp-named. The MikroORM snapshot
  must stay in parity with entities (CI guard) — see commit `2a89883` for the pattern.
- After API DTO/route changes that apps/app consumes: `pnpm generate:client`.
- Commits: Conventional Commits `<type>(<scope>): <subject>`, scope = workspace (api, app, ai, edge, ui).
  End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  Commit only in this worktree; never push.
- Do not break existing tests; update tests that pinned the old insecure behavior, and say so in the report.

---

### Task 1: Close the password-reset account takeover (api)

Files: `apps/api/src/configs/reset-password.config.ts`, `apps/api/src/modules/reset-password/**`
(controller `reset-password.public.controller.ts`, service, entity, response DTO), migration.

1. **Fix the emailed link (broken today).** `prefixUrl: 'reset-password'` + `url: \`${prefixUrl}/${token}\``
   yields `reset-password/<token>`; the frontend route reads `?token=` only. Build
   `${home.url}/reset-password?token=<token>` using `ConfigService.get('home.url')` (same key as
   `chatbot.controller.ts` ~525 uses for preview links), trailing slash stripped. The email job payload
   keeps `url`/`token`.
2. **Stop leaking the token.** `POST /request` and `GET /get/:token` responses must not contain `token`
   or `url` (update `ResetPasswordCreteResponseDto` to `{ expiredDate, to }`). This includes the
   "already requested" short-circuit (`checkActiveLatestEmailByUser`).
3. **No enumeration.** `/request` with an unknown email returns the same 200 response shape
   (e.g. `{ data: undefined }`/empty ack — pick one shape for both paths) instead of 404.
4. **Require the verified OTP.** `/reset/:token` rejects (400, reuse an existing reset-password status
   code/message or add one with i18n) when `resetPassword.verifyDate` is null.
5. **Revoke sessions.** Inside the reset transaction call
   `sessionService.updateManyRevokeByUser(user.id, { em: session })` (same as change-password).
6. **OTP attempts.** Add `otpAttempt: number` (int, default 0) to `ResetPasswordEntity` + migration.
   On `/verify/:token` OTP mismatch increment; at 5 failed attempts inactivate the row and throw a new
   `ATTEMPT_MAX` error (add enum code + i18n message en/vi).
7. Reset/confirmation mail goes to `user.email`, never the request-body email.

Tests first: extend `apps/api/test/modules/reset-password/reset-password.public.controller.spec.ts`
(it pins the old response shape — update it; add a `SessionService` mock) and add/extend a service spec
for the url shape. Cases: response has no token/url; unknown email → same 200 shape and no mail enqueued;
reset without verifyDate → 400; reset revokes sessions with `{ em: session }`; 5 wrong OTPs → locked.

Commit: `fix(api): close password-reset account takeover`

### Task 2: Forgot-password "check your email" screen (app)

Depends on Task 1. Run `pnpm generate:client` first (response DTO changed).

`apps/app/src/routes/auth/forgot-password/forgot-password.tsx` currently does
`const { token } = await requestReset(email)` then navigates to `/reset-password?token=…&email=…`.
Replace with a local `submitted` state that renders a "check your email" message for BOTH success and
failure (no distinguishing UI), keeping honeypot/Turnstile behavior. `reset-password.tsx` keeps reading
`token` from the query string (the emailed link). Fix `apps/app/src/hooks/api/reset-password.ts` +
`reset-password.test.ts` for the new response type (no `token`). New i18n keys in en + vi.

Tests first: new `forgot-password.test.tsx` — success shows check-email state and never navigates with a
token; a rejected request shows the identical state. Follow `.github/instructions/app/*`.

Commit: `fix(app): show check-your-email after a password reset request`

### Task 3: Authenticate apps/api → apps/ai calls (api + ai)

**api:** new `apps/api/src/common/utils/ai-internal-headers.util.ts` returning
`{ 'X-Internal-Token': token }` from `ConfigService` (add `API_INTERNAL_TOKEN` to the matching config file,
e.g. `ai.config.ts`, and `.env.example`). Use it in `chatbot/services/chatbot-ai.service.ts` (merge with the
existing `getInternalAuthHeader()` GCP header — keep that), `knowledge-base/services/knowledge-ingest-task.service.ts`
and `customer/services/customer-tag-classifier-task.service.ts` (replace their raw
`process.env.API_INTERNAL_TOKEN` + `Authorization: Bearer` with the helper). Update those specs.

**ai:** add `API_INTERNAL_TOKEN: SecretStr = Field(default=SecretStr(""))` in `core/variables.py`; new
`core/security.py` FastAPI dependency `require_internal_token(x_internal_token: str | None = Header(None))`:
503 if the configured token is empty, 401 if missing or `not secrets.compare_digest(...)`. Add
`dependencies=[Depends(require_internal_token)]` on the `APIRouter` in `modules/chat/routers.py`,
`modules/customer/routers.py`, `modules/rag/routers.py`. `/health` stays open. Update `.env.example` and
`docs/deploy-render.md` (remove "endpoints are public / accepted risk"; say the token must match apps/api).
Make sure existing apps/ai tests that call these routers still pass (set the token + header in a fixture).

Tests first: `apps/ai/tests/test_internal_auth.py` (unset → 503, missing/wrong → 401, correct → passes
auth, `/health` open) and api spec asserting the header is sent on every call site.

Commit: `fix(api,ai): require an internal token on apps/ai routes`

### Task 4: Scope conversation access to the workspace (api)

`conversation/controllers/conversation.workspace.controller.ts`: `get` (~207, lacks `@WorkspacePayload()`),
`updateStatus` (~245), `updateBot` (~288), `listMessages` (~325), `sendMessage` (~385),
`reactToMessage` (~431) all look up by id only. Use the existing `findOneByIdInWorkspace(id, workspace.id)`
(`markRead` ~167 is the correct example; conversation has no workspace FK — it filters via
`chatbot.workspace`). Extend it to accept populate options if `get` needs them.
`conversation-messaging.service.ts` `sendOperatorReply` (~66), `reactToMessage` (~131), `listMessages`
(~197): add a `workspaceId` parameter and use the scoped repository lookup. **Read every caller of these
service methods first** — if any inbound-webhook path calls them without a workspace, keep that path
working (do not break inbound message delivery).

Tests first: extend `test/modules/conversation/conversation.workspace.controller.spec.ts` and
`conversation-messaging.service.spec.ts`: a conversation from another workspace → 404 for each handler.

Commit: `fix(api): scope conversation access to the caller's workspace`

### Task 5: Cross-workspace linking of accounts and knowledge (api)

1. `chatbot/services/chatbot.service.ts` `create` (~138), `update` accounts branch (~182),
   `linkBatchAccounts` (~348): before adding account references, load
   `{ id: { $in: ids }, workspace: workspaceId }` and throw 400 (i18n message) if any id is missing.
2. `knowledge-base/controllers/chatbot-knowledge-item.workspace.controller.ts` `link` (~176): the knowledge
   item must satisfy `knowledgeBase.workspace === workspace.id`, else 404.
3. `knowledge-base/services/knowledge-base.service.ts` `update` (~98) and `softDelete` (~123): look up
   `{ id, workspace: workspaceId }`; thread `workspace.id` from the controller.
4. `knowledge-base/controllers/knowledge-item-tag.workspace.controller.ts` `list` (~63) / `delete` (~98):
   verify the `:knowledgeBaseId` belongs to `workspace.id` first, 404 otherwise.
5. `account/repository/repositories/account.repository.ts` `upsert` (~82-99): when `existing` has a
   different workspace than `data.workspace`, throw `ConflictException` (i18n message) — keep the
   same-workspace "revive soft-deleted row" behavior intact.

Tests first: extend `test/modules/chatbot/services/chatbot.service.spec.ts`,
`test/modules/account/repository/repositories/account.repository.upsert.spec.ts`; new specs for the KB
pieces where none exist.

Commit: `fix(api): block cross-workspace account and knowledge linking`

### Task 6: Crypto-secure randomness and Google token verification (api)

1. `common/helper/services/helper.string.service.ts` `random()` and `helper.number.service.ts`
   `random()`/`randomInRange()` → `crypto.randomInt` (note `randomInt` max is exclusive — keep the current
   inclusive/exclusive semantics of each method exactly). This fixes every caller (OTPs, reset token, API
   key/client-credential secrets, signing secrets, invitation codes).
2. `auth/services/auth.service.ts` `googleGetTokenInfo` (~389): `verifyIdToken({ idToken, audience: googleClientId })`
   (store the client id like `appleClientId`), and use `payload.email_verified`; reject (401, i18n) when it
   is not true.

Tests first: new `test/modules/common/helper/helper.string.service.spec.ts` /
`helper.number.service.spec.ts` (length/charset/range; `Math.random` not used), Google spec asserting the
`audience` arg and the unverified-email rejection.

Commit: `fix(api): use crypto randomness and verify Google token audience`

### Task 7: Bind email verification OTPs to the user (api)

`verification/controllers/verification.email.controller.ts` (~56, ~108) looks up `findOne({ to: email })`
only. Look up `{ user: id, to: email, isActive: true, expiredDate: { $gte: now } }` ordered by
`createdAt DESC` (mirror `findOneLatestEmailByUser` / reset-password's `checkActiveLatestEmailByUser`).
Add `otpAttempt` to `VerificationEntity` + migration; on OTP mismatch increment, and at 5 inactivate the row
and throw an attempt-max error (enum code + i18n en/vi).

Tests first: new/extended `test/modules/verification/verification.email.controller.spec.ts`: OTP from
another user's row is not accepted; expired row not accepted; 5 wrong OTPs → locked.

Commit: `fix(api): bind email verification codes to the user`

### Task 8: Egress-guard API-channel callbacks and check tool links (api)

1. `platform/services/api-channel-callback.service.ts` (~69) posts with raw axios to the workspace-controlled
   `callbackUrl`. Use `HelperEgressService.fetch` (see `tool/services/http-tool-executor.service.ts` for usage:
   fetch-style `RequestInit`, `AbortController` timeout). In the retry loop
   (`api-channel.platform-adapter.ts` ~176-224) an `EgressBlockedError` stops retrying immediately.
2. `tool/services/tool-execution.service.ts` `execute` (~42): after loading the tool, require a
   `ChatbotToolEntity` row for `(chatbot: cmd.chatbotId, tool: toolId)` with `enabled: true` (check exact
   field names in `chatbot-tool.entity.ts`; if the entity has `enabledActions`, also require `actionName`
   to be allowed when that list is non-empty). Otherwise 403/404 without executing.

Tests first: extend `test/modules/platform/api-channel-adapter.spec.ts` (blocked → no retries) and a
`ToolExecutionService` spec (no link / disabled link → rejected, executor never called).

Commit: `fix(api): guard API-channel callbacks and require chatbot tool links`

### Task 9: SSRF-safe fetching for the knowledge-base crawler (ai)

`apps/ai/src/eccho_ai/llm/retrievers/web_crawler.py` (~94 `follow_redirects=True`, ~131 `client.get(url)`)
fetches operator-supplied URLs with no address checks. Add `llm/retrievers/safe_fetch.py` (stdlib only):
`EgressBlockedError`; allow only http/https; resolve the host with `socket.getaddrinfo` (run it off the
event loop) and reject if ANY address is private/loopback/link-local/reserved/multicast/unspecified
(`ipaddress`); `follow_redirects=False` with a manual loop re-validating each hop, max 5 redirects;
stream the body and stop past 5 MB. Wire it into `web_crawler.py`; its existing broad `except` already
turns a failure into a skipped page. Document the DNS-rebinding window in a short comment.
Mirror the rules in `apps/api/src/common/helper/services/helper.egress.service.ts`.

Tests first: `apps/ai/tests/test_safe_fetch.py` using `httpx.MockTransport` + monkeypatched `getaddrinfo`:
non-http scheme, 127.0.0.1, 10.x, 169.254.169.254, hostname resolving private, public allowed, redirect to
private blocked at that hop, >5 redirects, oversize body.

Commit: `fix(ai): block internal addresses in the knowledge-base crawler`

### Task 10: Invitation, join-request and role checks (api)

1. `workspace/controllers/workspace.member.controller.ts` `joinWorkspace` (~155): replace the hand-rolled
   logic with the existing `workSpaceMemberService.joinWorkspaceViaInvitation(token, callerUserId, { em })`
   using the caller from the JWT, and require the caller's email to equal the invitation's `invitedEmail`.
   (That method already checks PENDING status and expiry.) Frontend `useJoinWorkspace` sends only the token —
   no FE change expected.
2. `workspace.owner.controller.ts` (~378) builds the emailed invite link from the `Origin` header via
   `@GetClientOrigin()`. Use `home.url` from config instead; remove the decorator if unused afterwards.
3. `workspace.owner.service.ts` `findWorkspaceByOwner(ownerId)` ignores the `:workspace` param. Take
   `workspaceId` and require `{ id: workspaceId, owner: ownerId }`; pass `workspace.id` from the controller.
   Update `apps/api/test/e2e/utils/workspace.helper.ts` (`decodeInvitationWorkspaceId` workaround) and
   `test/e2e/workspace-member-invite.e2e-spec.ts` comments/asserts that documented the old behavior.
4. `workspace.request.service.ts` `approve` (~157) and `requests/services/requests.service.ts` `approve`
   (~137): look up `{ id: requestId, workspace: workspace.id }`, 404 otherwise.
5. `workspace/guards/workspace.policy.guard.ts` (~95): ignore roles with `isActive === false`
   (the spec lives at `src/modules/workspace/guards/__tests__/workspace.policy.guard.spec.ts`).

Tests first: unit specs for each (caller ≠ invitee → rejected; revoked/accepted invitation → rejected;
foreign request id → 404; inactive role grants nothing; invite link uses configured URL, not Origin).

Commit: `fix(api): harden workspace invitations, requests and role checks`

### Task 11: Stop exposing every platform user in invite search (api)

`workspace.member.controller.ts` `getAvailableInviteMembers` (`GET /:workspace/invitable`, ~366) fuzzy-searches
all platform users and returns their email. New behavior:
- If `search` is a full email: exact lowercase match on email (at most 1 result), excluding current members.
  Keep the current response DTO for this branch (the invitee's email is what the caller typed).
- Otherwise: fuzzy search only over users who share at least one workspace with the caller (active
  memberships or ownership), excluding current members of this workspace; map with a DTO that omits `email`.
- Empty search → the co-member list (paged as today).
FE (`apps/app/.../member-invite-dialog/member-invitable-list.tsx`, `hooks/api/workspace-member.ts`) should keep
working; adjust only if it reads `email` from fuzzy results (check), and regenerate the client if the DTO changes.

Tests first: controller/service spec — stranger not returned by name search; co-member returned without
`email`; exact email finds a stranger; current members excluded.

Commit: `fix(api): limit invite search to co-members and exact emails`

### Task 12: Exact email lookups and escaped search regex (api)

1. `user/services/user.service.ts`: every `email: { $ilike: … }` (~125, 272, 294, 329, 361) → exact
   `email: value.toLowerCase()`. Leave `username` `$ilike` lookups unchanged (usernames are not normalized
   on write).
2. `common/database/decorators/database.decorator.ts` `DatabaseHelperQueryContain` (~22-31): escape regex
   metacharacters of `value` before `new RegExp` (both branches).

Tests first: `test/modules/user/user.service.spec.ts` (`john_smith@x.com` does not match `john.smith@x.com`;
mixed case input still matches), new decorator spec (`.*` treated literally; invalid pattern like `(` no longer throws).

Commit: `fix(api): exact email lookups and literal search matching`

### Task 13: Revocation-aware access tokens, throttles and trust proxy (api)

1. `auth/guards/jwt/strategies/auth.jwt.access.strategy.ts` `validate` (~39): if
   `sessionService.findLoginSession(data.session)` returns nothing, throw 401 (reuse the existing access-token
   unauthorized code/message). Keep the `touchLastActive` call. Check other specs that mock `SessionService`.
2. `@Throttle({ default: { ttl: 60000, limit: 5 } })` (pattern: `chatbot-preview.public.controller.ts`) on
   credential login, reset-password request/verify/reset, and email-verification send/verify.
3. `main.ts`: `app.set('trust proxy', <hops>)` from config (`APP_TRUST_PROXY_HOPS`, default 1; add to the
   app config and `.env.example`).
Check `test/e2e` for loops over these endpoints that would now hit 429 and adjust.

Tests first: new `test/modules/auth/auth.jwt.access.strategy.spec.ts` (revoked session → 401; active → payload).

Commit: `fix(api): reject revoked sessions and rate-limit auth endpoints`

### Task 14: Avatar upload limits (api)

`user/controllers/user.shared.controller.ts` (`updateProfile` ~123, `uploadAvatarImage` ~75, presign
`uploadPhotoProfile` ~178, `updatePhotoProfile` ~204) and `workspace/controllers/workspace.owner.controller.ts`
(`createWorkSpace` ~227, `updateWorkSpace` ~281, avatar helper ~144):
- `FileInterceptor('image', { storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } })`
- `@UploadedFile(new FileTypePipe([ENUM_FILE_MIME_IMAGE.JPG, ENUM_FILE_MIME_IMAGE.JPEG, ENUM_FILE_MIME_IMAGE.PNG]))`
  (pattern: `knowledge-base/controllers/knowledge-item.workspace.controller.ts` ~281-306)
- object keys use a random UUID + validated extension, never `originalname`
  (`user.service.ts` `createRandomFilenamePhoto` ~708 has an unsubstituted `{user}` template — fix it to
  `user/{userId}/<uuid>.<ext>`)
- `updatePhotoProfile` rejects (403) keys not starting with `user/{user.id}/`
- presign request DTO: `@Max(2 * 1024 * 1024)` on `size`.

Tests first: controller/service specs for the key prefix check, random key shape, size cap.

Commit: `fix(api): limit avatar uploads by size, type and key`

### Task 15: Bound and scope AI follow-ups (api + ai)

**api:** `platform/dtos/request/followup.schedule.request.dto.ts` `delayMinutes` add `@Max(43200)`;
`platform/services/followup.service.ts` `schedule()` rejects (400, i18n) when the conversation already has
5 pending follow-ups; `platform/controllers/followup.system.controller.ts` `DELETE :id` requires query
`conversationId` (400 if missing) and cancels only a pending follow-up of that conversation
(`followup.repository.ts` `findPendingById` gets an optional `conversationId` filter; keep
`cancelForWorkspace` unchanged).
**ai:** `core/api_client.py` `delete(path, params=None)`; `llm/tools/system_tools.py` `cancel_followup` sends
`params={"conversationId": ctx["conversation_id"]}` and returns an error when there is no conversation context.

Tests first: `test/modules/platform/followup.service.spec.ts`, `followup.system.controller.spec.ts`,
`apps/ai/tests/test_system_tools.py` (update `test_cancel_followup_deletes`).

Commit: `fix(api,ai): cap follow-ups and scope cancel to the conversation`

### Task 16: Agent limits and safe errors (ai)

- `modules/chat/models/chat_models.py`: add `max_tool_iterations: Optional[int] = Field(None, ge=1, le=50)` to
  `ChatRequest` (apps/api already sends it); narrow `ChatHistoryMessage.role` to `Literal["user", "assistant"]`
  and remove the now-dead system branch in `modules/chat/services.py` `get_agent_input`.
- `modules/chat/services.py` `get_agent_config`: always set `recursion_limit = iterations * 2 + 1`
  (default iterations 10).
- `llm/providers/chat_model.py` (~71): `timeout=AppVars.CHAT_MODEL_TIMEOUT_SECONDS` (new setting, default 60;
  `.env.example`).
- `modules/chat/stream_pipeline.py` (~160-165): log the exception, yield a fixed generic error text.

Tests first: `tests/test_chat_services.py` (recursion_limit set, system role rejected — update the old test that
expected system mapping), timeout test, `tests/test_chat_stream_parts.py` (exception text not leaked).

Commit: `fix(ai): bound agent loops and stop leaking stream errors`

### Task 17: Per-click OAuth state (app)

`apps/app/src/routes/accounts/account-create/hook/use-oauth-login.ts`: on each link click generate a random
state (`crypto.getRandomValues`), store it in `sessionStorage` keyed by platform, append `state=` to every
provider authorize URL (replace the static `state=zalo` / `state=tiktok`). `account-callback.tsx` includes
`state` from the redirect URL in the `oauth-success` postMessage payload. The message handler accepts success
only when the state matches, then clears it; mismatch → `onError` (i18n). Keep the origin check.
Shopee's URL is server-built — leave it and note it.

Tests first: `use-oauth-login.test.ts` (create if missing): state appended and stored; different per click;
matching state → onSuccess; wrong/missing/replayed → no onSuccess; cross-origin ignored.

Commit: `fix(app): verify OAuth state on account linking`

### Task 18: Password hashing, login errors, stray log (api)

- `configs/auth.config.ts` `saltLength: 8` → `12` (it is the bcrypt cost).
- `auth/services/auth.service.ts` (~350): delete the `console.log` of the decoded refresh payload.
- `auth/controllers/auth.public.controller.ts` `loginWithCredential` (~95-138): unknown email returns the same
  status/code/message as a wrong password, and the error body no longer includes `data.attempt`. Keep lockout for
  real accounts. Check `apps/app` login form for branching on the old 404 code / `attempt` and adjust (i18n).

Tests first: extend `test/modules/auth/auth.public.controller.spec.ts` (identical errors; no attempt count leaked).

Commit: `fix(api): stronger bcrypt cost and uniform login errors`

### Task 19: Constant-time token checks and safe chat images (api + edge + ui)

- api `platform/adapters/messenger/messenger.platform-adapter.ts` `verifyChallenge` (~118): constant-time
  compare of `hub.verify_token` (length-safe). `platform/controllers/platform-webhook.public.controller.ts`
  (~66): `res.type('text/plain')` before sending the challenge.
- edge: `apps/edge/src/timing-safe-equal.ts` (byte XOR compare over `TextEncoder` output, length check first);
  use it for `x-internal-secret` in `src/index.ts` (~139) and the FB verify token in `src/platforms/facebook.ts` (~14).
- ui: `packages/ui/src/components/common/ai/message.tsx` `MessageResponse`: pass Streamdown `urlTransform`
  that drops `src` for images that are not relative/same-origin (keep links; Streamdown's link-safety modal
  already gates them). Check the installed Streamdown version's API before writing.

Tests first: messenger adapter spec, `apps/edge/test/timing-safe-equal.spec.ts`,
`packages/ui/src/components/common/ai/message.test.tsx` (remote image has no src; relative image kept; link kept).

Commit: `fix(api,edge,ui): constant-time token checks and no remote chat images`

---

## Deploy notes

Full rollout steps (pre-merge checks, deploy order, user-visible effects): [owasp-rollout.md](./owasp-rollout.md).

- Set `API_INTERNAL_TOKEN` on both apps/api and apps/ai before deploying (apps/ai returns 503 without it).
- `HOME_URL` must be set on apps/api (reset and invitation links).
- apps/api first, then apps/ai straight after (follow-up cancel contract; see the runbook).
- New env: `APP_TRUST_PROXY_HOPS` (default 1), `CHAT_MODEL_TIMEOUT_SECONDS` (default 60).

## Checked, no change needed

Edge unsupported-platform webhooks: apps/api answers 2xx `{processed: 0}`, so the queue does not retry.

## Follow-ups (not in this branch)

Refresh-token rotation + reuse detection · dashboard CSP / widget on a separate origin · write-tool gating on
customer channels + human-in-the-loop approval · username normalization backfill · MFA · crawler DNS pinning
(rebinding window) · Shopee OAuth state (server-built URL).
