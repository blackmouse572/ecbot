# DESIGN.md: the Ecbot design system

Ecbot is a chatbot workspace for Vietnamese shop owners. They connect Messenger, Zalo, Instagram, TikTok, Shopee and more, then let a bot answer their customers. The interface is a calm, neutral tool. Colour is kept for state (a reply is waiting, a quota is running low, a channel is disconnected), so an owner scanning a busy inbox sees at once what needs them.

The system is **[Medusa UI](https://docs.medusajs.com/ui)** (`@medusajs/ui`, `@medusajs/ui-preset`, `@medusajs/icons`) with an Ecbot layer on top (`@repo/ui`). Build from Medusa's tokens and primitives; never restyle them. This file follows the Medusa UI docs order: foundations (colour, typography, icons), then components, then patterns.

Related: library and motion picks in [`.agents/skills/eccho-frontend/references/design-system.md`](.agents/skills/eccho-frontend/references/design-system.md), component APIs in [`ui.md`](.agents/skills/eccho-frontend/references/ui.md), domain terms in [`CONTEXT.md`](CONTEXT.md).

## 1. Layers: what to reach for first

1. `@repo/ui/common-components`: Ecbot components (`Form`, `Input`, `Combobox`, `FileUpload`, `Section`, `SectionRow`, `NoRecords`, `NoResults`, `Skeleton`, `FormSkeleton`, `OTPInput`, `SwitchBox`, `ActionMenu`, `ai/*`).
2. `@repo/ui/components`: wrappers Medusa lacks (`Meter`, `command`, `accordion`, `scroll-area`, `hover-card`, `chart`).
3. `@medusajs/ui`: primitives (`Button`, `IconButton`, `Badge`, `StatusBadge`, `Text`, `Heading`, `Container`, `Drawer`, `FocusModal`, `Prompt`, `Select`, `Switch`, `Tooltip`, `toast`).
4. App overlays in `apps/app/src/components/modals`: `RouteFocusModal`, `RouteDrawer`, `StackedFocusModal`, `StackedDrawer`, `useRouteModal`.
5. A new component only when nothing fits. Shared ones go in `packages/ui`, feature-only ones in `routes/<feature>/components/`.

## 2. Content

- **Vietnamese first.** Every string ships in `vi` and `en`. Vietnamese runs 20 to 40% longer than English and stacks diacritics above and below the line ("Chờ bạn", "Bạn chưa kết nối kênh nào"). Never fix widths to the English length.
- Address the owner as "bạn". The bot is "trợ lý" or the chatbot's own name, not "AI" as a noun.
- Sentence case for titles and buttons: "Lưu thay đổi", "Kết nối kênh", "Save changes".
- A button says what happens ("Tạo trợ lý"); the toast confirms it in the past tense ("Đã tạo trợ lý").
- Errors say what went wrong and how to fix it, with no apology.
- Punctuate with commas, colons, periods or parentheses. **No em dash ("—") in product text**: our non-technical Vietnamese users read it as machine-written. This covers LLM prompt templates too.
- No emoji as decoration. Channels are shown with their real logos, not emoji.
- Numbers follow the locale: `1.284 tin nhắn`, `12,5%`, prices in VND without decimals (`199.000 ₫`). Plan prices are stored in cents; format at the edge.

## 3. Colour

Style only with the semantic `ui-` utilities: `bg-ui-bg-*`, `text-ui-fg-*`, `border-ui-border-*`, `*-ui-tag-*`. They switch between light and dark on their own. **Never** hex, raw palette classes (`bg-zinc-200`, `text-violet-600`), arbitrary colours or inline `style` colours.

### Core tokens

Values come from `@medusajs/ui-preset`; the full list (90 colours) is in `src/theme/tokens/colors.ts` of that package.

| Token             | Light       | Dark        | Use                                                                       |
| ----------------- | ----------- | ----------- | ------------------------------------------------------------------------- |
| `bg-subtle`       | `#fafafa`   | `#18181b`   | Page canvas behind Containers (set on `:root`).                           |
| `bg-base`         | `#ffffff`   | `#212124`   | Default surface: Containers, cards, drawers, the sidebar.                 |
| `bg-component`    | `#fafafa`   | `#27272a`   | Nested fills: chips, segmented controls, avatar fallback, Meter track.    |
| `bg-field`        | `#fafafa`   | `#ffffff0a` | Input, Textarea, Select.                                                  |
| `bg-highlight`    | `#eff6ff`   | `#172554`   | Selected row, highlighted search hit.                                     |
| `bg-interactive`  | `#3b82f6`   | `#60a5fa`   | The one accent fill: checked Switch, focus, `chart-1`.                    |
| `bg-overlay`      | `#18181b66` | `#18181bb8` | Scrim behind FocusModal, Drawer, Prompt.                                  |
| `bg-disabled`     | `#f4f4f5`   | `#27272a`   | Disabled controls.                                                        |
| `fg-base`         | `#18181b`   | `#f4f4f5`   | Content text and titles.                                                  |
| `fg-subtle`       | `#52525b`   | `#a1a1aa`   | Labels, secondary text (6.3:1 or better in both themes).                  |
| `fg-muted`        | `#71717a`   | `#71717a`   | Placeholders and non-essential hints only (3.3:1 on dark `bg-base`).      |
| `fg-disabled`     | `#a1a1aa`   | `#52525b`   | Text on disabled controls.                                                |
| `fg-interactive`  | `#3b82f6`   | `#60a5fa`   | Links and inline actions. 3.7:1 on white: use weight 500 or an underline. |
| `fg-error`        | `#e11d48`   | `#fb7185`   | Field errors.                                                             |
| `fg-on-color`     | `#ffffff`   | `#ffffff`   | Text on `button-danger`. Icons only on `bg-interactive` (2.5:1 in dark).  |
| `border-base`     | `#e4e4e7`   | `#ffffff14` | Dividers, `divide-y` inside Containers.                                   |
| `border-strong`   | `#d4d4d8`   | `#ffffff29` | Borders that must read on `bg-subtle`.                                    |
| `button-inverted` | `#27272a`   | `#52525b`   | Primary Button.                                                           |
| `button-neutral`  | `#ffffff`   | `#ffffff0a` | Secondary Button, IconButton.                                             |
| `button-danger`   | `#e11d48`   | `#9f1239`   | Danger Button.                                                            |

### Roles

- The page canvas is `bg-subtle`; content sits in Containers on `bg-base`.
- **One accent, blue**, for links, checked switches, focus and the first chart series. Primary actions are **not** blue: the primary Button is `button-inverted`.
- **State uses the tag ramps**, with the same meaning everywhere:

  | Ramp    | Meaning          | Examples                                   |
  | ------- | ---------------- | ------------------------------------------ |
  | green   | healthy, done    | channel connected, Meter under 80%         |
  | orange  | needs attention  | needs reconnect, "Chờ bạn", Meter from 80% |
  | red     | failed, blocked  | send failed, Meter at 100%                 |
  | blue    | informational    | "Mới", "Bot trả lời"                       |
  | purple  | AI or automation | bot-authored content                       |
  | neutral | inactive         | paused, closed                             |

  Each ramp has `-bg`, `-text`, `-icon`, `-border`. Always pair a state colour with a word or icon; colour is never the only signal.

- **Charts** use `--chart-1` to `--chart-5` from `apps/app/src/index.css` (`chart-1` follows `bg-interactive`). No per-channel chart colours exist yet; add them to `index.css` as tokens before a chart needs one, never inline.

### Dark mode

Dark is the `.dark` class on `<html>`, set by `ThemeProvider` (`@custom-variant dark` in `index.css`). A screen built only from `ui-` tokens needs no `dark:` variants. Image outlines are the one exception: `black/10` in light, `white/10` in dark.

## 4. Typography

- Intended faces: **Inter** for UI, **Geist Mono** for IDs, keys and code (`--font-sans`, `--font-mono` in `apps/app/src/index.css`). Today `apps/app` only names them and never loads them (only `apps/docs` does), so the SPA renders in the system font until the fonts are loaded. The preset's `code-label` / `code-paragraph` classes set Roboto Mono; add `font-mono` to get Geist Mono.
- Set text with `Text` and `Heading` from `@medusajs/ui`; they emit the classes below. Don't use raw `text-xs` / `text-sm`: they drop the 20px line height and crowd Vietnamese diacritics.
- `txt-compact-*` (20px line) is for single-line UI: cells, buttons, labels. `txt-*` (taller line) is for anything that wraps: descriptions, help text, chat bubbles.
- Weights stop at 500 (`-plus`). No bold body text, no italic emphasis (diacritics suffer).
- Numbers that line up (stats, quotas, prices in tables) take `tabular-nums`.

| Class                       | Size / line | Weight    | Use                                                   |
| --------------------------- | ----------- | --------- | ----------------------------------------------------- |
| `h1-core`                   | 18 / 28px   | 500       | `Heading level="h1"`: page titles, FocusModal titles. |
| `h2-core`                   | 16 / 24px   | 500       | `Heading` (default h2): Container and Drawer titles.  |
| `h3-core`                   | 14 / 20px   | 500       | `Heading level="h3"`: card and sub-section titles.    |
| `txt-compact-xsmall`        | 12 / 20px   | 400       | Metadata, captions, Tooltip.                          |
| `txt-compact-xsmall-plus`   | 12 / 20px   | 500       | Badge, Kbd, small labels.                             |
| `txt-compact-small`         | 13 / 20px   | 400       | **Default UI text**: cells, inputs, menu items.       |
| `txt-compact-small-plus`    | 13 / 20px   | 500       | Buttons, field labels, SectionRow titles.             |
| `txt-compact-medium(-plus)` | 14 / 20px   | 400 / 500 | Large Button, emphasised single-line values.          |
| `txt-compact-large(-plus)`  | 16 / 20px   | 400 / 500 | xlarge Button, stat labels.                           |
| `txt-small`                 | 13 / 20.8px | 400       | Multi-line body: descriptions, hints, empty states.   |
| `txt-medium`                | 14 / 22.4px | 400       | Long-form: chat bubbles, skill instructions.          |
| `txt-large`                 | 16 / 25.6px | 400       | Onboarding lead paragraphs.                           |
| `code-label`                | 12 / 15px   | 400       | Inline IDs and keys, with `font-mono`.                |
| `code-paragraph`            | 12 / 19.2px | 400       | Code blocks, webhook payloads.                        |

## 5. Spacing, radius, shadows

**Spacing** is the Tailwind 4px scale. These steps cover almost every screen:

| Step  | px  | Typical use                                                                   |
| ----- | --- | ----------------------------------------------------------------------------- |
| `1`   | 4   | Label to value (`gap-y-1`), icon to text in dense rows.                       |
| `1.5` | 6   | Button inner gap, base Button and Input vertical padding.                     |
| `2`   | 8   | Toolbar controls (`gap-x-2`), Input horizontal padding, Meter label to track. |
| `3`   | 12  | Button horizontal padding, Alert padding, gap between Containers (`gap-y-3`). |
| `4`   | 16  | Container vertical padding (`py-4`), gap between fields (`gap-y-4`).          |
| `6`   | 24  | Container horizontal padding (`px-6`), Drawer body padding.                   |
| `8`   | 32  | Page-level blocks, FocusModal body sections.                                  |

Lay out siblings with flex or grid and `gap`, not margins.

**Radius**: `rounded-md` (6px) on controls (Button, Input, Select, Badge, Kbd); `rounded-lg` (8px) on surfaces (Container, Alert, Tooltip, popovers, Drawer, FocusModal); `rounded-full` on Avatar, Switch and pills.

**Shadows** draw Medusa's borders, so most controls have no CSS border. Use the utility and don't add a `border` on top.

| Utility                                      | Use                                          |
| -------------------------------------------- | -------------------------------------------- |
| `shadow-borders-base`                        | Fields, Avatar, neutral tiles.               |
| `shadow-borders-interactive-with-active`     | Focused Input and Select.                    |
| `shadow-borders-error`                       | Invalid field.                               |
| `shadow-borders-focus`                       | Focus ring for custom focusable elements.    |
| `shadow-elevation-card-rest` / `-card-hover` | Container, clickable card.                   |
| `shadow-elevation-flyout`                    | Dropdowns, popovers, Combobox lists, toasts. |
| `shadow-elevation-tooltip`                   | Tooltip.                                     |
| `shadow-elevation-modal`                     | Drawer, FocusModal, Prompt.                  |

Any z-indexed region inside the app shell gets `isolate` (its own stacking context) instead of a higher z-index, because Medusa overlays have no z-index.

## 6. Icons

- `@medusajs/icons` first: 15px glyphs on a 20px box, `currentColor`. Colour them with `text-ui-fg-*`.
- `@tabler/icons-react` only for glyphs Medusa lacks, at `size={16}` and `stroke={1.5}` so they match. Don't mix the two sets inside one control group.
- Channels use their real logos from `apps/app/public/icons/` (Messenger, Instagram, WhatsApp, Threads, Zalo, TikTok, Shopee, Telegram, API channel, website widget). Never recolour or redraw them; pair each with its name the first time it appears on a screen.

## 7. Motion

- `motion/react` for springs, layout and exit animation; CSS transitions for hover and fade.
- Easing tokens only (`apps/app/src/index.css`): `ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` to enter and exit, `ease-in-out` `cubic-bezier(0.77, 0, 0.175, 1)` for movement on screen, `ease-drawer` `cubic-bezier(0.32, 0.72, 0, 1)` for drawers. Never `ease-in` on UI.
- UI motion stays under 300ms. Under `prefers-reduced-motion`, keep fades and drop movement.

## 8. Components

| Component                         | From                       | Rules                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**                        | `@medusajs/ui`             | `primary` (inverted) for the one main action per view; `secondary` for the rest; `transparent` inside rows and empty states; `danger` only inside a confirmation Prompt. `size="small"` in rows, toolbars and overlay footers. Use `isLoading` during mutations and `asChild` with a router `Link` to navigate. Order: secondary, then primary, right-aligned. |
| **IconButton**                    | `@medusajs/ui`             | One icon, always an `aria-label`, plus a `Tooltip` when the meaning isn't obvious. Row "more" menus use `ActionMenu`.                                                                                                                                                                                                                                          |
| **Badge**                         | `@medusajs/ui`             | Short classifying labels (tags, plan, "Mới") using the tag ramps above. `rounded="full"` for customer tags and filters. Never wraps.                                                                                                                                                                                                                           |
| **StatusBadge**                   | `@medusajs/ui`             | Dot plus word. The default way to show state in lists. Stays on one line in Vietnamese.                                                                                                                                                                                                                                                                        |
| **Input / Textarea / Select**     | `@repo/ui` `Form` + Medusa | Always inside `Form.Field`: label above (`txt-compact-small-plus`), control, then hint or error below. `size="small"` only in filters and toolbars.                                                                                                                                                                                                            |
| **Switch / SwitchBox**            | Medusa / `@repo/ui`        | For settings that apply at once. Settings pages use `SwitchBox` (title plus one sentence). Choices that need Save use a Checkbox.                                                                                                                                                                                                                              |
| **Container + Section**           | Medusa / `@repo/ui`        | One Container per topic. Head: `Heading` + one `fg-subtle` sentence + actions on the right. Split inside with `divide-y`, never nested cards. `SectionRow` shows a label and its value at `px-6 py-4`.                                                                                                                                                         |
| **Meter**                         | `@repo/ui/components`      | Required for every usage or quota bar. `Meter.Label` + `Meter.Value` on one row, then `Meter.Track` + `Meter.Indicator`. Tone `normal` under 80%, `warning` from 80%, `danger` at 100%. The value always states the number. Not for task progress.                                                                                                             |
| **Alert**                         | `@medusajs/ui`             | A persistent page-level problem with a fix ("reconnect your Page"). Not for confirming a save, and not to explain a card that already shows its state.                                                                                                                                                                                                         |
| **toast**                         | `@medusajs/ui`             | After every mutation: `toast.success` in the past tense, `toast.error(readApiError(error).message ?? fallback)`.                                                                                                                                                                                                                                               |
| **Tooltip + Kbd**                 | `@medusajs/ui`             | Names icon buttons, explains truncation, shows shortcuts. `ConditionalTooltip` explains why something is disabled.                                                                                                                                                                                                                                             |
| **Avatar / IconAvatar / LogoBox** | Medusa / `@repo/ui`        | People: round, initials fallback. Channels and integrations: square box with the real logo.                                                                                                                                                                                                                                                                    |
| **NoRecords / NoResults**         | `@repo/ui`                 | Nothing created yet: icon, one-line title, one sentence, one action. A filter with no match: `NoResults`. `size="small"` in side panels.                                                                                                                                                                                                                       |
| **Skeleton / FormSkeleton**       | `@repo/ui`                 | Loading placeholders in the shape of what's coming, never a lone spinner.                                                                                                                                                                                                                                                                                      |
| **Prompt / usePrompt**            | `@medusajs/ui`             | Destructive confirmation, with the object's name in the title and a danger Button.                                                                                                                                                                                                                                                                             |

## 9. Patterns

### Page

- A page is a vertical stack of Containers on `bg-subtle`, `gap-y-3`.
- The first Container is the page head: `Heading level="h1"`, one `fg-subtle` sentence, actions on the right (`gap-x-2`, primary last).
- Detail pages show metadata as `SectionRow`s inside a `Section`.

### Lists and tables

- Use the data table from `@repo/ui/table`. Cells are `txt-compact-small`; IDs use `code-label font-mono`; counts and money are `tabular-nums` and right-aligned.
- Row state is a `StatusBadge`. Bulk actions go in Medusa's `CommandBar`.
- Show `NoRecords` when nothing exists yet and `NoResults` when a filter matches nothing.

### Create = FocusModal

Creating a resource (chatbot, skill, tool, knowledge item, clone) opens a full-screen **`RouteFocusModal`** on its own route, such as `/:workspaceSlug/chatbot/create`. Also use one for edits that need a wide editor, such as skill steps.

- **Header**: close button and `esc` only. The title lives in the body.
- **Body**: one centred column, `max-w-[720px]`, `gap-y-6` to `gap-y-8`, padding `px-6 py-10`. It starts with `Heading` and one `fg-subtle` sentence, then the fields (`gap-y-4`).
- **Footer**: right-aligned, `gap-x-2`. Cancel (`secondary`, small, inside `RouteFocusModal.Close`), then the create action (`primary`, small, `type="submit"`, `isLoading`). The create button names the thing it creates: "Tạo trợ lý", not "Lưu".
- **On success**: `toast.success`, then `handleSuccess()` from `useRouteModal()`, or `handleSuccess(path)` to land on the new resource.
- A flow that must not close on a stray Escape calls `setCloseOnEscape(false)`. A dialog opened from inside uses `StackedFocusModal` / `StackedDrawer`.

The shape to follow (the existing `skill-create` predates it and differs in details):

```tsx
<RouteFocusModal>
  <RouteFocusModal.Form form={form}>
    <KeyboundForm onSubmit={onSubmit} className="flex h-full flex-col">
      <RouteFocusModal.Header />
      <RouteFocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
        <div className="flex w-full max-w-[720px] flex-col gap-y-6 px-6 py-10">
          <Heading>{t("skills.create.title")}</Heading>
          {/* Form.Field items */}
        </div>
      </RouteFocusModal.Body>
      <RouteFocusModal.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <RouteFocusModal.Close asChild>
            <Button size="small" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </RouteFocusModal.Close>
          <Button size="small" type="submit" isLoading={isPending}>
            {t("actions.create")}
          </Button>
        </div>
      </RouteFocusModal.Footer>
    </KeyboundForm>
  </RouteFocusModal.Form>
</RouteFocusModal>
```

### Edit = Drawer

Editing an existing resource's fields (profile, workspace, customer, tag, a chatbot settings section) opens a **`RouteDrawer`** from the right on its own route, such as `/settings/profile/edit`, with the detail page still visible behind it. This fits short forms, up to about eight fields in the 560px column.

- **Header**: `RouteDrawer.Title asChild` around `Heading`, plus a `RouteDrawer.Description` (it can be `sr-only`).
- **Body**: `flex flex-1 flex-col gap-y-4 overflow-y-auto`. While the record loads, render the header and a `FormSkeleton` so the drawer opens at once. Render the form only after the data arrives, with `defaultValues` from the record.
- **Footer**: right-aligned, `gap-x-2`. Cancel (`secondary`, small, inside `RouteDrawer.Close`), then Save (`primary`, small, `type="submit"`, `isLoading`).
- **On success**: `toast.success` ("Đã lưu hồ sơ"), then `handleSuccess()`.
- Delete never lives in the drawer. It goes in the detail page's action menu, behind `usePrompt`.

Reference implementations: `routes/profile/profile-edit`, `routes/workspace/workspace-edit`.

**Both overlays** close back to the parent route (`prev`, default `..`), and their `.Form` wrapper blocks leaving a dirty form with an unsaved-changes Prompt. `KeyboundForm` adds ⌘/Ctrl + Enter to submit.

### Forms

- Build with `Form` from `@repo/ui/common-components` (react-hook-form + zod). Error messages come from the schema and say how to fix the problem.
- Fields stack with `gap-y-4`. Two short fields may share a row (`grid-cols-2 gap-x-3`) and collapse to one column on mobile.

### Feedback and loading

- Mutations report through `toast`. Persistent problems use an `Alert`. Loading uses `Skeleton`.
- Don't add explanatory alerts to cards that already show their state (the plan card shows its Meter, not an alert).

### Usage and quotas

- Every "how full is it" bar is a `Meter` with tones at 80% and 100%, plus the number in text. Task progress (uploads, syncs) is a progress bar.

### Conversations

- An inbox row shows the channel logo, the customer name (`txt-compact-small-plus`), a one-line preview (`txt-compact-small`, `fg-subtle`, truncated) and a status pill that stays on one line ("Chờ bạn", "Bot trả lời").
- Chat bubbles are a **deliberate exception** to the token-only rule: `apps/app/src/styles/chat-bubble.css` (`chat-bubble` plus `--customer`, `--bot` or `--operator`) draws them as gradients with their own shadows and 14px / 1.625 text, and re-points the `fg`/`bg`/`border` tokens inside coloured bubbles so markdown stays readable. Customer is a soft neutral, the bot is blue, staff is dark neutral so a staff reply never reads as the bot. Change bubbles only in that file.

### Channels

- A channel is always shown as its real logo plus its name. Connected is green, needs reconnect is orange, failed is red, each shown with a `StatusBadge`.

## 10. States

| State           | How                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Hover / pressed | The surface's `-hover` / `-pressed` token (`bg-ui-bg-base-hover`). Gate hover-only effects with `@media (hover: hover) and (pointer: fine)`. |
| Focus           | Medusa primitives carry their own `*-focus` shadow; custom focusables use `shadow-borders-focus`. Never remove focus styling.                |
| Disabled        | `bg-disabled` + `fg-disabled`, plus a `ConditionalTooltip` saying why.                                                                       |
| Loading         | Button `isLoading`; sections use `Skeleton` in the shape of the content.                                                                     |
| Empty           | `NoRecords` with one action.                                                                                                                 |
| Error           | Field: `fg-error` text + `shadow-borders-error`. Page: `Alert variant="error"`. Mutation: `toast.error`.                                     |

## 11. Checklist before you open a UI PR

- [ ] Only `ui-` tokens: no hex, no raw palette classes, no inline colour styles.
- [ ] Text uses `Text` / `Heading` / `txt-*`, not `text-xs` / `text-sm`.
- [ ] Checked in `vi` and `en`, light and dark, and at 390px wide.
- [ ] State shown with a word or icon, not colour alone.
- [ ] Create flows use `RouteFocusModal`, edit flows use `RouteDrawer`, destructive actions use `usePrompt`.
- [ ] Usage bars use `Meter`.
- [ ] No em dash in any user-facing string or prompt template.
- [ ] Screenshots attached to the PR.
