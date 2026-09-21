---
name: eccho-backend
description: Global rules, module structure, and doc references for the ecbot `apps/api` NestJS backend (NestJS 11 + PostgreSQL + MikroORM + Redis + BullMQ). Use whenever building, editing, or reviewing anything under `apps/api/**` — entities, repositories, services, controllers, DTOs, guards, migrations, background jobs, i18n responses, auth/authorization, file uploads, pagination, or third-party/platform integrations. Use even when the user does not say "backend" — e.g. "add an endpoint", "create a migration", "new module", "protect this route", "return a paginated list", "add a queue processor", "throw a localized error". This skill routes you to the canonical `apps/api/docs/*` guide for each task; read the matching doc before writing code.
---

# ecbot Backend (`apps/api`)

NestJS 11 modular monolith. **Stack**: PostgreSQL + MikroORM, Redis + BullMQ, JWT (ES512) + CASL/RBAC, i18n via `MessageService`. Based on the ACK NestJS boilerplate — comprehensive guides live in `apps/api/docs/`.

**Workflow for any backend task**: (1) find the matching row in [References](#4-references) and read that doc, (2) copy the nearest existing module as a template, (3) follow the [Global rules](#1-global-rules) and [DI & Memory rules](#2-di--memory-rules) below.

## 1. Global rules

Non-negotiable conventions. Violating these is the usual cause of broken PRs.

- **Repository pattern** — all DB access goes through a `*.repository.ts` extending the base repository. Services never touch the `EntityManager` for queries; they call repository methods. Entities extend `DatabaseEntity` (gives `id`, `createdAt`, `updatedAt`, `deletedAt` soft-delete).
- **Controllers split by access level** — one controller class per access level, suffixed `.admin` / `.user` / `.workspace` / `.system` / `.public` / `.shared`. See [Controller access levels](#controller-access-levels).
- **Controllers register in the central router, NOT in feature modules** — add the controller to `src/router/routes/routes.{access}.module.ts`. A feature module's `controllers: []` array stays empty.
- **Protection decorators, top→bottom order** — Doc decorator (always) → `@PolicyAbilityProtected` → `@PolicyRoleProtected` → `@UserProtected` → `@AuthJwtAccessProtected` (always, for protected routes) → HTTP method. See [auth.instructions](../../../.github/instructions/api/auth.instructions.md) and `docs/authorization.md`.
- **Standardized responses** — return via `@Response(...)` / `@ResponsePaging(...)` / `@ResponseFileExcel(...)` with a serialization DTO. Never hand-build response envelopes. See `docs/response.md` + `docs/pagination.md`.
- **List query params go through the pagination decorators, never raw `@Query()`** — bare `@PaginationQuery()` gives paging + ordering + search **only; it carries no filters**. Search needs `@PaginationQuery({ availableSearch: [...] })`; every filter is its own `@PaginationQueryFilter*` decorator returning a `find` fragment to spread. See [List endpoint query params](#list-endpoint-query-params).
- **OpenAPI docs never inline route params** — endpoint docs live in `modules/<feature>/docs/*.doc.ts`; `DocRequest({ params, queries })` must reference exported constants from `constants/<feature>.doc.constant.ts` (e.g. `WorkspaceDocParamsId`), never an inline `params: [{ name: 'id', ... }]` array. Compose nested routes with spread: `[...WorkspaceDocParamsId, ...RoleDocParamsId]`. Param `name` must match the route token. See `docs/api-documentation.md`.
- **All user-facing strings are i18n keys** — never hardcode messages. Use `MessageService.get('module.action.key')`; language files live in `src/languages/{lang}/`. Errors are localized by the `x-custom-lang` header. See `docs/internationalization.md` + `docs/error-handling.md`.
- **Validate every input with a DTO** — `class-validator` DTOs named `[name].[action].dto.ts`. No untyped `@Body()`; on list endpoints, no raw `@Query()` either (rule above).
- **Config via `@nestjs/config`** — never read `process.env` directly in feature code; add typed config. See `docs/config-and-environment.md`.
- **Constants, enums, interfaces and types live in their own files — never inline in a service/controller.** A service file declares the class and nothing else. See [Constants, enums & interfaces](#constants-enums--interfaces).
- **Entities never leak past the service — map to a response DTO.** Services expose `mapList(entities): XListResponseDto[]` / `mapGet(entity): XGetResponseDto` built with `plainToInstance(Dto, value, { excludeExtraneousValues: true })`; controllers call them. Never return an ad-hoc inline shape (`Promise<Array<{ id: string; … }>>`) from a service or controller. Reference: `modules/role/services/role.service.ts`.
- **No `any`.** Type filters as `FilterQuery<TEntity>`, options as `IDatabase*Options`, caught errors as `unknown`. If a call needs `as any` to compile, the query belongs in a typed repository method instead. `any` is for genuinely dynamic payloads only, with a comment saying why.
- **Naming** — files kebab-case; classes PascalCase with suffix (`UserService`, `UserEntity`); enums `ENUM_*`; interfaces `I*`; one class per file; constructor DI only. See [typescript.instructions](../../../.github/instructions/typescript.instructions.md).
- **Commands** — `pnpm --filter api dev`, `pnpm db:migrate:create|up|down`, `pnpm db:seed`, `pnpm generate:client` (regenerate `@repo/client` after changing DTOs/routes), `pnpm --filter api lint`.

## 2. DI & Memory rules

### Never use `Scope.REQUEST`

`Scope.REQUEST` creates a new DI subtree per request — including all transitive dependencies. Under concurrent load this multiplies memory usage by the concurrency level.

**Use `nestjs-cls` instead.** `ClsModule` is registered globally with `saveReq: true`, so every singleton provider can access the current request via `ClsService`:

```ts
// WRONG — new DI subtree per request
import { Inject, Injectable } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Scope } from "@nestjs/common/interfaces";

@Injectable({ scope: Scope.REQUEST })
export class MyPipe implements PipeTransform {
  constructor(@Inject(REQUEST) private readonly req: IRequestApp) {}
}

// RIGHT — singleton; reads per-request data from AsyncLocalStorage
import { Injectable } from "@nestjs/common";
import { CLS_REQ, ClsService } from "nestjs-cls";
import { IRequestApp } from "src/common/request/interfaces/request.interface";

@Injectable()
export class MyPipe implements PipeTransform {
  constructor(private readonly cls: ClsService) {}

  transform(value: any) {
    const req = this.cls.get<IRequestApp>(CLS_REQ);
    // req is the live Express Request for the current async context
  }
}
```

`CLS_REQ` is the symbol exported from `nestjs-cls`. `IRequestApp` extends Express `Request` with our fields (`__pagination`, `user`, `workspace`, etc.).

### Never use `forwardRef`

`forwardRef` keeps both module graphs alive simultaneously, causes non-deterministic initialization, and leaks memory on every restart cycle. If two providers need each other, one side should resolve lazily via `ModuleRef`:

```ts
// WRONG
import { Inject, forwardRef } from '@nestjs/common';

constructor(
    @Inject(forwardRef(() => OtherService))
    private readonly other: OtherService
) {}

// RIGHT — inject ModuleRef, resolve at call time
import { ModuleRef } from '@nestjs/core';

constructor(private readonly moduleRef: ModuleRef) {}

private get otherService(): OtherService {
    return this.moduleRef.get(OtherService, { strict: false });
}
```

Use `{ strict: false }` when the target is registered in a different module (the default `strict: true` only looks in the current module's injector).

### BullMQ concurrency must be env-driven

Never hardcode concurrency values. All processors use an env var with a sensible default:

```ts
@Processor(MY_QUEUE, {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_MY_QUEUE ?? '4'),
})
```

Current env vars and defaults:

| Env var                             | Default | Queue                   |
| ----------------------------------- | ------- | ----------------------- |
| `WORKER_CONCURRENCY_INBOUND`        | 8       | inbound-event           |
| `WORKER_CONCURRENCY_DEBOUNCE`       | 4       | message-debounce        |
| `WORKER_CONCURRENCY_INGEST`         | 3       | knowledge-ingest        |
| `WORKER_CONCURRENCY_TAG_CLASSIFIER` | 2       | customer-tag-classifier |

Lower the defaults in memory-constrained deployments without touching code.

## 3. Structure

### Module layout

```
src/modules/[feature]/
├── controllers/     # one per access level: [feature].[access].controller.ts
├── services/        # business logic — [feature].service.ts
├── repositories/    # data access — [feature].repository.ts
├── entities/        # MikroORM models — [feature].entity.ts
├── dtos/            # request/response — [feature].[action].dto.ts
├── docs/            # OpenAPI decorators — [feature].[access].doc.ts
├── constants/       # doc param/query constants — [feature].doc.constant.ts
├── enums/ interfaces/ guards/ decorators/ processors/
└── [feature].module.ts   # providers/exports; controllers[] stays EMPTY
```

### Constants, enums & interfaces

One concern per file, colocated in the module, imported where used. Inlining them
at the top of a service is the most common review comment on this repo.

| Declaration                      | Lives in                                                       | Example                                             |
| -------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `const` / literal / tuning value | `constants/<feature>.constant.ts`                              | `src/app/constants/app.constant.ts`                 |
| `enum ENUM_*`                    | `constants/<feature>.constant.ts` or `enums/<feature>.enum.ts` | `modules/aws/enums/aws.enum.ts`                     |
| `interface I*` / shared `type`   | `interfaces/<feature>.interface.ts`                            | `modules/aws/interfaces/aws.interface.ts`           |
| Service method signatures        | `interfaces/<feature>.service.interface.ts`                    | `modules/role/interfaces/role.service.interface.ts` |
| OpenAPI param/query constants    | `constants/<feature>.doc.constant.ts`                          | (see the doc-constant rule in §1)                   |

```ts
// WRONG — service file carrying constants and types
const FOLLOWUP_TASK_PREFIX = 'followup-';
const OUTCOME_REASON_MAX_LENGTH = 255;

export interface IFollowupJob { … }

@Injectable()
export class FollowupService { … }

// RIGHT — service file declares the class only
import {
    FOLLOWUP_TASK_PREFIX,
    OUTCOME_REASON_MAX_LENGTH,
} from '../constants/followup.constant';
import { IFollowupJob } from '../interfaces/followup.interface';

@Injectable()
export class FollowupService { … }
```

Same rule for the frontend — see the `eccho-frontend` skill.

### Controller access levels

`src/router/routes/routes.{access}.module.ts` is the single source of truth for what's registered:

| Suffix       | Who                             | Registered in                |
| ------------ | ------------------------------- | ---------------------------- |
| `.admin`     | ADMIN / SUPER_ADMIN             | `routes.admin.module.ts`     |
| `.user`      | any authenticated user          | `routes.user.module.ts`      |
| `.workspace` | workspace-scoped members        | `routes.workspace.module.ts` |
| `.system`    | internal / service-to-service   | `routes.system.module.ts`    |
| `.public`    | unauthenticated                 | `routes.public.module.ts`    |
| `.shared`    | multi-role                      | `routes.shared.module.ts`    |
| `.task`      | Cloud Tasks callback (internal) | `routes.tasks.module.ts`     |

#### Cloud Tasks callback controllers (`.task`)

Endpoints that Google Cloud Tasks calls back into after `CloudTasksQueueClient.enqueue()` schedules a job (see `docs/background-processing.md` — this is the target of the ongoing BullMQ→Cloud Tasks processor migration). One controller per migrated processor: `<feature>.task.controller.ts`, e.g. `EmailTaskController`. Unlike other internal `.system` back-channels (`poc.system.controller.ts`, `followup.system.controller.ts`), `.task` controllers get the **full** documentation/response treatment like a client-facing endpoint — despite being internal, they're a recurring, formal category worth the same rigor:

- `@ApiKeySystemProtected()` (SYSTEM-type key, same as `.system`).
- A real `Doc*` decorator in `modules/<feature>/docs/<feature>.task.doc.ts` — `DocAuth({ xApiKey: true })`, `DocRequest({ dto: ... })`, `DocResponse('<feature>.task.processed')`.
- `@Response(...)` with an i18n message path (add the key to `languages/{en,vi}/<feature>.json` under `task.processed`), never a raw return.
- Registered in `routes.tasks.module.ts` (not `routes.system.module.ts`) — a dedicated module shared by every `.task` controller as more processors migrate (`sms`, `followup`, `knowledge-ingest`, `customer-tag-classifier`, `session`).
- `routes.tasks.module.ts` is mounted under the same `/system` prefix as `routes.system.module.ts` in `router.module.ts` (two modules, one prefix) — so the deployed Cloud Tasks callback URL (`/api/v1/system/tasks/:queue`, hardcoded in `CloudTasksQueueClient.enqueue()`) never changes as controllers move between the two modules.

Reference implementation: `EmailTaskController` (`modules/email/controllers/email.task.controller.ts` + `modules/email/docs/email.task.doc.ts`).

**⚠️ Unit tests that call `controller.handle(dto)` directly bypass the global `ValidationPipe` entirely** — a request DTO can look correct (compiles, has `@ApiProperty`) yet 422 on every real call (`forbidUnknownValues: true` rejects a `@ValidateNested()` field with no matching `@Type()` target, or a nested DTO class with zero `class-validator` decorators). This is exactly what happened to `EmailTaskDto` — every task controller migration must be curl-tested against the deployed endpoint (real `x-api-key`, real body shape) at least once, not just unit-tested, before trusting it in production.

### List endpoint query params

Every query param on a list endpoint maps to a decorator that returns a spreadable
`find` fragment. Reaching for `@Query()` skips the search whitelist, the enum/number
coercion, and `DocRequest` — and forces an inline `@ApiQuery` that bypasses the
doc-constant rule above.

| Param shape                                    | Decorator                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `page`, `perPage`, `orderBy`, `orderDirection` | `@PaginationQuery()`                                                         |
| `search` (free text)                           | `@PaginationQuery({ availableSearch: [...] })` → `_search`                   |
| exact match (id, fk, flag)                     | `@PaginationQueryFilterEqual('field')`                                       |
| not equal                                      | `@PaginationQueryFilterNotEqual('field')`                                    |
| substring on one column                        | `@PaginationQueryFilterStringContain('field')`                               |
| comma-list of enum values                      | `@PaginationQueryFilterInEnum('field', undefined, ENUM_X)`                   |
| comma-list of booleans                         | `@PaginationQueryFilterInBoolean('field', [true])`                           |
| date range / date operators                    | `@PaginationQueryFilterDateBetween(...)` · `@PaginationQueryFilterDate(...)` |

```ts
// WRONG — paging via the decorator, everything else hand-rolled
@ApiQuery({ name: 'chatbot', required: false, type: String })
@ApiQuery({ name: 'search', required: false, type: String })
async list(
    @PaginationQuery() { _limit, _offset }: PaginationListDto,
    @Query('chatbot') chatbotId?: string,
    @Query('search') search?: string
) {}

// RIGHT — queries declared in the doc file, filters spread into `find`
async list(
    @PaginationQuery({ availableSearch: ['title', 'note'] })
    { _search, _limit, _offset, _order }: PaginationListDto,
    @PaginationQueryFilterEqual('chatbot') chatbot: Record<string, any>
): Promise<IResponsePaging<XListResponseDto>> {
    const find: Record<string, any> = { ..._search, ...chatbot };
    // service takes `find` + { paging: { limit: _limit, offset: _offset }, order: _order }
}
```

The paired doc decorator declares the params via constants, never inline `@ApiQuery`:
`DocRequest({ queries: [...XDocQueryStatus] })` with the constants exported from
`constants/<feature>.doc.constant.ts`.

**Service signature follows from this**: repositories/services take a `find:
Record<string, any>` plus `IDatabaseFindAllOptions`, not one named argument per
filter — otherwise the decorators have nowhere to land and the next filter forces
another signature change.

### Key locations

- Feature modules → `src/modules/`
- Cross-cutting concerns (message, response, database, auth guards, integrations) → `src/common/`
- Route registration → `src/router/routes/`
- Migrations → `src/database/migrations/` (generated, never hand-edited except review)
- i18n strings → `src/languages/{lang}/`

## 4. References

Read the matching `apps/api/docs/` guide **before** writing code for that area. Paths are relative to repo root: `apps/api/docs/`.

| Task / area                                                                                         | Doc                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Big-picture project layout & module philosophy                                                      | [structure.md](../../../apps/api/docs/structure.md)                                                                                                                       |
| Local / Docker setup                                                                                | [installation.md](../../../apps/api/docs/installation.md)                                                                                                                 |
| Login, JWT, API keys, social auth, sessions                                                         | [authentication.md](../../../apps/api/docs/authentication.md)                                                                                                             |
| Roles (RBAC), CASL policies, route protection                                                       | [authorization.md](../../../apps/api/docs/authorization.md)                                                                                                               |
| Repository pattern, entities, EntityManager                                                         | [database.md](../../../apps/api/docs/database.md)                                                                                                                         |
| MikroORM migration context (from Mongoose)                                                          | [migration-mikro-orm.md](../../../apps/api/docs/migration-mikro-orm.md)                                                                                                   |
| Creating / running migrations & seeders                                                             | [migration.md](../../../apps/api/docs/migration.md)                                                                                                                       |
| Typed config & environment variables                                                                | [config-and-environment.md](../../../apps/api/docs/config-and-environment.md)                                                                                             |
| Exceptions, filters, standardized error shape                                                       | [error-handling.md](../../../apps/api/docs/error-handling.md)                                                                                                             |
| Validating request **bodies** with DTOs (list query params → pagination.md)                         | [request-validation.md](../../../apps/api/docs/request-validation.md)                                                                                                     |
| `@Response` envelope & serialization DTOs                                                           | [response.md](../../../apps/api/docs/response.md)                                                                                                                         |
| OpenAPI/Swagger `Doc*` decorators, doc param constants                                              | [api-documentation.md](../../../apps/api/docs/api-documentation.md)                                                                                                       |
| List endpoints — paging, sort, search, **and every filter query param**                             | [pagination.md](../../../apps/api/docs/pagination.md)                                                                                                                     |
| Upload / download / S3, Excel export                                                                | [file.md](../../../apps/api/docs/file.md)                                                                                                                                 |
| Request middleware pipeline                                                                         | [middleware.md](../../../apps/api/docs/middleware.md)                                                                                                                     |
| i18n / `MessageService` / language files                                                            | [internationalization.md](../../../apps/api/docs/internationalization.md)                                                                                                 |
| Pino logging                                                                                        | [logger.md](../../../apps/api/docs/logger.md)                                                                                                                             |
| App settings module                                                                                 | [setting.md](../../../apps/api/docs/setting.md)                                                                                                                           |
| BullMQ queues & job processors                                                                      | [background-processing.md](../../../apps/api/docs/background-processing.md)                                                                                               |
| Activity / audit logging, password history                                                          | [audit.md](../../../apps/api/docs/audit.md)                                                                                                                               |
| Third-party service integrations                                                                    | [third-party-integration.md](../../../apps/api/docs/third-party-integration.md)                                                                                           |
| Workspace domain (resource grouping/scoping)                                                        | [workspace.md](../../../apps/api/docs/workspace.md)                                                                                                                       |
| Chat platform adapters (Messenger/Zalo/TikTok/…)                                                    | [platforms.md](../../../apps/api/docs/platforms.md) — also see the `eccho-platform-adapters` skill                                                                        |
| Agent archetypes (per-chatbot behavioral toggles), `AgentTemplateEntity`, modular `AGENT.md` prompt | archetypes = per-chatbot behavioural toggles; templates drive the wizard's dynamic fields; the reply stream is the Vercel AI SDK UI message-stream protocol |
| Unit testing (Jest)                                                                                 | [test.md](../../../apps/api/docs/test.md)                                                                                                                                 |

Index of all docs: [apps/api/docs/readme.md](../../../apps/api/docs/readme.md).
