---
applyTo: "**/*.{ts,tsx}"
description: "TypeScript coding standards and conventions across the entire repository"
---

# TypeScript Instructions

## Configuration

### Strict Mode

All TypeScript configs must use strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Type Definitions

### Prefer Interfaces Over Types

For object shapes, prefer interfaces:

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ Avoid (for simple objects)
type User = {
  id: string;
  name: string;
  email: string;
};
```

Use types for unions, intersections, and utilities:

```typescript
// ✅ Good
type Status = "pending" | "active" | "inactive";
type UserWithRole = User & { role: Role };
type Optional<T> = T | null | undefined;
```

### Explicit Return Types

Always specify return types for functions:

```typescript
// ✅ Good
function getUser(id: string): Promise<User> {
  return apiClient.getUser(id);
}

// ❌ Avoid
function getUser(id: string) {
  return apiClient.getUser(id);
}
```

### Avoid Any

Never use `any`. Use `unknown` if the type is truly unknown:

```typescript
// ❌ Avoid
function process(data: any): void {
  console.log(data);
}

// ✅ Good
function process(data: unknown): void {
  if (typeof data === "string") {
    console.log(data.toUpperCase());
  }
}
```

## Naming Conventions

### Variables and Functions

Use camelCase:

```typescript
const userName = 'John';
const getUserById = (id: string) => { ... };
```

### Classes and Interfaces

Use PascalCase:

```typescript
class UserService { ... }
interface UserRepository { ... }
```

### Enums

Use PascalCase with ENUM\_ prefix:

```typescript
enum ENUM_USER_STATUS {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  PENDING = "PENDING",
}
```

### Constants

Use UPPER_SNAKE_CASE:

```typescript
const MAX_RETRY_COUNT = 3;
const DATABASE_CONNECTION_NAME = "default";
```

### Type Parameters

Use descriptive names, not just T:

```typescript
// ✅ Good
interface Repository<TEntity> {
  find(id: string): Promise<TEntity>;
}

// ❌ Avoid (unless very simple)
interface Repository<T> {
  find(id: string): Promise<T>;
}
```

## Type Assertions

### Use Type Guards

Prefer type guards over assertions:

```typescript
// ✅ Good
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" && obj !== null && "id" in obj && "email" in obj
  );
}

if (isUser(data)) {
  console.log(data.email); // Type-safe
}

// ❌ Avoid
const user = data as User; // Unsafe
```

### As const

Use `as const` for literal types:

```typescript
// ✅ Good
const routes = {
  HOME: "/",
  USERS: "/users",
  SETTINGS: "/settings",
} as const;

type Route = (typeof routes)[keyof typeof routes]; // '/' | '/users' | '/settings'
```

## Generics

### Type Constraints

Use constraints for generic types:

```typescript
// ✅ Good
function getProperty<TObj extends object, TKey extends keyof TObj>(
  obj: TObj,
  key: TKey,
): TObj[TKey] {
  return obj[key];
}

// Usage
const user = { id: "1", name: "John" };
const name = getProperty(user, "name"); // Type: string
```

### Default Type Parameters

```typescript
interface Response<TData = unknown> {
  data: TData;
  status: number;
}

// Can use without specifying TData
const response: Response = { data: "anything", status: 200 };
```

## Utility Types

### Built-in Utilities

Leverage TypeScript utility types:

```typescript
// Partial - all properties optional
type PartialUser = Partial<User>;

// Required - all properties required
type RequiredUser = Required<User>;

// Pick - select specific properties
type UserCredentials = Pick<User, "email" | "password">;

// Omit - exclude specific properties
type UserWithoutPassword = Omit<User, "password">;

// Record - create object type
type UserMap = Record<string, User>;

// ReturnType - extract return type
type UserPromise = ReturnType<typeof getUser>; // Promise<User>
```

### Custom Utilities

```typescript
// Make specific properties optional
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Nullable
type Nullable<T> = T | null;

// NonNullableFields
type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};
```

## Type Imports

Use `type` imports when importing only types:

```typescript
// ✅ Good
import type { User, Role } from "./types";
import { UserService } from "./user.service";

// ❌ Avoid (mixes types and values)
import { User, Role, UserService } from "./types";
```

## Discriminated Unions

Use discriminated unions for variants:

```typescript
type Success<T> = {
  status: "success";
  data: T;
};

type Error = {
  status: "error";
  message: string;
};

type Result<T> = Success<T> | Error;

function handleResult<T>(result: Result<T>): void {
  if (result.status === "success") {
    console.log(result.data); // Type: T
  } else {
    console.error(result.message); // Type: string
  }
}
```

## Module Declaration

### Augment Modules

```typescript
// Augment Express Request
declare module "express" {
  interface Request {
    user?: User;
  }
}
```

### Global Types

```typescript
// global.d.ts
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export {};
```

## Best Practices

1. **Enable strict mode** - Catch errors early
2. **Explicit types** - Don't rely on inference for public APIs
3. **Type guards** - Use instead of type assertions
4. **Discriminated unions** - For variant types
5. **Utility types** - Leverage built-in utilities
6. **No any** - Use unknown or proper types
7. **Const assertions** - For literal types
8. **Interface extension** - Prefer over intersection for objects
9. **Type imports** - Use `import type` for type-only imports
10. **Document complex types** - Add JSDoc for complex type definitions

## Type Documentation

```typescript
/**
 * Represents a user in the system.
 *
 * @property id - Unique identifier
 * @property email - User's email address
 * @property role - User's role for authorization
 */
interface User {
  id: string;
  email: string;
  role: Role;
}

/**
 * Fetches a user by their ID.
 *
 * @param id - The user's unique identifier
 * @returns A promise that resolves to the user
 * @throws {NotFoundException} If the user doesn't exist
 */
function getUser(id: string): Promise<User> {
  // ...
}
```
