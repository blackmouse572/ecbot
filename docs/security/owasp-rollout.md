# OWASP fix branch — rollout runbook

Steps to ship `fix/security-owasp`. Background: [owasp-fix-plan.md](./owasp-fix-plan.md).

## 1. Before merging

- **Email case.** Run:

  ```sql
  select count(*) from users where email <> lower(email);
  ```

  Email lookups are now exact-lowercase. A non-zero count means those users can no longer log in. Write and
  run a lowercase migration first, and resolve any duplicates it creates.
- **Migrations.** Run `pnpm db:migrate:up` (`migration:up`) against a real PostgreSQL copy, not only the
  unit tests. This branch adds OTP-attempt columns.
- **API client.** Run the real `pnpm generate:client` and diff the result against the hand-patched types in
  `@repo/client`. Commit the generated output if they differ.

## 2. Configuration

Set these before deploying anything:

| Variable | Where | Notes |
| --- | --- | --- |
| `API_INTERNAL_TOKEN` | apps/api **and** apps/ai | Must be the same strong random value on both. apps/api refuses to boot without it. apps/ai logs `internal_token_not_configured` at startup and answers 503 to apps/api when it is missing. Never use the `.env.example` placeholder. |
| `HOME_URL` | apps/api | Used for reset-password and invitation links. |
| `APP_TRUST_PROXY_HOPS` | apps/api | Must equal the real number of proxies in front of the API: `1` for a single load balancer, `2` behind a CDN plus a load balancer. A value that is too high lets clients spoof their IP through `X-Forwarded-For` and get around the rate limits. A value that is too low puts every client in one throttle bucket. |
| `CHAT_MODEL_TIMEOUT_SECONDS` | apps/ai | Optional. The default is 60. |

## 3. Deploy order

1. **Deploy apps/api first.**
2. **Deploy apps/ai straight after.** Until the new apps/ai is live, its old follow-up cancel calls get
   `400` from the new apps/api, so follow-up cancellation is degraded for that window.

Do not reverse the order. A new apps/ai in front of an old apps/api requires the internal token and rejects
the old API's calls, which takes down every AI feature until apps/api ships.

## 4. What users and operators will notice

- **One forced re-login.** Before this branch, login sessions were written to Redis with a TTL of about
  10 minutes instead of the refresh-token lifetime (seconds were passed where milliseconds were expected).
  Access tokens are now checked against the Redis session, so any session older than that short TTL is
  already gone and the user has to log in again once.
- **A Redis outage logs everyone out.** Every authenticated request now looks up the session in Redis. Treat
  Redis as a hard dependency of authentication and alert on it.
- **Throttles are per replica.** The throttler uses in-memory storage, so the real limit is
  `limit × replica count` (for example, 5/min per IP on login becomes 15/min with 3 replicas). Moving the
  throttler to Redis storage is a follow-up.
- **Email verification codes.** Codes expire after 5 minutes or after 5 wrong attempts. Public
  `/verification/resend/email` then issues a fresh code for an unverified user.

## 5. Follow-ups

Tracked in the plan: [Follow-ups (not in this branch)](./owasp-fix-plan.md#follow-ups-not-in-this-branch).
Also add: Redis-backed throttler storage.
