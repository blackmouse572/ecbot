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
- If the task can't be created (Cloud Tasks unreachable after the client's 3 attempts), `accept` runs the Turn inline, fire-and-forget, and still ACKs. That trades receipt-before-ACK for a reply, matching the old no-Redis fallback.
- The dedupe claim TTL goes from 24h to 26h, so it outlives the 25h reconciliation lookback that the old 26h job retention covered.
- Dedupe, channel rate limit and generation lease use a plain ioredis client (`RedisConnectionProvider`) instead of borrowing the queue's. Their in-memory fallbacks are unchanged.
- `bullmq`, `@nestjs/bullmq`, `InboundEventProcessor`, `ContextualWorkerHost` and the `BullModule` wiring are removed. BullMQ is no longer used anywhere in the API.

## Consequences

- Replies work at `minScale=0`: the Turn runs inside a request and gets full CPU. Min 1 is optional, only to avoid cold starts.
- Each task calls back the `API_BACKEND_URL` of the environment that created it, so staging can no longer take prod's events.
- No idle Redis polling; Redis commands now scale with messages only.
- Cloud Tasks adds ~50 to 150 ms before the Turn starts. The first 1M operations a month are free.
- A task body is limited to 1 MB, well above any webhook event we parse today.
- The queue must exist in every environment, with retries matching the old BullMQ settings (3 attempts, exponential backoff from 2s):

    ```sh
    gcloud tasks queues create inbound-event --location=asia-southeast1 \
      --max-attempts=3 --min-backoff=2s --max-backoff=60s
    ```

- Local dev uses the Cloud Tasks emulator (`inbound-event` is in its `-initial-queue` list). Without it, `accept` falls back to inline processing.
- Follow-up, out of scope here: the `api` service still has Direct VPC egress to `prod-redis-vpc`, which looks unused since Redis moved to Upstash.
