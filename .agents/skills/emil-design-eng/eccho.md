# ecbot design system — motion & UI values (single source of truth)

Every polish/animation skill in this repo (`make-interfaces-feel-better`, `find-animation-opportunities`, `improve-animations`, `review-animations`, `pick-ui-library`) defers to **this file** for eccho-specific values and library choices. Don't invent parallel easing tokens, don't reach for `framer-motion`/`sonner`/`zustand` — ecbot has already picked. When a value or library is needed, pull it from here; the surrounding craft principles (why/when) live in the skill and in `emil-design-eng/SKILL.md`.

Scope: `apps/app/**` (React 19 + Vite + Tailwind 4 + `@repo/ui`/`@medusajs/ui`). Also applies to `packages/ui/**`.

## Motion library

- **`motion` v12** — `import { motion, AnimatePresence, useReducedMotion } from "motion/react"`. **Never `framer-motion`** (not installed; the import path is `motion/react`).
- Already used in ecbot: `apps/app/src/components/layout/shell/shell.tsx`, `packages/ui/src/components/common/{logo-box,progress-bar}`. Match those imports.
- Reach for `motion` only when you need springs, layout animations, exit animations (`AnimatePresence`), or gesture-driven values. A plain hover/fade is a CSS transition — don't pull in `motion` for it.

## Easing tokens

**Source of truth: `apps/app/src/index.css` `@theme`.** That file defines the tokens; the values below are mirrored here for convenience — **if they ever differ, `index.css` wins**, and any curve change is made there, not here. Use the tokens, don't hardcode raw cubic-beziers per component:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* enter/exit UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* on-screen move/morph */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* drawers / sheets */
```

Tailwind 4 exposes these as `ease-out`, `ease-in-out`, `ease-drawer` utilities automatically (e.g. `transition-transform duration-200 ease-out`). If a new curve is genuinely needed, add the token in `index.css` first. **Never `ease-in` on UI.**

## Durations & springs

Use the duration table and spring guidance in [SKILL.md](SKILL.md) ("How fast should it be?" + "Spring Animations"). Defaults: UI < 300ms; spring `{ type: "spring", duration: 0.5, bounce: 0.2 }` for gestures/alive elements, `{ type: "spring", duration: 0.3, bounce: 0 }` (bounce **0**) for icon swaps.

## Color & surface tokens (mandatory)

Style with Medusa's semantic `ui-` Tailwind tokens — **never hardcoded hex, arbitrary hex, or inline `style`**. They are theme-aware (light/`.dark`) automatically. When a craft example below uses a generic variable, map it to the ecbot token:

| Generic in the craft docs                | ecbot token                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `var(--surface-hover)`, hover background | `bg-ui-bg-base-hover` / `bg-ui-bg-subtle-hover` (also `-pressed`)                 |
| surface / card background                | `bg-ui-bg-base`, `bg-ui-bg-subtle`, `bg-ui-bg-component`, `bg-ui-bg-field`        |
| body / secondary text                    | `text-ui-fg-base`, `text-ui-fg-subtle`, `text-ui-fg-muted`                        |
| structural / state border                | `border-ui-border-base`, `border-ui-border-interactive`, `border-ui-border-error` |

Dark mode is the `.dark` class variant (`@custom-variant dark`), not `prefers-color-scheme` and not `next-themes`. **Image outlines** keep their pure `black/10` (light) and `white/10` (dark) values — those are neutral separators, deliberately not `ui-` tokens.

`--shadow-border` "shadow-as-border" tokens are **not** defined in ecbot — if you use that technique, add the tokens to `index.css` `@theme` first (see `surfaces.md`).

## Utilities & primitives

- **Classnames**: `cn` from `@repo/ui/utils` (never raw `clsx`). **Variants**: `class-variance-authority` (`cva`) — already used in `@repo/ui`.
- **Reduced motion**: `const reduce = useReducedMotion()` from `motion/react`, or `@media (prefers-reduced-motion: reduce)`. Gentler, not zero — keep opacity/color, drop movement.
- **Hover gating** for touch: `@media (hover: hover) and (pointer: fine)`.

## Endorsed libraries (see `pick-ui-library`)

Already installed & canonical: `motion` (animation), `cmdk` (⌘K, via `@repo/ui/components` `command`), `recharts` (charts, via `@repo/ui/components` `chart`), `@medusajs/ui` `toast` (toasts — **not Sonner**), Radix via `@repo/ui`/`@medusajs/ui` (primitives — **not base-ui**), Jotai (client state — **not zustand**), TanStack Query (server state), ecbot `ThemeProvider` (`@/providers/theme-provider` — **not next-themes**). Check `apps/app/package.json` before adding anything new.
