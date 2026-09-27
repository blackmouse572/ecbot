---
name: eccho-backend
description: Rules, module layout, and doc routing for the ecbot `apps/api` NestJS backend. Use for any work under `apps/api/**`: endpoints, entities, repositories, migrations, DTOs, route protection, list/pagination endpoints, queues and background jobs, localized errors, integrations.
---

# ecbot Backend (`apps/api`)

NestJS 11 modular monolith on the ACK NestJS boilerplate: PostgreSQL + MikroORM, Redis + BullMQ, JWT (ES512) + CASL/RBAC, i18n via `MessageService`. Guides live in `apps/api/docs/` (index: `readme.md`).

**Workflow**: (1) read the matching doc from [References](#references), (2) copy the nearest existing module as a template, (3) apply every rule below whose condition matches your change. Done means each matching rule holds in the diff.

## Module layout

```
src/modules/[feature]/
├── controllers/     [feature].[access].controller.ts, one per access level
├── services/        [feature].service.ts, declares the class only
├── repositories/    [feature].repository.ts
├── entities/        [feature].entity.ts
├── dtos/            [feature].[action].dto.ts
├── docs/            [feature].[access].doc.ts
├── constants/       [feature].constant.ts, [feature].doc.constant.ts
├── enums/ interfaces/ guards/ decorators/ processors/
└── [feature].module.ts   providers/exports only; controllers[] stays empty
```

Cross-cutting code (message, response, database, auth guards, integrations) lives in `src/common/`; routes in `src/router/routes/`; migrations in `src/database/migrations/` (generated); i18n strings in `src/languages/{lang}/`.

<important if="you are reading or writing the database">

- All DB access goes through a `*.repository.ts` extending the base repository. Services call repository methods, never the `EntityManager`.
- Entities extend `DatabaseEntity` (`id`, `createdAt`, `updatedAt`, soft-delete `deletedAt`).
- Type filters as `FilterQuery<TEntity>` and options as `IDatabase*Options`. A query that needs `as any` belongs in a typed repository method.
- Create migrations with `pnpm db:migrate:create`; edit the generated file only to review it.
</important>

<important if="you are adding a controller or registering a route">

One controller class per access level. Register it in `src/router/routes/routes.{access}.module.ts` (the single source of truth for what is mounted), never in the feature module.

| Suffix       | Who                                             | Registered in                                                                                  |
| ------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.admin`     | ADMIN / SUPER_ADMIN                             | `routes.admin.module.ts`                                                                       |
| `.user`      | any authenticated user                          | `routes.user.module.ts`                                                                        |
| `.workspace` | workspace-scoped members                        | `routes.workspace.module.ts`                                                                   |
| `.shared`    | multi-role                                      | `routes.shared.module.ts`                                                                      |
| `.public`    | unauthenticated                                 | `routes.public.module.ts`                                                                      |
| `.client`    | third-party server holding a `ClientCredential` | `routes.client.module.ts`                                                                      |
| `.system`    | internal / service-to-service                   | `routes.system.module.ts`                                                                      |
| `.task`      | Cloud Tasks callback                            | `routes.tasks.module.ts`, see [references/task-controllers.md](references/task-controllers.md) |

</important>

<important if="you are protecting a route or adding authorization">
Decorators, top to bottom: doc decorator → `@PolicyAbilityProtected` → `@PolicyRoleProtected` → `@UserProtected` → `@AuthJwtAccessProtected` → HTTP method. Read `docs/authorization.md` and `.github/instructions/api/auth.instructions.md`.
</important>

<important if="you are returning data from a controller or service">

- Return through `@Response(...)` / `@ResponsePaging(...)` / `@ResponseFileExcel(...)` with a serialization DTO; the interceptor builds the envelope.
- Entities stay inside the service. Services expose `mapList(entities)` / `mapGet(entity)` built with `plainToInstance(Dto, value, { excludeExtraneousValues: true })`, and return typed response DTOs, not inline object shapes. Pattern: `modules/role/services/role.service.ts`.
</important>

<important if="you are adding query params to a list endpoint">

Every list param maps to a pagination decorator that returns a spreadable `find` fragment; plain `@Query()` skips the search whitelist, type coercion, and docs.

| Param shape                                    | Decorator                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `page`, `perPage`, `orderBy`, `orderDirection` | `@PaginationQuery()` (paging + ordering only, no filters)                    |
| free-text `search`                             | `@PaginationQuery({ availableSearch: [...] })` → `_search`                   |
| exact match (id, fk, flag)                     | `@PaginationQueryFilterEqual('field')`                                       |
| not equal                                      | `@PaginationQueryFilterNotEqual('field')`                                    |
| substring on one column                        | `@PaginationQueryFilterStringContain('field')`                               |
| comma-list of enum values                      | `@PaginationQueryFilterInEnum('field', undefined, ENUM_X)`                   |
| comma-list of booleans                         | `@PaginationQueryFilterInBoolean('field', [true])`                           |
| dates                                          | `@PaginationQueryFilterDateBetween(...)` / `@PaginationQueryFilterDate(...)` |

Spread the fragments into one `find: Record<string, any>` and pass it with `IDatabaseFindAllOptions` to the service and repository, so the next filter needs no signature change. Pattern: `modules/conversation/controllers/conversation.workspace.controller.ts`. Full guide: `docs/pagination.md`.
</important>

<important if="you are writing OpenAPI docs for an endpoint">
Endpoint docs live in `modules/<feature>/docs/*.doc.ts`. `DocRequest({ params, queries })` references constants exported from `constants/<feature>.doc.constant.ts` (e.g. `WorkspaceDocParamsId`), composed by spread for nested routes: `[...WorkspaceDocParamsId, ...RoleDocParamsId]`. Each param `name` matches its route token. See `docs/api-documentation.md`.
</important>

<important if="you are accepting a request body or params">
Validate with a `class-validator` DTO named `[name].[action].dto.ts`; every `@Body()` is typed by one. See `docs/request-validation.md`.
</important>

<important if="you are adding a user-facing message or throwing an error">
Messages are i18n keys: `MessageService.get('module.action.key')`, strings in `src/languages/{en,vi}/`. Errors localize by the `x-custom-lang` header. See `docs/internationalization.md` and `docs/error-handling.md`.
</important>

<important if="you are reading configuration or environment variables">
Add typed config through `@nestjs/config` and inject it; feature code reads config, not `process.env`. See `docs/config-and-environment.md`.
</important>

<important if="you are declaring a constant, enum, interface, or type">

One concern per file, colocated in the module. A service or controller file declares its class only.

| Declaration                    | Lives in                                                       | Example                                             |
| ------------------------------ | -------------------------------------------------------------- | --------------------------------------------------- |
| `const` / tuning value         | `constants/<feature>.constant.ts`                              | `src/app/constants/app.constant.ts`                 |
| `enum ENUM_*`                  | `constants/<feature>.constant.ts` or `enums/<feature>.enum.ts` | `modules/aws/enums/aws.enum.ts`                     |
| `interface I*` / shared `type` | `interfaces/<feature>.interface.ts`                            | `modules/aws/interfaces/aws.interface.ts`           |
| Service method signatures      | `interfaces/<feature>.service.interface.ts`                    | `modules/role/interfaces/role.service.interface.ts` |
| OpenAPI param/query constants  | `constants/<feature>.doc.constant.ts`                          |                                                     |

Naming: classes PascalCase with a suffix (`UserService`, `UserEntity`), enums `ENUM_*`, interfaces `I*`. Reserve `any` for genuinely dynamic payloads, with a comment saying why; caught errors are `unknown`.
</important>

<important if="you are creating a provider, pipe, guard, or wiring module dependencies">

- Providers are singletons. For per-request data, inject `ClsService` and read `this.cls.get<IRequestApp>(CLS_REQ)` (`ClsModule` is global with `saveReq: true`). `Scope.REQUEST` rebuilds the whole DI subtree per request and multiplies memory under load. Pattern: `modules/user/pipes/user.not-self.pipe.ts`.
- For a circular dependency, resolve one side lazily with `this.moduleRef.get(X, { strict: false })` in a getter (`strict: false` searches other modules). `forwardRef` leaks memory and makes init order non-deterministic. Pattern: `modules/conversation/services/conversation.service.ts`.
</important>

<important if="you are adding or changing a BullMQ processor">
Read worker concurrency from an env var with a default: `concurrency: parseInt(process.env.WORKER_CONCURRENCY_<QUEUE> ?? '<n>')`, and declare the var in `src/app/dtos/app.env.dto.ts`. Pattern: `modules/platform/processors/inbound-event.processor.ts`. See `docs/background-processing.md`.
</important>

## References

Read the matching guide in `apps/api/docs/` before writing code for that area.

| Task / area                                            | Doc                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| Project layout, module philosophy                      | `structure.md`                                              |
| Local / Docker setup                                   | `installation.md`                                           |
| Login, JWT, API keys, social auth, sessions            | `authentication.md`                                         |
| Roles (RBAC), CASL policies, route protection          | `authorization.md`                                          |
| Repositories, entities, EntityManager                  | `database.md`                                               |
| Creating / running migrations                          | `migration.md` (Mongoose history: `migration-mikro-orm.md`) |
| Seeders                                                | `seeding.md`                                                |
| Typed config & env vars                                | `config-and-environment.md`                                 |
| Exceptions and error shape                             | `error-handling.md`                                         |
| Request body DTO validation                            | `request-validation.md`                                     |
| `@Response` envelope & serialization DTOs              | `response.md`                                               |
| OpenAPI `Doc*` decorators                              | `api-documentation.md`                                      |
| List endpoints: paging, sort, search, filters          | `pagination.md`                                             |
| Upload / download / S3, Excel export                   | `file.md`                                                   |
| Middleware pipeline                                    | `middleware.md`                                             |
| i18n / `MessageService`                                | `internationalization.md`                                   |
| Pino logging                                           | `logger.md`                                                 |
| App settings module                                    | `setting.md`                                                |
| Queues, processors, Cloud Tasks                        | `background-processing.md`                                  |
| Activity / audit logging, password history             | `audit.md`                                                  |
| Third-party integrations                               | `third-party-integration.md`                                |
| Workspace scoping                                      | `workspace.md`                                              |
| Chat channels (Messenger, Zalo, TikTok, ...)           | `platforms.md` + the `eccho-platform-adapters` skill        |
| Agent archetypes, templates, modular `AGENT.md` prompt | `apps/ai/README.md` § "Agent archetypes & modular prompt"   |
| Unit testing (Jest)                                    | `test.md`                                                   |
