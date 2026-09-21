---
applyTo: "apps/app/**/*.{ts,tsx}"
description: "React app overview: stack, component conventions, and best practices for apps/app"
---

# React App Instructions

Overview of `apps/app` conventions. Detailed patterns live in sibling instruction files:

- **Data fetching** (TanStack Query, loaders, API client): `data-fetching.instructions.md`
- **Forms** (React Hook Form + Zod): `forms.instructions.md`
- **Routing & modals** (React Router v7, create/edit pages): `routing-and-modals.instructions.md`
- **State & authorization** (Jotai + CASL): `state-and-authorization.instructions.md`
- **i18n**: see `.claude/rules/i18n.md`

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.x
- **UI Components**: `@medusajs/ui`, `@repo/ui/common-components`, Radix UI, `@tabler/icons-react`
- **State Management**: Jotai
- **Data Fetching**: TanStack Query v5
- **Forms**: React Hook Form + Zod (`zod/v4`) via `zodResolver`
- **Routing**: React Router DOM v7 (data router + lazy route modules)
- **Authorization**: `@casl/react`
- **i18n**: `react-i18next`
- **API Client**: generated client from `@repo/client`

## Component Structure

Always use function components with typed props:

```typescript
import { FC } from "react";

interface UserCardProps {
  user: User;
  onUpdate?: (user: User) => void;
  className?: string;
}

export const UserCard: FC<UserCardProps> = ({ user, onUpdate, className }) => {
  return (
    <div className={className}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};
```

### Route folder layout

Each route feature is a folder under `apps/app/src/routes/<feature>/`, with one subfolder per page and an `index.ts` barrel that re-exports the page as `Component` (and `loader`/`Breadcrumb` when present):

```
routes/chatbot/
├── chatbot-list/          # list page (+ loader.ts)
├── chatbot-create/        # create page (RouteFocusModal)
├── chatbot-details/       # detail page (+ loader.ts, breadcrumb.tsx)
├── chatbot-edit/          # edit page
├── components/            # shared feature components (e.g. chatbot-form)
├── constants.ts
└── schemas.ts             # Zod schemas + inferred form types
```

```typescript
// chatbot-create/index.ts
export { ChatbotCreate as Component } from "./chatbot-create";

// chatbot-list/index.ts
export { ChatbotList as Component } from "./chatbot-list";
export { chatbotLoader } from "./loader";
```

## Best Practices

1. **Use TypeScript** — type all props, state, and functions.
2. **Atomic components** — keep components small and focused.
3. **Custom hooks** — extract reusable logic, especially API access (see `data-fetching`).
4. **Loading & error states** — always handle `isLoading` / `isError` from queries.
5. **Query keys** — use the `queryKeysFactory` pattern (see `data-fetching`).
6. **Forms** — use Zod schemas + `zodResolver` and the `@repo/ui` `Form` components (see `forms`).
7. **Memoization** — use `useMemo` / `useCallback` where it prevents real re-renders.
8. **Accessibility** — semantic HTML and ARIA; modals provide `sr-only` Title/Description.
9. **Code splitting** — routes are lazy-loaded via `lazy: () => import(...)` (see `routing-and-modals`).
10. **i18n** — never hardcode user-facing strings; use `t()` (see `.claude/rules/i18n.md`).
