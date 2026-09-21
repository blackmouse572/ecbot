# React Router v7 (data mode) — ecbot conventions

ecbot's own version of the [react-router-data-mode skill](https://github.com/remix-run/agent-skills/blob/main/skills/react-router-data-mode/SKILL.md). We use the **data router** (lazy modules, `loader`, `handle.breadcrumb`, `ErrorBoundary`) but **deliberately skip** its mutation stack — no `action` / `<Form method>` / `useFetcher`. ecbot mutates through **TanStack Query mutation hooks** ([tanstack-query.md](tanstack-query.md)). The live router tree is `apps/app/src/routes/route.tsx`; read it for the current shape. Source of record: `.github/instructions/app/routing-and-modals.instructions.md`.

## Route Constants

Always use the `ROUTES` constant from `@apps/app/src/routes/constants.ts` for type-safe route management. Never hardcode route strings.

```typescript
import { ROUTES } from "@/routes/constants";

// ✅ Good
<Link to={`/${workspaceSlug}/${ROUTES.Chatbot}`}>Chatbot</Link>

// ❌ Avoid
<Link to={`/${workspaceSlug}/chatbot`}>Chatbot</Link>
```

## Breadcrumbs

### Static Breadcrumb (constant label)

For routes with a constant breadcrumb label, define it directly in `handle.breadcrumb` inside `route.tsx`:

```typescript
{
  path: ROUTES.Chatbot,
  handle: {
    breadcrumb: () => t("chatbot.title"),
  },
  lazy: () => import("./chatbot"),
}
```

### Dynamic Breadcrumb (data-driven label)

For routes where the breadcrumb depends on fetched data (e.g., detail pages), export a `Breadcrumb` component from the route's `index.ts` and use it in `route.tsx`:

```typescript
// In route.tsx (lazy-loaded):
{
  lazy: async () => {
    const { loader, Breadcrumb, Component } = await import("./accounts/accounts-details");
    return {
      loader,
      Component,
      handle: {
        breadcrumb: (match: UIMatch<AccountGetDetailResponseDto>) => (
          <Breadcrumb {...match} />
        ),
      },
    };
  },
}
```

```typescript
// breadcrumb.tsx — fetches data via hook and renders the label
import { useAccount } from "@/hooks/api";
import type { AccountGetDetailResponseDto } from "@repo/client";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";

type AccountDetailBreadcrumbProps = UIMatch<AccountGetDetailResponseDto>;

export const AccountDetailBreadcrumb = (props: AccountDetailBreadcrumbProps) => {
  const { id } = props.params || {};
  const { account } = useAccount(id!, { initialData: props.data, enabled: Boolean(id) });

  if (!account) return null;

  return (
    <span>
      {account.name}
      <Helmet>
        <title>{account.name} - Ecbot</title>
      </Helmet>
    </span>
  );
};
```

```typescript
// index.ts
export { AccountDetails as Component } from "./account-details";
export { AccountDetailBreadcrumb as Breadcrumb } from "./breadcrumb";
export { accountDetailsLoader as loader } from "./loader";
```

## Lazy Loading

**Always** lazy-load route components. Never statically import route page components.

```typescript
// ✅ Good
{
  path: ROUTES.Chatbot,
  lazy: () => import("./chatbot"),
}

// ✅ Good (with handle)
{
  lazy: async () => {
    const { loader, Breadcrumb, Component } = await import("./chatbot/chatbot-detail");
    return { loader, Component, handle: { breadcrumb: (match) => <Breadcrumb {...match} /> } };
  },
}

// ❌ Avoid
import { ChatbotList } from "./chatbot/chatbot-list";
{ path: ROUTES.Chatbot, element: <ChatbotList /> }
```

## Page Layout Containers

Use `SingleColumnPage` or `TwoColumnPage` as the main layout container for every page.

```typescript
import { SingleColumnPage } from "@/components/layout/page";
import { TwoColumnPage } from "@/components/layout/page/two-column-page";

// Single column with outlet (default hasOutlet=true)
export function ChatbotList() {
  return (
    <SingleColumnPage>
      <ChatbotListTable />
    </SingleColumnPage>
  );
}

// Two column layout
export function AccountDetails() {
  return (
    <SingleColumnPage>
      <TwoColumnPage>
        <MainSection />
        <SidebarSection />
      </TwoColumnPage>
    </SingleColumnPage>
  );
}
```

- `SingleColumnPage` renders `<Outlet />` by default (`hasOutlet={true}`). Pass `hasOutlet={false}` when the outlet is handled by a nested component.
- `TwoColumnPage` similarly accepts `hasOutlet` prop.

## Route Nesting Conventions

### Edit page → lives inside detail route

```
/:id                   ← detail route (SingleColumnPage with Outlet)
  /edit                ← edit page (RouteDrawer)
```

### Create page → lives inside list route

```
/                      ← list route (list table component with Outlet inside Container)
  /create              ← create page (RouteFocusModal)
```

## Modals for Create and Edit

### Create → `RouteFocusModal` (from `@apps/app/src/components/modals/route-focus-modal/`)

Use `RouteFocusModal` for create routes. The parent list page **must** include `<Outlet />` (via `SingleColumnPage` or directly inside the `Container`).

```typescript
// create-page.tsx
import { RouteFocusModal } from "@/components/modals/route-focus-modal";

export function ChatbotCreate() {
  return (
    <RouteFocusModal>
      <RouteFocusModal.Header>
        <RouteFocusModal.Title>Create Chatbot</RouteFocusModal.Title>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body>
        <ChatbotCreateForm />
      </RouteFocusModal.Body>
    </RouteFocusModal>
  );
}
```

```typescript
// list-table.tsx — must render <Outlet /> so the create modal mounts
export const ChatbotListTable = () => {
  return (
    <Container className="divide-y p-0">
      {/* ... table content ... */}
      <Outlet />
    </Container>
  );
};
```

### Edit → `RouteDrawer` (from `@apps/app/src/components/modals/route-drawer/`)

Use `RouteDrawer` for edit routes. The parent detail page **must** have `<SingleColumnPage>` (which includes `<Outlet />`).

```typescript
// edit-page.tsx
import { RouteDrawer } from "@/components/modals/route-drawer";

export function ChatbotEdit() {
  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title>Edit Chatbot</RouteDrawer.Title>
      </RouteDrawer.Header>
      <RouteDrawer.Body>
        <ChatbotEditForm />
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        {/* actions */}
      </RouteDrawer.Footer>
    </RouteDrawer>
  );
}
```

```typescript
// detail-page.tsx — SingleColumnPage renders <Outlet /> by default
export function ChatbotDetail() {
  return (
    <SingleColumnPage>          {/* hasOutlet=true by default → renders <Outlet /> */}
      <ChatbotGeneralSection />
    </SingleColumnPage>
  );
}
```
