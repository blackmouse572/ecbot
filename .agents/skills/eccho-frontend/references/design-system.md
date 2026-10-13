# ecbot design system: libraries, motion and tokens

ecbot's picks for `apps/app/**` and `packages/ui/**`. They override the generic advice in the upstream craft skills (`emil-design-eng`, `make-interfaces-feel-better`, `find-animation-opportunities`, `improve-animations`, `review-animations`, `pick-ui-library`). Use those skills for the craft (when and why to animate, how fast, what feels right) and this file for which library, token and value to use here. The upstream skills are kept as unedited copies so `npx skills update` can refresh them, which is why ecbot specifics live in this file.

## Libraries

Check what ecbot already has before adding anything, in this order: `@repo/ui/common-components` and `@repo/ui/components`, then `@medusajs/ui`, then `apps/app/package.json`. A second library for a job that is already covered splits the codebase.

| Task                                                      | ecbot pick                                      | Where                                                                            |
| --------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Accessible primitives (dialogs, popovers, menus, selects) | `@repo/ui` Radix wrappers, then `@medusajs/ui`  | `@repo/ui/components`, `@repo/ui/common-components`, `@medusajs/ui`; not base-ui |
| Command menus (⌘K)                                        | [cmdk](https://cmdk.paco.me)                    | `@repo/ui/components` (`command`)                                                |
| Toasts                                                    | `toast` / `Toaster`                             | `@medusajs/ui`; not Sonner                                                       |
| One-time password input                                   | `OTPInput`                                      | `@repo/ui/common-components`                                                     |
| Animation (springs, layout, enter/exit, gestures)         | [motion](https://motion.dev) v12                | `motion/react`; not framer-motion                                                |
| Charts                                                    | [recharts](https://recharts.org)                | `@repo/ui/components` (`chart`), `@repo/ui/charts`                               |
| Client state                                              | [Jotai](https://jotai.org)                      | not zustand                                                                      |
| Server state                                              | [TanStack Query v5](https://tanstack.com/query) | `src/hooks/api/*`, see [tanstack-query.md](tanstack-query.md)                    |
| Class name merging                                        | `clx`                                           | `@medusajs/ui`; not raw clsx                                                     |
| Variant-driven styling                                    | [cva](https://cva.style)                        | `class-variance-authority`, used across `@repo/ui`                               |
| Theme and dark mode                                       | `ThemeProvider` + `useTheme`                    | `@/providers/theme-provider` (`.dark` class); not next-themes                    |
| Icons                                                     | `@medusajs/icons`, `@tabler/icons-react`        | both installed                                                                   |

### Not installed: endorsed when the task calls for it

Each of these is a new dependency, so follow `.github/instructions/monorepo.instructions.md` and don't add one speculatively.

| Task                                        | Library                                             |
| ------------------------------------------- | --------------------------------------------------- |
| Drag, drop, sortable lists                  | [dnd kit](https://dndkit.com)                       |
| Animating numbers (counters, prices, stats) | [NumberFlow](https://number-flow.barvian.me)        |
| Virtualization (1,000+ row lists or tables) | [Virtuoso](https://virtuoso.dev)                    |
| Real-time or streaming charts               | [Liveline](https://github.com/benjitaylor/liveline) |
| Syntax highlighting                         | [shiki](https://shiki.style)                        |

### Common mismatches

- A toast built by hand or with a modal → `toast` from `@medusajs/ui`.
- A `<div>` dropdown or dialog with manual focus handling → `@repo/ui` / `@medusajs/ui` primitives, which handle focus trapping and dismissal.
- `framer-motion`, `sonner`, `zustand` or `next-themes` imports → the ecbot pick above; those packages aren't installed.
- Template-literal className ternaries → `clx`, or `cva` when the shape is a set of variants.

## Motion

- `import { motion, AnimatePresence, useReducedMotion } from "motion/react"`. Examples: `apps/app/src/components/ai-chat/text-swap.tsx`, `packages/ui/src/components/common/progress-bar/progress-bar.tsx`.
- Use `motion` only for springs, layout and exit animations, or gesture-driven values. A hover or fade is a CSS transition and doesn't need it.
- Easing comes from the tokens in `apps/app/src/index.css` `@theme`: `--ease-out` (enter and exit), `--ease-in-out` (movement on screen), `--ease-drawer` (drawers and sheets). Tailwind exposes them as `ease-out`, `ease-in-out` and `ease-drawer`. Don't hardcode a cubic-bezier in a component; if a new curve is really needed, add a token there first so every component shares it. Don't use `ease-in` on UI: it delays the visible start, so the interface feels slow.
- Durations and springs follow `emil-design-eng` ("How fast should it be?" and "Spring Animations"). Defaults: UI under 300ms, `{ type: "spring", duration: 0.5, bounce: 0.2 }` for gestures, `{ type: "spring", duration: 0.3, bounce: 0 }` for icon swaps.
- Reduced motion: `useReducedMotion()` or `@media (prefers-reduced-motion: reduce)`. Make it gentler rather than off: keep opacity and color changes, drop movement.
- Gate hover effects with `@media (hover: hover) and (pointer: fine)` so touch devices don't get stuck hover states.

## Color and surface tokens

Style with Medusa's semantic `ui-` Tailwind tokens, never hex, arbitrary values or inline `style`. The tokens switch between light and dark on their own, and a hardcoded color breaks one of the two. When a craft skill uses a generic variable, map it:

| Generic in the craft skills              | ecbot token                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `var(--surface-hover)`, hover background | `bg-ui-bg-base-hover`, `bg-ui-bg-subtle-hover` (also `-pressed`)                  |
| Surface or card background               | `bg-ui-bg-base`, `bg-ui-bg-subtle`, `bg-ui-bg-component`, `bg-ui-bg-field`        |
| Body or secondary text                   | `text-ui-fg-base`, `text-ui-fg-subtle`, `text-ui-fg-muted`                        |
| Structural or state border               | `border-ui-border-base`, `border-ui-border-interactive`, `border-ui-border-error` |

Dark mode is the `.dark` class (`@custom-variant dark` in `index.css`), not `prefers-color-scheme`. Image outlines keep `black/10` (light) and `white/10` (dark) on purpose: they are neutral separators, not `ui-` tokens.

ecbot defines no `--shadow-border` tokens. To use the shadow-as-border technique from `make-interfaces-feel-better` (`surfaces.md`), add the tokens to `index.css` `@theme` first.
