# Overview

Background work in `apps/api` runs on **Google Cloud Tasks**. There is no in-process queue worker: a job is a Cloud Task that POSTs back to the API, so it runs inside an HTTP request and gets full CPU even on a scale-to-zero Cloud Run instance.

- **Client**: `src/worker/cloud-tasks-queue.client.ts` (`CloudTasksQueueClient`, exported by `CloudTasksQueueModule`)
- **Consumers**: one `<feature>.task.controller.ts` per queue, registered in `src/router/routes/routes.tasks.module.ts`
- **Recurring work**: `@ContextualCron` schedulers (see `src/common/database/decorators/contextual-cron.decorator.ts`)

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
- [Enqueueing a job](#enqueueing-a-job)
- [Handling a job](#handling-a-job)
- [Queues](#queues)
- [Local development](#local-development)
- [Redis](#redis)

## Enqueueing a job

```ts
await this.cloudTasksClient.enqueue(
    FOLLOWUP_QUEUE, // queue name, also the callback route
    ENUM_FOLLOWUP_PROCESS.FIRE, // jobName, sent in the body
    payload, // spread into the body next to jobName
    { taskName, scheduleTime } // both optional
);
```

- The task POSTs `{ jobName, ...payload }` to `${API_BACKEND_URL}/api/v1/system/tasks/<queue>` with the `CLOUD_TASKS_SYSTEM_API_KEY` as `x-api-key`. Each environment's tasks call that environment's own API.
- `taskName` dedupes: Cloud Tasks rejects a name that was used in roughly the last hour, and the client treats `ALREADY_EXISTS` as success. Names allow only `[A-Za-z0-9_-]`, so hash external ids (see `InboundInboxService.taskName`).
- `enqueue` retries `createTask` 3 times with a short backoff, then throws. Decide per caller whether a failure should fail the request or fall back.

## Handling a job

Follow `.agents/skills/eccho-backend/references/task-controllers.md`. In short: `@ApiKeyCloudTasksProtected()` (only the `CLOUD_TASKS_SYSTEM_API_KEY` key passes), a doc decorator, `@Response('<feature>.task.processed')`, `@RequestTimeout(...)` for long work, and `@Post('/<queue>')` on a controller with `path: '/tasks'`.

A thrown handler returns 5xx and Cloud Tasks retries the task with the queue's retry config, so handlers must be idempotent. The HTTP request context gives the handler its own MikroORM `EntityManager` fork.

## Queues

| Queue                     | Consumer                              | Notes                                            |
| ------------------------- | ------------------------------------- | ------------------------------------------------ |
| `email`                   | `EmailTaskController`                 |                                                  |
| `sms`                     | `SmsTaskController`                   |                                                  |
| `followup`                | `FollowupTaskController`              | delayed with `scheduleTime`                      |
| `knowledge-ingest`        | `KnowledgeIngestTaskController`       |                                                  |
| `customer-tag-classifier` | `CustomerTagClassifierTaskController` |                                                  |
| `inbound-event`           | `InboundEventTaskController`          | Inbound Inbox, runs the Turn pipeline (ADR-0008) |

A new queue must also be created in each GCP environment and added to the emulator's `-initial-queue` list in `docker-compose.yml`. Always set the retry and dispatch limits: the Cloud Tasks defaults (100 attempts, up to 1h backoff, 1000 concurrent dispatches) retry a poison job for days and let a burst flood Postgres. For example, the inbound queue (ADR-0008):

```sh
gcloud tasks queues create inbound-event --location=asia-southeast1 \
  --max-attempts=3 --min-backoff=2s --max-backoff=60s \
  --max-concurrent-dispatches=20 --max-dispatches-per-second=20
```

The task callback runs inside the API's 100KB JSON body limit, so keep payloads well under that.

## Local development

Set `CLOUD_TASKS_EMULATOR_HOST=localhost:8123` and run the `cloud-tasks-emulator` service from `docker-compose.yml`. See the comments next to `CLOUD_TASKS_*` in `.env.example` for the `API_BACKEND_URL` the emulator needs.

## Redis

Redis is not a queue backend. `RedisConnectionProvider` (`src/common/redis/`) holds one plain ioredis client for short-lived keys: the inbound dedupe claim, the channel rate limit and the generation lease. Each falls back to in-memory state when Redis was unreachable at boot (`REDIS_AVAILABLE`).
