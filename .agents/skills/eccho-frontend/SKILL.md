---
name: eccho-frontend
description: Global rules, folder structure, and pattern references for the ecbot `apps/app` React frontend (React 19 + Vite + Tailwind 4 + TanStack Query v5 + React Router v7 + Jotai + CASL + @repo/ui). Use whenever building, editing, or reviewing anything under `apps/app/**` — pages, route modules, loaders, data-fetching hooks, mutations, forms, create/edit modals, UI components, client state, authorization gating, or i18n. Use even when the user does not say "frontend" — e.g. "add a page", "new list/detail screen", "fetch this from the API on the app", "add a create modal", "wire up a form", "invalidate the query", "gate this button by permission", "style with the design tokens". Routes you to the right reference (TanStack Query, React Router data mode, @repo/ui) and the canonical `.github/instructions/app/*` guides; read the matching one before writing code.
---

# ecbot Frontend (`apps/app`)

React 19 + Vite SPA. **Stack**: Tailwind CSS 4, TanStack Query v5 (server state), React Router DOM v7 data router (lazy modules), Jotai (client state), CASL (authz), React Hook Form + Zod (`zod/v4`) via `zodResolver`, `react-i18next`, and `@repo/ui` (built on `@medusajs/ui`). API access via the generated `@repo/client`.

**Workflow for any frontend task**: (1) match the task to a [reference](#3-references) and read it, (2) copy the nearest existing route feature as a template, (3) follow the [Global rules](#1-global-rules).

## 1. Global rules

- **Server state → TanStack Query only; client state → Jotai only.** Never store fetched data in `useState`/Jotai. See [references/tanstack-query.md](references/tanstack-query.md).
- **All API access goes through hooks in `src/hooks/api/<resource>.ts`** that wrap the generated `@repo/client`. Never hand-write `fetch`/`axios` — regenerate the client (`pnpm generate:client`) if an endpoint is missing.
- **Query keys via `queryKeysFactory`**; mutations invalidate the relevant list/detail keys `onSuccess`. See [references/tanstack-query.md](references/tanstack-query.md).
- **Routes are lazy modules, not inline JSX.** Each page folder has an `index.ts` barrel exporting `Component` (+ `loader`/`Breadcrumb` when present). Loaders prime the shared `queryClient`. Use the `ROUTES` constant, never hardcoded path strings. See [references/react-router.md](references/react-router.md).
- **Every page wraps in `SingleColumnPage` / `TwoColumnPage`** (from `@/components/layout/page`) which render `<Outlet/>` for child modal routes. See [references/react-router.md](references/react-router.md).
- **Create = `RouteFocusModal`, Edit = `RouteDrawer`** (from `@/components/modals`); after a successful mutation call `useRouteModal().handleSuccess()` + a toast. See [references/react-router.md](references/react-router.md).
- **List screens use the DataTable pattern** — `useDataTable` + `_DataTable` with `use-*-table-columns/filters/query` hooks. See [references/table-list.md](references/table-list.md).
- **Forms** use Zod schemas + `zodResolver` and the `@repo/ui` `Form` compound components — never raw `<input>` with manual state. Schemas live in `routes/<feature>/schemas.ts`.
- **UI from `@repo/ui` first, then `@medusajs/ui`.** Style with Medusa/Tailwind design tokens (`bg-ui-bg-base`, `text-ui-fg-subtle`, …), never hardcoded hex or inline `style`. See [references/ui.md](references/ui.md).
- **Component composition** — items always inside their Group (`SelectItem` → `SelectGroup`, `DropdownMenuItem` → `DropdownMenuGroup`, …); use `asChild` (Radix) or `render` (Base UI) for custom triggers; modals always need a `Title` (`sr-only` allowed); full `Card` composition (`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`); `Button` has no `isPending`/`isLoading` (compose `Spinner` + `data-icon` + `disabled`); `TabsTrigger` inside `TabsList`; `Avatar` always needs `AvatarFallback`; empty states per section. See [rules/composition.md](rules/composition.md).
- **Polish & motion → use the design-engineering skills.** For UI craft (surfaces, spacing, icons, micro-interactions) invoke `make-interfaces-feel-better`; for motion, `emil-design-eng` is the **single source of truth for exact values** (easing tokens, durations, springs) — its [`eccho.md`](../emil-design-eng/eccho.md) pins them to ecbot's stack (`motion/react`, `ui-` tokens, `.dark`). Animation is `motion` (`import … from "motion/react"`, never `framer-motion`); easing tokens (`--ease-out`/`--ease-in-out`/`--ease-drawer`) live in `apps/app/src/index.css @theme`, never `ease-in` on UI. Picking a library for a task (toasts, ⌘K, charts, drag/drop, state) → `pick-ui-library`. See [§4](#4-ui-polish-motion--libraries).
- **Never hardcode user-facing strings** — use `t()` from `react-i18next`; keys in `apps/app/src/i18n/translations/{region}.json`. See [i18n rule](../../../.claude/rules/i18n.md).
- **Authorization** — gate UI with CASL `<Can I=… a=…>` for rendering and `ability.can(...)` for logic. See [state-and-authorization.instructions](../../../.github/instructions/app/state-and-authorization.instructions.md).
- **Constants and types live in their own files — never inline in a component/hook.** Feature constants → `routes/<feature>/constants.ts`; Zod schemas + inferred form types → `routes/<feature>/schemas.ts`; shared types → `routes/<feature>/types.ts` (or `src/types/<domain>.ts` when used across features). See [Constants & types](#constants--types).
- **API response types come from `@repo/client`, never hand-declared.** Re-export them from the resource hook (`export type { XResponseDto }`), never retype the server shape inline.
- **No `any`.** Type it, or narrow it — `any` only for genuinely dynamic payloads, with a comment saying why.
- **Typed function components** (`FC<Props>`), handle `isLoading`/`isError` on every query, one component per file, kebab-case files.
- **Commands** — `pnpm --filter app dev`, `pnpm generate:client`, `pnpm --filter app lint`.

## 2. Structure

### Route feature folder

Each feature lives at `apps/app/src/routes/<feature>/`, one subfolder per page + a barrel:

```
routes/chatbot/
├── chatbot-list/        # list page  (+ loader.ts)          → index.ts: export { … as Component }, loader
├── chatbot-create/      # create page (RouteFocusModal)
├── chatbot-details/     # detail page (+ loader.ts, breadcrumb.tsx)
├── chatbot-edit/        # edit page  (RouteDrawer)
├── components/          # shared feature components (e.g. chatbot-form)
├── constants.ts
└── schemas.ts           # Zod schemas + inferred form types
```

Barrel re-exports the page as `Component` (and `loader` / `Breadcrumb` when present). Register in `apps/app/src/routes/route.tsx` with `lazy: () => import("./<feature>/<page>")`.

### Constants & types

One concern per file, colocated in the feature folder. Inlining a magic array or a
prop/response type at the top of a component is the most common review comment on
this repo — and the same rule applies on the backend (see the `eccho-backend` skill).

| Declaration                                               | Lives in                                      |
| --------------------------------------------------------- | --------------------------------------------- |
| Feature constants (page size, query params, option lists) | `routes/<feature>/constants.ts`               |
| Route path tokens                                         | `routes/constants.ts` (the `ROUTES` object)   |
| Zod schemas + `z.infer` form types                        | `routes/<feature>/schemas.ts`                 |
| Shared types/interfaces for a feature                     | `routes/<feature>/types.ts`                   |
| Types shared across features                              | `src/types/<domain>.ts`                       |
| API request/response types                                | `@repo/client` (regenerate, never hand-write) |

```tsx
// WRONG — magic list + response shape inlined in the hook file
const STATUSES = ["SCHEDULED", "COMPLETED", "FAILED"] as const;
type Followup = { followupId: string; status: string };

// RIGHT
import { FOLLOWUP_STATUSES } from "@/routes/followups/constants";
import type { FollowupListResponseDto } from "@repo/client";
```

### Key locations

- Route pages & config → `src/routes/` (`route.tsx` is the router tree)
- API hooks → `src/hooks/api/<resource>.ts`
- Query-key factory → `src/libs/query-factory`
- Shared modals (`RouteFocusModal`, `RouteDrawer`) → `src/components/modals`
- i18n strings → `src/i18n/translations/{region}.json`
- Shared UI library → `@repo/ui` (package at `packages/ui`)

## 3. References

Read the matching reference **before** writing code. These distill ecbot's conventions; the `.github/instructions/app/*` files are the source of record.

| Task / area                                                                                                                                 | Reference                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fetching, query keys, mutations, invalidation, loaders priming cache                                                                        | [references/tanstack-query.md](references/tanstack-query.md) · [data-fetching.instructions](../../../.github/instructions/app/data-fetching.instructions.md)       |
| Router tree, lazy route modules, loaders, breadcrumbs, layout containers, create/edit modals                                                | [references/react-router.md](references/react-router.md) · [routing-and-modals.instructions](../../../.github/instructions/app/routing-and-modals.instructions.md) |
| List/table screens (DataTable, columns/filters/query hooks)                                                                                 | [references/table-list.md](references/table-list.md)                                                                                                               |
| `@repo/ui` + `@medusajs/ui` components, design tokens, colors                                                                               | [references/ui.md](references/ui.md)                                                                                                                               |
| Component composition — Groups, `asChild`/`render` triggers, modal Titles, Card/Button/Tabs/Avatar, empty states                            | [rules/composition.md](rules/composition.md)                                                                                                                       |
| Forms (RHF + Zod + `@repo/ui` Form)                                                                                                         | [forms.instructions](../../../.github/instructions/app/forms.instructions.md)                                                                                      |
| Client state (Jotai) & authorization (CASL)                                                                                                 | [state-and-authorization.instructions](../../../.github/instructions/app/state-and-authorization.instructions.md)                                                  |
| Component conventions, route-folder layout, best practices                                                                                  | [react.instructions](../../../.github/instructions/app/react.instructions.md)                                                                                      |
| i18n (`react-i18next`, translation keys)                                                                                                    | [i18n rule](../../../.claude/rules/i18n.md)                                                                                                                        |
| Chatbot creation **wizard** (multi-step) + template-driven dynamic fields + frontend prompt composition + archetype toggles on details page | archetypes = per-chatbot behavioural toggles; templates = the template drives which dynamic fields the wizard shows                                                        |

## 4. UI polish, motion & libraries

Design-engineering skills that layer on top of the ecbot conventions above. They all defer to **[`emil-design-eng/eccho.md`](../emil-design-eng/eccho.md)** for exact motion values and ecbot's endorsed libraries — one source of truth, no duplicated catalogs. Invoke the one matching the task:

| Task                                                                                                                                            | Skill                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Build/polish a component or screen — surfaces, spacing, radius, icons, typography, micro-interactions; quick or full UI review                  | `make-interfaces-feel-better`                                                                             |
| Exact motion values & craft rationale (easing curves, durations, springs, gestures, clip-path, performance, a11y) — **the canonical reference** | `emil-design-eng` (+ [`eccho.md`](../emil-design-eng/eccho.md))                                           |
| "What here should animate?" — read-only sweep proposing precise, restrained motion recipes                                                      | `find-animation-opportunities`                                                                            |
| Audit a screen/app's motion and produce prioritized fix plans (read-only)                                                                       | `improve-animations`                                                                                      |
| Review a diff's animation code against the craft bar                                                                                            | `review-animations`                                                                                       |
| Pick the right library for a task (toasts, ⌘K, charts, drag/drop, OTP, state, theming)                                                          | `pick-ui-library`                                                                                         |
| Anything else UI-related not covered above (accessibility audit, perf pass, layout structure…)                                                  | follow `eccho-frontend` conventions (§1–§3) directly, then apply `make-interfaces-feel-better` for polish |

Rules that bind all of them in ecbot: motion = `motion/react` (never `framer-motion`); toasts = `@medusajs/ui` (never Sonner); state = Jotai/TanStack (never zustand); theme = ecbot `ThemeProvider` (never next-themes); classnames = `cn` from `@repo/ui/utils`; colors = `ui-` tokens only; honor `prefers-reduced-motion` / `useReducedMotion`.

Backend API this app calls → see the `eccho-backend` skill.
