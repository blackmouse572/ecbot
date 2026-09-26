---
name: eccho-frontend
description: Rules, folder layout, and reference routing for the ecbot `apps/app` React SPA. Use for any work under `apps/app/**`: pages and routes, data fetching and mutations, forms, create/edit modals, list tables, UI components and styling, permission gating, translations.
---

# ecbot Frontend (`apps/app`)

React 19 + Vite SPA: Tailwind 4, TanStack Query v5 (server state), React Router v7 data router, Jotai (client state), CASL (authz), React Hook Form + Zod (`zod/v4`), `react-i18next`, `@repo/ui` on `@medusajs/ui`. API access through the generated `@repo/client`.

**Workflow**: (1) read the matching doc from [References](#references), (2) copy the nearest existing route feature as a template, (3) apply every rule below whose condition matches your change. Done means each matching rule holds in the diff.

## Route feature folder

```
src/routes/chatbot/
├── chatbot-list/        list page (+ loader.ts); index.ts exports { Component, loader }
├── chatbot-create/      create page (RouteFocusModal)
├── chatbot-details/     detail page (+ loader.ts, breadcrumb.tsx)
├── chatbot-edit/        edit page (RouteDrawer)
├── components/          shared feature components
├── constants.ts
└── schemas.ts           Zod schemas + inferred form types
```

Router tree: `src/routes/route.tsx`. API hooks: `src/hooks/api/<resource>.ts`. Query-key factory: `src/libs/query-factory.ts`. Route modals: `src/components/modals`. Translations: `src/i18n/translations/{region}.json`.

<important if="you are fetching data, adding an API hook, or writing a mutation">

- Server state lives in TanStack Query; client-only state in Jotai. Fetched data never goes into `useState` or an atom.
- API calls go through hooks in `src/hooks/api/<resource>.ts` wrapping `@repo/client`. When an endpoint is missing from the client, run `pnpm generate:client`.
- Keys come from `queryKeysFactory`; mutations invalidate the affected list/detail keys `onSuccess`.
- API types come from `@repo/client`; re-export them from the resource hook (`export type { XResponseDto }`).
- Handle `isLoading` / `isError` on every query.
- Read [references/tanstack-query.md](references/tanstack-query.md).
</important>

<important if="you are adding a page, route, loader, or breadcrumb">

- Each page folder has an `index.ts` barrel exporting `Component` (+ `loader` / `Breadcrumb`). Register it in `route.tsx` with `lazy: () => import("./<feature>/<page>")`. Loaders prime the shared `queryClient`.
- Paths come from the `ROUTES` constant in `src/routes/constants.ts`.
- Every page renders inside `SingleColumnPage` or `TwoColumnPage` from `@repo/ui/layout`, which render `<Outlet/>` for child modal routes.
- Read [references/react-router.md](references/react-router.md).
</important>

<important if="you are building a create or edit flow">
Create = `RouteFocusModal`, edit = `RouteDrawer` (from `@/components/modals`). After a successful mutation call `useRouteModal().handleSuccess()` and show a toast. Read [references/react-router.md](references/react-router.md).
</important>

<important if="you are building a list or table screen">
Use `useDataTable` + `_DataTable` with `use-*-table-columns` / `-filters` / `-query` hooks. Read [references/table-list.md](references/table-list.md).
</important>

<important if="you are building a form">
Zod schema in `routes/<feature>/schemas.ts` + `zodResolver` + the `@repo/ui` `Form` compound components. Read `.github/instructions/app/forms.instructions.md`.
</important>

<important if="you are composing or styling UI components">

- Reach for `@repo/ui` first, then `@medusajs/ui`. Style with `ui-` design tokens (`bg-ui-bg-base`, `text-ui-fg-subtle`, ...) and `cn` from `@repo/ui/utils`.
- Items sit inside their Group (`SelectItem` in `SelectGroup`, ...); custom triggers use `asChild` (Radix) or `render` (Base UI); every modal has a `Title` (`sr-only` is fine); `Button` shows pending state by composing `Spinner` + `disabled`.
- Read [references/ui.md](references/ui.md) and [rules/composition.md](rules/composition.md).
</important>

<important if="you are adding user-facing text">
Render every string with `t()` from `react-i18next`, keys in `src/i18n/translations/{region}.json`. Follow `.claude/rules/i18n.md`.
</important>

<important if="you are gating UI by permission">
Use CASL `<Can I=… a=…>` for rendering and `ability.can(...)` for logic. Read `.github/instructions/app/state-and-authorization.instructions.md`.
</important>

<important if="you are declaring a constant or type">

One concern per file, colocated in the feature folder. A component or hook file declares the component or hook only.

| Declaration                                 | Lives in                         |
| ------------------------------------------- | -------------------------------- |
| Feature constants (page size, option lists) | `routes/<feature>/constants.ts`  |
| Route path tokens                           | `routes/constants.ts` (`ROUTES`) |
| Zod schemas + `z.infer` form types          | `routes/<feature>/schemas.ts`    |
| Feature types                               | `routes/<feature>/types.ts`      |
| Types shared across features                | `src/types/<domain>.ts`          |
| API request/response types                  | `@repo/client` (generated)       |

Components are typed `FC<Props>`. Reserve `any` for genuinely dynamic payloads, with a comment saying why.
</important>

<important if="you are adding animation, UI polish, or a new frontend library">

- Motion values (easing, durations, springs) come from the `emil-design-eng` skill and its [`eccho.md`](../emil-design-eng/eccho.md), the single source of truth. For general UI craft, use `make-interfaces-feel-better`.
- Stack choices: motion = `motion/react`; toasts = `@medusajs/ui`; state = Jotai / TanStack Query; theme = ecbot `ThemeProvider`; easing tokens from `src/index.css` `@theme` (`--ease-out`, `--ease-in-out`, `--ease-drawer`). Honor `prefers-reduced-motion`.
- Choosing a library for a task: `pick-ui-library`.
</important>

## References

Read the matching reference before writing code. `.github/instructions/app/*` files are the source of record.

| Task / area                                                         | Reference                                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Queries, keys, mutations, invalidation, loaders                     | [references/tanstack-query.md](references/tanstack-query.md) · `data-fetching.instructions.md`  |
| Router tree, lazy modules, loaders, breadcrumbs, create/edit modals | [references/react-router.md](references/react-router.md) · `routing-and-modals.instructions.md` |
| List/table screens                                                  | [references/table-list.md](references/table-list.md)                                            |
| `@repo/ui` + `@medusajs/ui`, design tokens                          | [references/ui.md](references/ui.md)                                                            |
| Component composition                                               | [rules/composition.md](rules/composition.md)                                                    |
| Forms                                                               | `forms.instructions.md`                                                                         |
| Jotai & CASL                                                        | `state-and-authorization.instructions.md`                                                       |
| Component conventions                                               | `react.instructions.md`                                                                         |
| Chatbot wizard, template-driven fields, archetype toggles           | `apps/ai/README.md` § "Agent archetypes & modular prompt"                                       |

Backend this app calls: the `eccho-backend` skill.
