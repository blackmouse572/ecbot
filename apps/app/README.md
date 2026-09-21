# Introduction

This directory contains the Frontend application for End user to interact with Ecbot API. It is built with React 19 and React-router 7.

## Getting Started

### API Routes

The API routes are `axios` based and located at `@packages/client` package. This is automatically generated from the OpenAPI specification.
To generate the API routes, run the following command at root of the project (need to run api first):

```bash
pnpm generate:client --filter=api
```

### Dynamic API Routes

For some api that need to be dynamic, for example `/api/v1/user/:id`, we can use the `buildUrl` function to generate the url. This function takes a string as the first argument and an object as the second argument. The object contains the parameters to be replaced in the url.

```ts
import { client } from "@eccho/client";

const fetchUserDetails = async (id: string) => {
  const url = client.buildUrl("/api/v1/user/:id", { id });
  const response = await client.get(url);
  return response.data;
};
```

### Query Keys

We are using [React Query](https://react-query.tanstack.com/) for data fetching and caching. We have created a custom hook for each query and mutation. The hooks are located in the `src/hooks/api` directory. The hooks are named after the query or mutation they perform. For example, the `useGetUser` hook is used to fetch the user data, and the `useCreateUser` hook is used to create a new user.

To generate `queryKeys` we will use `queryKeysFactory()` function. This function takes a string as an argument and returns an array of generic query keys.

```ts
import { queryKeysFactory } from "@eccho/react-query";
import { useGetUser } from "./hooks/api/user";

const USER_QUERY_KEY = "user";
const queryKeys = queryKeysFactory(USER_QUERY_KEY);
const usersQueryKeys = {
    ...queryKeys
    me: () => [USER_QUERY_KEY, "me"],
}

console.log(usersQueryKeys.me()); // ["user", "me"] as string[]
console.log(usersQueryKeys.all()); // ["user"] as readonly
```
