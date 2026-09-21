# Component Composition

## Contents

- Items always inside their Group component
- Use asChild (Radix) or render (Base UI) for custom triggers
- Callouts use Alert
- Empty states use Empty component
- Toast notifications follow the project base
- Choosing between routes
- Dialog, Sheet, and Drawer always need a Title
- Detail page sections (heading / general / reference)
- Button has no isPending or isLoading prop
- TabsTrigger must be inside TabsList
- Avatar always needs AvatarFallback
- Use Separator instead of raw hr or border divs
- Use Skeleton for loading placeholders
- Use Badge instead of custom styled spans

---

## Items always inside their Group component

Never render items directly inside the content container.

**Incorrect:**

```tsx
<SelectContent>
  <SelectItem value="apple">Apple</SelectItem>
  <SelectItem value="banana">Banana</SelectItem>
</SelectContent>
```

**Correct:**

```tsx
<SelectContent>
  <SelectGroup>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
  </SelectGroup>
</SelectContent>
```

This applies to all group-based components:

| Item                                                       | Group                    |
| ---------------------------------------------------------- | ------------------------ |
| `SelectItem`, `SelectLabel`                                | `SelectGroup`            |
| `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSub` | `DropdownMenuGroup`      |
| `MenubarItem`                                              | `MenubarGroup`           |
| `ContextMenuItem`                                          | `ContextMenuGroup`       |
| `CommandItem`                                              | `CommandGroup`           |
| `MessageScrollerItem`                                      | `MessageScrollerContent` |
| `Message` (consecutive, same sender)                       | `MessageGroup`           |
| `Bubble` (stacked)                                         | `BubbleGroup`            |
| `Attachment` (in a row)                                    | `AttachmentGroup`        |

Chat components nest in a fixed order (`MessageScrollerProvider` → `MessageScroller` → `MessageScrollerViewport` → `MessageScrollerContent` → `MessageScrollerItem`). See [chat.md](./chat.md).

---

## Use asChild (Radix) or render (Base UI) for custom triggers

- **Radix-based components** (`@medusajs/ui`, `@repo/ui/components` wrappers) expose `asChild` — pass your own trigger element so the component controls its events and aria attributes:

```tsx
<DropdownMenu.Trigger asChild>
  <IconButton variant="transparent">
    <EllipsisHorizontal />
  </IconButton>
</DropdownMenu.Trigger>
```

- **Base UI-based components** (`@repo/ui/common-components`) use a `render` prop instead — e.g. `Marker render={<button … />}`, `Form.Field render={({ field }) => …}`. When unsure whether a component is Radix or Base UI, check the `base` field from `npx shadcn@latest info` for the component.

---

## Callouts use Alert

```tsx
<Alert>
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>Something needs attention.</AlertDescription>
</Alert>
```

---

## Empty states use Empty component

For tables, use `_DataTable` with the `noRecords` prop — it renders the shared `NoRecords` component from `@repo/ui/common-components`:

```tsx
<_DataTable
  noRecords={{
    message: t("accounts.list.noRecordsMessage"),
  }}
/>
```

For container sections (`Container` with a heading and a list body), render a dedicated empty component in the body when the collection is empty:

```tsx
<Container className="divide-y p-0">
  <div className="flex items-start justify-between px-6 pt-4 pb-2">
    <Heading level="h3">{title}</Heading>
  </div>
  <div className="px-6 py-4 flex flex-col gap-6">
    {accounts.length > 0 ? (
      accounts.map((acc) => (
        <div key={acc.id} className="group flex items-center justify-between">
          {/* row */}
        </div>
      ))
    ) : (
      <AccountListEmpty chatbotId={item.id} />
    )}
  </div>
</Container>
```

Keep the empty state in its own component (`[section]-empty.tsx`). Structure: icon in a `rounded-full bg-ui-bg-field p-6` circle, `Text weight="plus" size="xlarge"` title, `Text size="small"` description with `text-ui-fg-subtle`, and an optional CTA. When the CTA opens a route modal (e.g. edit), use `Link` with `state={{ prev }}` so closing navigates back to the parent route:

```tsx
// account-list-empty.tsx
export function AccountListEmpty({
  chatbotId,
  className,
}: AccountListEmptyProps) {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  // Navigate to edit page with return path to chatbot details (the parent route)
  const editUrl = `/${workspaceSlug}/${ROUTES.Chatbot}/${chatbotId}/edit`;
  const prevPath = `/${workspaceSlug}/${ROUTES.Chatbot}/${chatbotId}`;

  return (
    <div
      className={clx(
        "flex flex-col gap-4 items-center justify-center py-12",
        className,
      )}
    >
      <div className="rounded-full bg-ui-bg-field p-6">
        <IconUsers size={64} className="text-ui-fg-muted" />
      </div>
      <div className="space-y-4 text-center">
        <div className="space-y-1">
          <Text weight="plus" size="xlarge">
            {t("chatbot.details.noAccounts", "No Accounts")}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            {t(
              "chatbot.details.noAccountsDescription",
              "No Facebook accounts linked to this chatbot yet.",
            )}
          </Text>
        </div>
        <Link
          to={editUrl}
          state={{ prev: prevPath }}
          className={buttonVariants({ variant: "primary", size: "small" })}
        >
          {t("actions.edit", "Edit Chatbot")}
        </Link>
      </div>
    </div>
  );
}
```

---

## Toast notifications follow the project base

For Base UI projects, use the `toast` component:

```tsx
import { toast } from "@/components/ui/toast";

toast.add({
  title: "Changes saved.",
});
```

For Radix and React Aria projects, use Sonner:

```tsx
import { toast } from "sonner";

toast.success("Changes saved.");
toast.error("Something went wrong.");
toast("File deleted.", {
  action: { label: "Undo", onClick: () => undoDelete() },
});
```

---

## Choosing between routes

Prefer router-driven modals over locally-controlled overlay components. A route modal is rendered on its own route (lazy-loaded in `routes/route.tsx`), so it is deep-linkable, survives refresh, and closing it navigates back to the page that opened it (`prev`, default `..`).

| Use case                                                    | Route component                                       |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| Create a resource — multi-step or space-heavy form          | `RouteFocusModal`                                     |
| Edit an existing resource — short form                      | `RouteDrawer`                                         |
| Nested sub-form inside a route modal                        | `StackedFocusModal` / `StackedDrawer`                 |
| Quick action, confirmation, or hover info that needs no URL | Local overlay (`Popover`, `AlertDialog`, `HoverCard`) |

- Register the modal as its own route: `create` under the list route, `edit` under the detail route. The parent page must render `<Outlet />` so the modal mounts. See [react-router.md](../references/react-router.md).
- After a successful mutation, call `useRouteModal().handleSuccess(path?)` and show a toast.
- Keep `Dialog`, `Sheet`, and `Drawer` imports out of feature code — they are wrapped by the route components above.

---

## Dialog, Sheet, and Drawer always need a Title

`DialogTitle`, `SheetTitle`, `DrawerTitle` are required for accessibility. Use `className="sr-only"` if visually hidden.

```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>Edit Profile</DialogTitle>
    <DialogDescription>Update your profile.</DialogDescription>
  </DialogHeader>
  ...
</DialogContent>
```

---

## Detail page sections

Detail pages (inside `TwoColumnPage.Main` / `TwoColumnPage.Sidebar`) are composed of `Container` sections. There are three section types — each stays in its own component under `components/<feature>-<section>/`:

### 1. Heading section — name + actions

The first section of the page: entity name, subtitle, and row actions.

```tsx
// account-general-section.tsx
<Container className="divide-y p-0">
  <div className="flex items-center justify-between px-6 py-4">
    <div className="flex flex-col gap-y-1">
      <Heading>{item.name}</Heading>
      <Text size="small" leading="compact" className="text-ui-fg-muted">
        {item.link}
      </Text>
    </div>
    <div className="flex items-center gap-x-4">
      <AccountStatusCell status={item.status} />
      <AccountActions item={item} />
    </div>
  </div>
</Container>
```

### 2. General section — entity properties

Read-only label/value rows using `Section` + `SectionRow` from `@repo/ui/common-components`. Group long property lists into collapsible `Accordion.Item`s; keep the most important properties (name, type, status, timestamps) in the top `Section`.

```tsx
// chatbot-summary-section.tsx
<Container className="p-0">
  <div className="flex flex-col gap-y-1 px-6 py-4 border-b">
    <Heading>{t("chatbot.details.summary.title")}</Heading>
  </div>

  <Section variant="spaced">
    <SectionRow title={t("fields.name")} value={item.name} />
    <SectionRow
      title={t("fields.status")}
      value={<ChatbotStatusCell item={item} />}
    />
    <SectionRow
      title={t("fields.createdAt")}
      value={getFullDate(new Date(item.createdAt))}
    />
  </Section>

  <Accordion type="multiple" className="border-t border-ui-border-base">
    <Accordion.Item value="behavior">
      <Accordion.Header className="px-6 py-3 text-sm font-medium">
        {t("chatbot.details.summary.behaviorSection")}
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down !pl-0 !pr-0">
        <Section variant="spaced">
          <SectionRow
            title={t("chatbot.details.typingIndicator")}
            value={<Switch checked={item.typingIndicator} />}
          />
        </Section>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion>
</Container>
```

`SectionRow` takes `title`, `value` (string or node), and optional `actions`. Editable values (toggles, links, tooltips) are rendered as the `value` node.

### 3. Reference section — connected entities

Shows entities related to the current one. Three flavors:

| Flavor        | Example                            | Behavior                                                                                                                                                                                                                |
| ------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Readonly      | `account-chatbot-section`          | Renders the linked entity; return `null` when there is no relation (`if (isLoading \|\| !chatbot) return null`)                                                                                                         |
| Connectable   | `AccountList` (chatbot → accounts) | Header with title + count, actions to add (`PlusMini` → drawer) and link out (`ArrowUpRightOnBox`); rows with status badge and hover-revealed unlink; empty state per [Empty states](#empty-states-use-empty-component) |
| Link + toggle | `ChatbotSkillsTab`                 | Rows with a `Switch` to enable/disable the connection and a detach action; explicit loading / error / empty states                                                                                                      |

```tsx
// chatbot-skills-tab.tsx — toggle flavor
<Container className="p-0">
  <div className="px-6 py-4 border-b flex items-center justify-between gap-4">
    <div className="min-w-0">
      <Heading level="h3" className="text-lg font-semibold">
        {t("skills.chatbotTab.title")}
      </Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {t("skills.chatbotTab.subtitle")}
      </Text>
    </div>
    <Button
      size="small"
      variant="secondary"
      onClick={() => setDrawerOpen(true)}
    >
      <PlusMini />
      {t("actions.add")}
    </Button>
  </div>

  <ul className="divide-y divide-ui-border-base">
    {chatbotSkills.map((skill) => (
      <li
        key={skill.id}
        className="flex items-center justify-between gap-3 px-6 py-3"
      >
        <div className="min-w-0">
          <span className="txt-compact-small font-medium">{skill.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={skill.enabled}
            onCheckedChange={(v) => handleToggle(skill.id, v)}
          />
          <IconButton
            size="small"
            variant="transparent"
            onClick={() => handleDetach(skill.id)}
          >
            <Trash />
          </IconButton>
        </div>
      </li>
    ))}
  </ul>
</Container>
```

Connection mutations go through API hooks (`useLinkChatbotAccount`, `useToggleSkillOnChatbot`, …) with toast feedback on success/error; never optimistic inline state.

---

## Button has no isPending or isLoading prop

Compose with `Spinner` + `data-icon` + `disabled`:

```tsx
<Button disabled>
  <Spinner data-icon="inline-start" />
  Saving...
</Button>
```

---

## TabsTrigger must be inside TabsList

Never render `TabsTrigger` directly inside `Tabs` — always wrap in `TabsList`:

```tsx
<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">...</TabsContent>
</Tabs>
```

---

## Avatar always needs AvatarFallback

Always include `AvatarFallback` for when the image fails to load:

```tsx
<Avatar>
  <AvatarImage src="/avatar.png" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

---

## Use existing components instead of custom markup

| Instead of                                         | Use                                  |
| -------------------------------------------------- | ------------------------------------ |
| `<hr>` or `<div className="border-t">`             | `<Separator />`                      |
| `<div className="animate-pulse">` with styled divs | `<Skeleton className="h-4 w-3/4" />` |
| `<span className="rounded-full bg-green-100 ...">` | `<Badge variant="secondary">`        |
