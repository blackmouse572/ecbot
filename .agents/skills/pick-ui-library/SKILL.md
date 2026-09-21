---
name: pick-ui-library
description: Pick the right library for a given frontend task from a curated, opinionated list — numbers, OTP inputs, charts, command menus, virtualization, drag and drop, toasts, state, styling, and more. Only runs when explicitly invoked; it does not trigger on its own.
disable-model-invocation: true
---

# Picking The Right Library

A lookup skill. When invoked with a task ("I need toasts", "what should I use for drag and drop?"), match the task to the list below and recommend the library. **ecbot has already made most of these picks** — this list is eccho-first: prefer what's installed and wired into `@repo/ui`/`@medusajs/ui` before anything else.

## How to use this

1. **Identify the task**, not the library the user named. "I need to show a dropdown" is a UI-primitives task (`@repo/ui`/`@medusajs/ui`), even if they asked about a specific package.
2. **Check ecbot first, in this order:** (a) `@repo/ui/common-components` and `@repo/ui/components`, (b) `@medusajs/ui` primitives, (c) `apps/app/package.json`. If ecbot already has it, use it — don't add a competitor. See the `eccho-frontend` skill and its `references/ui.md`.
3. **Recommend one library**, state what it's for in one sentence, and wire it up if that's part of the request. Don't present a menu when there's a clear answer.
4. If the task isn't covered here **and** ecbot has nothing installed, say so explicitly and recommend from your own knowledge — but flag that it's a new dependency and follow the monorepo conventions.

## ecbot's canonical stack (use these first)

| Task                                                                  | ecbot pick                                              | Where                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Accessible primitives (dialogs, popovers, menus, selects, accordion…) | `@repo/ui` (Radix wrappers) → `@medusajs/ui` primitives | `@repo/ui/components`, `@repo/ui/common-components`, `@medusajs/ui` — **not base-ui**          |
| Command menus (⌘K palettes)                                           | [cmdk](https://cmdk.paco.me)                            | `@repo/ui/components` → `command`                                                              |
| Toasts / notifications                                                | `toast` / `Toaster`                                     | `@medusajs/ui` — **not Sonner**                                                                |
| One-time password inputs                                              | `OtpInput`                                              | `@repo/ui/common-components`                                                                   |
| General animation (springs, layout, enter/exit, gestures)             | [motion](https://motion.dev) v12                        | `import … from "motion/react"` — **not framer-motion**                                         |
| Charts (dashboards, analytics)                                        | [recharts](https://recharts.org)                        | `@repo/ui/components` → `chart`                                                                |
| Drag / drop / sortable                                                | `SortableList` / `SortableTree`                         | `@repo/ui/common-components` (reach for [dnd kit](https://dndkit.com) only if these don't fit) |
| Client state                                                          | [Jotai](https://jotai.org)                              | app providers — **not zustand**                                                                |
| Server state / data fetching                                          | [TanStack Query v5](https://tanstack.com/query)         | `src/hooks/api/*` (see `eccho-frontend`)                                                       |
| `className` merging                                                   | `cn`                                                    | `@repo/ui/utils` (wraps clsx + tailwind-merge) — **not raw clsx**                              |
| Variant-driven component styling                                      | [cva](https://cva.style) (`class-variance-authority`)   | already used across `@repo/ui`                                                                 |
| Theme / dark mode                                                     | ecbot `ThemeProvider` + `useTheme`                      | `@/providers/theme-provider` (`.dark` class) — **not next-themes**                             |
| Icons                                                                 | `@medusajs/icons`, `@tabler/icons-react`                | both installed                                                                                 |

For motion + `ui-` design-token rules, defer to [`../emil-design-eng/eccho.md`](../emil-design-eng/eccho.md). Reach for `motion` only when you need springs, layout/exit animations, or gesture values — a simple hover/fade is a CSS transition.

## Not installed — endorsed only when the task genuinely calls for it

Flag these as **new dependencies** (follow `.github/instructions/monorepo.instructions.md`); don't add speculatively:

| Task                                        | Library                                             |
| ------------------------------------------- | --------------------------------------------------- |
| Animating numbers (counters, prices, stats) | [NumberFlow](https://number-flow.barvian.me)        |
| Virtualization (1,000+ row lists/tables)    | [Virtuoso](https://virtuoso.dev)                    |
| Real-time / streaming charts                | [Liveline](https://github.com/benjitaylor/liveline) |
| Dynamic OG images (HTML/CSS → SVG/PNG)      | [Satori](https://github.com/vercel/satori)          |
| Syntax highlighting                         | [shiki](https://shiki.style)                        |
| Customizable control panels (dev tooling)   | [Leva](https://github.com/pmndrs/leva)              |

## Common mismatches to catch

- **Toasts built by hand or with a modal library** → `toast` from `@medusajs/ui`.
- **A `<div>`-based dropdown/dialog with manual focus handling** → `@repo/ui`/`@medusajs/ui` primitives (Radix) handle focus trapping and dismissal.
- **`framer-motion` / `sonner` / `zustand` / `next-themes` imports** → ecbot equivalents above; these packages aren't installed.
- **Template-literal className ternaries** → `cn` from `@repo/ui/utils`, or `cva` if it's variant-shaped.
- **Rendering a 1,000+ row list directly** → Virtuoso before pagination hacks (new dependency).
- **Animating a number by re-rendering text** → NumberFlow (new dependency).
