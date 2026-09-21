# Overview

This document covers how endpoints are documented for OpenAPI/Swagger in `apps/api`, using the custom `Doc*` decorators in `src/common/doc/`. Swagger UI is served at `/docs` (development). Every controller method must carry a documentation decorator (it is the top decorator in the [protection stack](./authorization.md)).

# Table of Contents

- [The `*.doc.ts` pattern](#the-docts-pattern)
- [Decorator reference](#decorator-reference)
- [Route params & queries — use shared constants](#route-params--queries--use-shared-constants)
- [Full example](#full-example)

## The `*.doc.ts` pattern

Documentation lives **outside** the controller, in `modules/<feature>/docs/<feature>.<access>.doc.ts`. Each endpoint gets one exported function returning `applyDecorators(...)`, named `<Feature><Access><Action>Doc`. The controller applies it as a single decorator:

```ts
// controller
@WorkSpaceOwnerUpdateDoc()          // ← the doc decorator, always on top
@AuthJwtAccessProtected()
@Put('/:workspace')
async update() { /* ... */ }
```

```ts
// modules/workspace/docs/workspace.owner.doc.ts
export function WorkSpaceOwnerUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Update a workspace for the owner' }),
        DocAuth({ jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: WorkSpaceUpdateRequestDto,
            params: WorkspaceDocParamsId, // ← shared constant, never inline
        }),
        DocResponse('workspace.update')
    );
}
```

## Decorator reference

Imported from `@app/common/doc/decorators/doc.decorator.ts`.

| Decorator           | Purpose                               | Key options                                                           |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `Doc`               | operation summary/description         | `summary`, `description`, `operation`, `deprecated`                   |
| `DocAuth`           | declares auth schemes on the endpoint | `jwtAccessToken`, `jwtRefreshToken`, `xApiKey`, `google`, `apple`     |
| `DocGuard`          | shows which guards apply              | `role`, `policy`                                                      |
| `DocRequest`        | request shape                         | `params`, `queries`, `bodyType` (`ENUM_DOC_REQUEST_BODY_TYPE`), `dto` |
| `DocRequestFile`    | multipart/file upload request         | `params`, `queries`                                                   |
| `DocResponse`       | single response                       | `messagePath` (1st arg), `dto`, `httpStatus`, `statusCode`            |
| `DocResponsePaging` | paginated response                    | `messagePath`, `dto`                                                  |
| `DocResponseFile`   | file download response                | `fileType` (`ENUM_FILE_MIME`)                                         |
| `DocErrorGroup`     | groups multiple error docs            | array of decorators                                                   |

`DocAuth`/`DocGuard` are documentation only — they must mirror the real protection decorators on the controller method, they do not enforce anything.

## Route params & queries — use shared constants

**Rule: never write `params` or `queries` inline in a `DocRequest`. Always reference an exported constant.** Inline literals (or forgetting params entirely on an `:id`/`:workspace` route) are the most common documentation defect — the param then goes undocumented or drifts from the route.

1. Param/query definitions live in `modules/<feature>/constants/<feature>.doc.constant.ts` as exported arrays. Create the file if the module lacks one.
    - Path params → `<Feature>DocParamsId` (type `ApiParamOptions[]`).
    - Query params → `<Feature>DocQuery<Name>` (type `ApiQueryOptions[]`).
2. The param **`name` must exactly match the route token**. Workspace-scoped routes use `:workspace` → `name: 'workspace'`; a resource's own id uses that module's constant (Role → `name: 'role'`).
3. **Compose with spread** for nested/detail routes, workspace param first: `params: [...WorkspaceDocParamsId, ...RoleDocParamsId]`.
4. `queries` follow the same rule: `queries: [...RoleDocQueryIsActive, ...RoleDocQueryType]`.

```ts
// modules/workspace/constants/workspace.doc.constant.ts
export const WorkspaceDocParamsId = [
    {
        name: 'workspace',
        description: 'The ID or slug of the workspace',
        required: true,
        type: 'string',
    },
];

// modules/role/constants/role.doc.constant.ts
export const RoleDocParamsId = [
    {
        name: 'role',
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];
export const RoleDocQueryIsActive = [
    {
        name: 'isActive',
        required: false,
        type: 'string',
        example: 'true,false',
        description: "boolean, ',' delimiter",
    },
];
```

```ts
// single workspace param
DocRequest({
    dto: WorkSpaceUpdateRequestDto,
    bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
    params: WorkspaceDocParamsId,
});

// workspace + role, composed
DocRequest({
    dto: RoleUpdateWorkspaceRequestDto,
    bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
    params: [...WorkspaceDocParamsId, ...RoleDocParamsId],
});
```

**Checklist before finishing a `.doc.ts`:** every route token declared as a param? sourced from a `*.doc.constant.ts` (not inline)? `name` matches the route token exactly? workspace-scoped route includes `WorkspaceDocParamsId`? list endpoints declare their filter `queries` from constants?

## Full example

```ts
// modules/workspace/docs/workspace.owner.doc.ts
export function WorkSpaceOwnerGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Get workspace details by id or slug' }),
        DocAuth({ jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocResponse('workspace.details', { dto: WorkSpaceGetResponseDto }),
        DocRequest({ params: WorkspaceDocParamsId })
    );
}
```
