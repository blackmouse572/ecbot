---
applyTo: "apps/api/**/*.ts"
description: "Background job processing with Google Cloud Tasks"
---

# Background Jobs Instructions

Background jobs run on **Google Cloud Tasks**. The API has no BullMQ and no in-process queue worker: each task POSTs back to `/api/v1/system/tasks/<queue>`, so the job runs inside an HTTP request.

- Enqueue with `CloudTasksQueueClient.enqueue(queue, jobName, payload, { taskName?, scheduleTime? })` from `src/worker/cloud-tasks-queue.client.ts` (import `CloudTasksQueueModule`).
- Handle with a `<feature>.task.controller.ts` registered in `src/router/routes/routes.tasks.module.ts`. Follow `.agents/skills/eccho-backend/references/task-controllers.md`.
- Handlers must be idempotent: a thrown handler returns 5xx and Cloud Tasks retries.
- Use a deterministic `taskName` for dedupe (`[A-Za-z0-9_-]` only, hash external ids).
- Add each new queue to the emulator `-initial-queue` list in `docker-compose.yml` and create it in every GCP environment.
- Recurring work uses `@ContextualCron`.

Full guide: `apps/api/docs/background-processing.md`. Inbound webhooks: ADR-0008 (`apps/api/docs/adr/0008-inbound-inbox-on-cloud-tasks.md`).
