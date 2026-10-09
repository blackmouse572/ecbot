# ADR-0008: Inbound Inbox on Cloud Tasks

- **Status**: Accepted (2026-10-08)
- **Follows**: ADR-0007 (Inbound Inbox: receipt-before-ACK, BullMQ job as the durable record)
- **Issue**: #234

## Context

ADR-0007 made inbound webhooks durable by adding a BullMQ job to `INBOUND_EVENT_QUEUE` before the ACK, with `InboundEventProcessor` running the Turn pipeline. That worker runs outside any HTTP request, which caused three problems:

1. **Prod had to run hot.** Cloud Run `api` runs with `minScale=0` and CPU throttling. Between requests the worker gets almost no CPU, so replies were only reliable at min 1 with CPU always on (about $73/month), for an API that was billable for ~4.3 hours in 30 days.
2. **Staging and prod shared one queue.** Both services used the same Upstash database with no per-environment prefix, so a staging worker could take a prod webhook job and the prod customer never got a reply.
3. **Idle polling cost money.** Upstash bills per command, and an always-on worker polls Redis with no traffic.

Cloud Tasks already backed email, SMS, follow-ups, knowledge ingest and tag classification.

## Decision

The Cloud Task is the durable record of an inbound event.

- `InboundInboxService.accept` creates a task on the `inbound-event` queue before the ACK. The task name is `sha256(platform:externalMessageId)`, so a platform redelivery within ~1h is rejected as `ALREADY_EXISTS` (treated as success). The 26h `InboundEventDedupeService` claim inside `MessageProcessorService.process()` covers longer windows and the edge-forwarded path, as before.
- `InboundEventTaskController` (`POST /api/v1/system/tasks/inbound-event`) calls `MessageProcessorService.process` inside the Cloud Tasks HTTP request. A thrown Turn returns 5xx and Cloud Tasks retries; `process()` stays idempotent and releases its dedupe claim on failure.
- Before creating the task, `accept` takes a 26h `inbound-event-enqueued` marker (same store and TTL as the dedupe claim). The hourly reconciliation sweep re-accepts every message from the last 25h, and a task name is only reserved for ~1h, so without the marker each sweep would create a fresh task per recent message.
- If the task can't be created (Cloud Tasks unreachable, missing queue, IAM error), `accept` releases the marker and throws, so the webhook returns 5xx and the platform redelivers (receipt-before-ACK, as in ADR-0007). Only when Cloud Tasks isn't configured at all (no `CLOUD_TASKS_PROJECT_ID`, no emulator host) does `accept` run the Turn inline, fire-and-forget.
- Task callbacks (`/system/tasks/*`) accept only the `CLOUD_TASKS_SYSTEM_API_KEY` key (`@ApiKeyCloudTasksProtected`), not any SYSTEM key. The inbound-event task skips webhook signature checks, so the AI service's SYSTEM key must not be able to forge inbound events.
- The dedupe claim TTL goes from 24h to 26h, so it outlives the 25h reconciliation lookback that the old 26h job retention covered.
- Dedupe, channel rate limit and generation lease use a plain ioredis client (`RedisConnectionProvider`) instead of borrowing the queue's. Their in-memory fallbacks are unchanged.
- `bullmq`, `@nestjs/bullmq`, `InboundEventProcessor`, `ContextualWorkerHost` and the `BullModule` wiring are removed. BullMQ is no longer used anywhere in the API.

## Consequences

- The inbound Turn works at `minScale=0`: it runs inside a request and gets full CPU. Two things still need an instance that is alive and has CPU, so **keep min 1 with CPU always allocated** until they move:
    - Five in-process `@ContextualCron` jobs: `account-token-refresh` (hourly, page tokens stop refreshing without it), `inbound-reconciliation` (hourly), `session-revoke` (hourly), `tool-install-session-prune` (every 15 min) and `tool-invocation-prune` (daily). Moving them to Cloud Scheduler calling `/system` endpoints is the follow-up that makes min 0 safe.
    - The reply itself when `POC_EDGE_DEBOUNCE_URL` is unset or the edge debounce is down: the in-process `setTimeout` debounce fires after the response.
- Each task calls back the `API_BACKEND_URL` of the environment that created it, so staging can no longer take prod's events.
- No idle Redis polling; Redis commands now scale with messages only.
- Cloud Tasks adds ~50 to 150 ms before the Turn starts. The first 1M operations a month are free.
- The callback's real size ceiling is the API's own 100KB JSON body limit, not Cloud Tasks' 1MB. Inbound webhook bodies are capped at 100KB and API-channel text at 4000 characters, but the event carries the text twice (`text` and `raw`), so a near-limit webhook could exceed it.
- **Deploy gate:** the queue must exist in every environment before this ships, or every webhook returns 5xx. The repo has no deploy pipeline to enforce it, so create it by hand. Retries match the old BullMQ settings (3 attempts, exponential backoff from 2s), and dispatch is bounded so a burst can't send unbounded concurrent Turns at Postgres (BullMQ ran 4 per instance). The Cloud Tasks defaults (100 attempts, 1000 concurrent dispatches) would retry a poison event for days:

    ```sh
    gcloud tasks queues create inbound-event --location=asia-southeast1 \
      --max-attempts=3 --min-backoff=2s --max-backoff=60s \
      --max-concurrent-dispatches=20 --max-dispatches-per-second=20
    ```

- Local dev uses the Cloud Tasks emulator (`inbound-event` is in its `-initial-queue` list); `pnpm setup:local` sets `CLOUD_TASKS_EMULATOR_HOST`. With the emulator host set but the container down, webhooks return 5xx.
- The queue separates environments, but the dedupe, enqueue-marker, lease and rate-limit keys still share one Upstash database with no environment prefix. A staging and a prod event with the same platform message id would collide; that needs a per-environment key prefix (follow-up).
- Follow-up, out of scope here: the `api` service still has Direct VPC egress to `prod-redis-vpc`, which looks unused since Redis moved to Upstash.
