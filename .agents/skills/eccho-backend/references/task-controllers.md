# Cloud Tasks callback controllers (`.task`)

Endpoints that Google Cloud Tasks calls back after `CloudTasksQueueClient.enqueue()` schedules a job. They are the target of the ongoing BullMQ to Cloud Tasks processor migration (see `apps/api/docs/background-processing.md`). One controller per migrated processor: `<feature>.task.controller.ts`.

Reference implementation: `modules/email/controllers/email.task.controller.ts` + `modules/email/docs/email.task.doc.ts`.

Although internal, a `.task` controller gets the full client-facing treatment (unlike `.system` back-channels such as `followup.system.controller.ts`):

- `@ApiKeySystemProtected()` (SYSTEM-type key, same as `.system`).
- A real doc decorator in `modules/<feature>/docs/<feature>.task.doc.ts`: `DocAuth({ xApiKey: true })`, `DocRequest({ dto })`, `DocResponse('<feature>.task.processed')`.
- `@Response(...)` with an i18n key under `task.processed` in `languages/{en,vi}/<feature>.json`.
- Registered in `routes.tasks.module.ts`, not `routes.system.module.ts`. Both modules mount under the same `/system` prefix in `router.module.ts`, so the callback URL hardcoded in `CloudTasksQueueClient.enqueue()` (`/api/v1/system/tasks/:queue`) stays stable.

## Completion criterion: curl the deployed endpoint

Unit tests that call `controller.handle(dto)` bypass the global `ValidationPipe`. A request DTO can compile and still 422 on every real call: `forbidUnknownValues: true` rejects a `@ValidateNested()` field without a matching `@Type()`, or a nested DTO class with no `class-validator` decorators. This shipped once in `EmailTaskDto`.

A task controller migration is done only after one curl against the deployed endpoint (real `x-api-key`, real body shape) returns 2xx.
