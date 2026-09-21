---
applyTo: "packages/client/**/*.ts"
description: "Generated API client from OpenAPI specification"
---

# API Client Package Instructions

## Overview

The API client is automatically generated from the OpenAPI specification using `openapi-ts`.

## Generation

Run this command to regenerate the client:

```bash
pnpm generate:client
```

This reads the OpenAPI spec from the API and generates TypeScript types and client code.

## Usage

```typescript
import { client } from "@eccho/client";

// Configure client
client.setConfig({
  baseUrl: "http://localhost:3000",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Use generated endpoints
const response = await client.getUser({ id: "123" });
const users = await client.listUsers({ page: 1, perPage: 10 });
```

## Type Safety

The generated client provides full TypeScript support:

```typescript
import type { UserEntity, UserCreateDto } from "@eccho/client";

const createUser = async (dto: UserCreateDto): Promise<UserEntity> => {
  const response = await client.createUser({ body: dto });
  return response.data;
};
```

## Error Handling

```typescript
try {
  const user = await client.getUser({ id: userId });
} catch (error) {
  if (error.status === 404) {
    console.error("User not found");
  } else if (error.status === 401) {
    console.error("Unauthorized");
  }
}
```

## Best Practices

1. **Regenerate regularly** - Keep client in sync with API changes
2. **Don't edit manually** - Client is auto-generated
3. **Use types** - Leverage generated TypeScript types
4. **Configure globally** - Set baseUrl and headers once
5. **Handle errors** - Check error status codes
6. **Version compatibility** - Ensure API and client versions match
