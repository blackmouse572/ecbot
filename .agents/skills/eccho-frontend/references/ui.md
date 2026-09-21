# UI — `@repo/ui` + `@medusajs/ui`

ecbot's UI layer is a **combination of [Medusa UI](https://github.com/medusajs/medusa/tree/develop/packages/design-system/ui) and the local `@repo/ui` package** (`packages/ui`). Medusa UI supplies primitives + design tokens; `@repo/ui` wraps and extends them with app-specific components. Build screens from these, not from raw HTML + ad-hoc CSS.

## Package layout — `@repo/ui`

`packages/ui` is built on `@medusajs/ui` v4, `@medusajs/ui-preset` (Tailwind preset + tokens), `@medusajs/icons`, `radix-ui`, and `class-variance-authority`. Exports:

| Import                       | Contents                                                                                                                                                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@repo/ui/common-components` | App components: `Form`, `Input`, `Combobox`, `FileUpload`, `Section`, `ActionMenu`, `Skeleton`, `Thumbnail`, `SwitchBox`, `SortableList/Tree`, `OtpInput`, `Loading`, `ChipGroup`, `EmptyTableContent`, `ai/*`, … (see `packages/ui/src/components/common/index.ts`) |
| `@repo/ui/components`        | Radix wrappers: `accordion`, `chart`, `command`, `dropdown-menu`, `hover-card`, `input-group`, `navigation-menu`, `scroll-area`                                                                                                                                      |
| `@repo/ui/utils`             | helpers (e.g. `cn` classname merge)                                                                                                                                                                                                                                  |
| `@medusajs/ui`               | primitives not re-wrapped: `Button`, `Badge`, `Table`, `Toaster`/`toast`, `Tooltip`, `Text`, `Heading`, `Container`, `Drawer`, `Select`, `Checkbox`, …                                                                                                               |
| `@medusajs/icons`            | icon set (alongside `@tabler/icons-react`)                                                                                                                                                                                                                           |

## Component choice order

1. **`@repo/ui/common-components`** — if an app component exists (Form, Input, Combobox, FileUpload…), use it.
2. **`@repo/ui/components`** — for the wrapped Radix primitives.
3. **`@medusajs/ui`** — for base primitives (`Button`, `Badge`, `Table`, `toast`, …).
4. Only build a new component when none fit; put shared ones in `packages/ui`, feature-local ones in `routes/<feature>/components/`.

## Design tokens (colors) — mandatory

Style with Medusa's semantic Tailwind tokens (prefix **`ui-`**), never hardcoded hex, arbitrary values, or inline `style`. Tokens are theme-aware (light/dark) automatically. Confirmed in-use across the app:

| Category          | Pattern              | Examples in use                                                                                                                 |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Background        | `bg-ui-bg-*`         | `bg-ui-bg-base`, `bg-ui-bg-subtle`, `bg-ui-bg-component`, `bg-ui-bg-field`, `bg-ui-bg-disabled`, + `-hover` / `-pressed` states |
| Foreground (text) | `text-ui-fg-*`       | `text-ui-fg-base`, `text-ui-fg-subtle`, `text-ui-fg-muted`, `text-ui-fg-error`, `text-ui-fg-disabled`, `text-ui-fg-interactive` |
| Border            | `border-ui-border-*` | `border-ui-border-base`, `border-ui-border-interactive`, `border-ui-border-error`                                               |
| Tag               | `*-ui-tag-*`         | status/label chips                                                                                                              |

Rule of thumb: `bg-ui-bg-*` for surfaces, `text-ui-fg-*` for text (subtle/muted for secondary), `border-ui-border-*` for borders; add `-hover`/`-pressed` for interactive states. Reference: [Medusa UI colors overview](https://docs.medusajs.com/ui/colors/overview).

## Typography & primitives

Use `Heading` / `Text` from `@medusajs/ui` (with `size`/`weight`/`className`) rather than raw `<h*>`/`<p>` for consistent scale. Medusa follows shadcn-style composability over native HTML — respect that; don't wrap primitives in heavy abstractions.

## Notes

- Medusa UI is built on Radix primitives + a Tailwind preset; the preset is already wired via `@repo/ui`'s `ui-preset.ts`. Don't re-import the preset in `apps/app`.
- Toasts: `import { toast } from "@medusajs/ui"` — pair with mutation success/error (see [react-router.md](react-router.md#after-a-successful-mutation)).
- Icons: `@medusajs/icons` and `@tabler/icons-react` are both available.
