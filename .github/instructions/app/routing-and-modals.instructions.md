---
applyTo: "apps/app/src/routes/**/*.{ts,tsx}"
description: "Routing (React Router v7 lazy modules) and the create/edit modal patterns (RouteFocusModal vs RouteDrawer) for apps/app"
---

# Routing & Modals

`apps/app` uses **React Router DOM v7** as a data router. Routes are configured in `apps/app/src/routes/route.tsx` and pages are **lazy route modules** — not inline `element:` JSX.

## Route configuration

Register children with `lazy: () => import("./feature/page")`, where the page's `index.ts` exports `Component` (and optionally `loader` / `Breadcrumb`). Use `loader` for data prefetch and `handle.breadcrumb` for breadcrumbs.

```typescript
{
  path: ROUTES.Chatbot,
  handle: { breadcrumb: () => t("chatbot.title") },
  ErrorBoundary: ErrorBoundary,
  children: [
    { path: "", lazy: () => import("./chatbot/chatbot-list") },
    { path: "create", lazy: () => import("./chatbot/chatbot-create") },
    {
      path: ":id",
      lazy: async () => {
        const { loader, Breadcrumb, Component } = await import("./chatbot/chatbot-details");
        return {
          Component,
          loader,
          handle: { breadcrumb: (m: UIMatch<ChatbotGetDetailResponseDto>) => <Breadcrumb {...m} /> },
        };
      },
    },
    { path: ":id/edit", lazy: () => import("./chatbot/chatbot-edit") },
  ],
}
```

### Loaders

Loaders read from / prime the shared `queryClient` so the page renders instantly and TanStack Query keeps ownership of the cache:

```typescript
// chatbot-list/loader.ts
export const chatbotLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = chatbotListQuery();
  const workspace = getWorkspaceParams(params);
  const cached = queryClient.getQueryData(query.queryKey);
  return (
    cached ??
    queryClient.fetchQuery({
      queryKey: query.queryKey,
      queryFn: () => query.queryFn(workspace.workspaceSlug),
    })
  );
};
```

## Create vs. Edit modal pattern

Create and edit pages are rendered as **route-driven modals**. The modal type signals intent:

| Page   | Wrapper           | Source                                 | Why                                 |
| ------ | ----------------- | -------------------------------------- | ----------------------------------- |
| Create | `RouteFocusModal` | `components/modals/route-focus-modal/` | Full-screen focus for new resources |
| Edit   | `RouteDrawer`     | `components/modals/route-drawer/`      | Side drawer for editing a resource  |

Both come from `@/components/modals` and provide compound parts plus a `.Form` that bridges React Hook Form into the modal. Closing the modal navigates back to `prev`.

> **Exception**: a create _and_ edit flow that share one large form (e.g. `chatbot`) may both use `RouteFocusModal` because the form needs the space. The default for a simple edit is `RouteDrawer`.

### Create page — `RouteFocusModal`

```typescript
// chatbot-create/chatbot-create.tsx
import { RouteFocusModal } from "@/components/modals";

export function ChatbotCreate() {
  return (
    <RouteFocusModal>
      <ChatbotCreateForm />
    </RouteFocusModal>
  );
}
```

Inside the form component, wrap with `RouteFocusModal.Form` + `KeyboundForm`, and use `Header` / `Body`:

```typescript
<RouteFocusModal.Form form={form}>
  <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
    <RouteFocusModal.Header>
      <div className="flex items-center justify-end gap-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{cancelText}</Button>
        <Button type="submit" isLoading={isPending}>{submitText}</Button>
      </div>
    </RouteFocusModal.Header>
    <RouteFocusModal.Body className="flex flex-col items-center p-16 overflow-auto">
      {/* Form.Field rows */}
    </RouteFocusModal.Body>
  </KeyboundForm>
</RouteFocusModal.Form>
```

### Edit page — `RouteDrawer`

```typescript
// e.g. knowledge-item-edit form
import { RouteDrawer, useRouteModal } from "@/components/modals";

<RouteDrawer.Form form={form}>
  <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
    <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
      {/* Form.Field rows */}
    </RouteDrawer.Body>
    <RouteDrawer.Footer>
      <Button variant="secondary" onClick={onClose}>{t("actions.cancel")}</Button>
      <Button type="submit" isLoading={updateMutation.isPending}>{t("actions.save")}</Button>
    </RouteDrawer.Footer>
  </KeyboundForm>
</RouteDrawer.Form>
```

`RouteDrawer` exposes `Form`, `Header`, `Title`, `Description`, `Body`, `Footer`, `Close`. `RouteFocusModal` exposes the same set (with a full-screen `Header`/`Body`). Provide `sr-only` `Title`/`Description` for accessibility when there is no visible header text.

### `useRouteModal().handleSuccess`

After a successful mutation, call `handleSuccess()` to navigate back to the previous route (it sets `state.isSubmitSuccessful`). Pair it with a toast:

```typescript
const { handleSuccess } = useRouteModal();

const handleSubmit = async (data) => {
  try {
    await updateMutation.mutateAsync(data);
    handleSuccess();
    toast.success(t("...success"));
  } catch (e) {
    toast.error(t("...error"));
  }
};
```

### Sharing one form between create & edit

Extract a presentational `<FeatureForm>` (in `routes/<feature>/components/`) that takes `defaultValues`, `onSubmit`, `onCancel`, `isPending`, and label props. The create page passes create defaults + a create mutation; the edit page seeds `defaultValues` from the fetched resource and passes an update mutation.
