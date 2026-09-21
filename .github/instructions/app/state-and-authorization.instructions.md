---
applyTo: "apps/app/**/*.{ts,tsx}"
description: "Client state (Jotai) and authorization (CASL) patterns for apps/app"
---

# State & Authorization

> Server state belongs in TanStack Query (see `data-fetching.instructions.md`). Use Jotai only for **client** state.

## State Management with Jotai

```typescript
import { atom } from "jotai";

// Simple atom
export const userAtom = atom<User | null>(null);

// Derived atom
export const userNameAtom = atom((get) => get(userAtom)?.name ?? "Guest");
```

Use in components:

```typescript
import { useAtom, useAtomValue, useSetAtom } from "jotai";

const [user, setUser] = useAtom(userAtom); // read + write
const userName = useAtomValue(userNameAtom); // read only
const setUser = useSetAtom(userAtom); // write only
```

## Authorization with CASL

Define abilities and expose a contextual `<Can>`:

```typescript
import { createContext } from "react";
import { createContextualCan } from "@casl/react";
import { AbilityBuilder, PureAbility } from "@casl/ability";

type Actions = "read" | "create" | "update" | "delete";
type Subjects = "User" | "Post" | "all";
export type AppAbility = PureAbility<[Actions, Subjects]>;

export const AbilityContext = createContext<AppAbility>(undefined!);
export const Can = createContextualCan(AbilityContext.Consumer);

export const buildAbility = (permissions: Permission[]): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(PureAbility);
  permissions.forEach((p) => can(p.action, p.subject));
  return build();
};
```

Use in components — `<Can>` for rendering, `ability.can(...)` for logic:

```typescript
import { useAbility } from "@casl/react";

const ability = useAbility(AbilityContext);

<Can I="update" a="User">
  <button>Edit</button>
</Can>;

{ability.can("delete", "User") && <button>Delete</button>}
```
