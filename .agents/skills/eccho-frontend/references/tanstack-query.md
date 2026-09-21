# TanStack Query v5 — ecbot conventions

ecbot's `apps/app` version of the [tanstack-query agent skill](https://github.com/DeckardGer/tanstack-agent-skills/blob/main/skills/tanstack-query/SKILL.md). Source of record: `.github/instructions/app/data-fetching.instructions.md`. Reference implementation: `apps/app/src/hooks/api/chatbot.ts`.

**Invariants**: server access only through hooks in `src/hooks/api/<resource>.ts` wrapping the generated `@repo/client` (never raw `fetch`/`axios` — regenerate with `pnpm generate:client`); array query keys via `queryKeysFactory`; targeted invalidation on mutation success; handle `isLoading`/`isError` on every read.

## Query Key Factory

Always use `queryKeysFactory` to create a consistent set of query keys for a resource.

```typescript
import { queryKeysFactory } from "@/libs/query-factory";

export const CHATBOT_QUERY_KEY = "chatbot" as const;
export const chatbotQueryKeys = {
  ...queryKeysFactory(CHATBOT_QUERY_KEY),
  // Add extra keys if needed:
  // byAccount: (accountId: string) => [CHATBOT_QUERY_KEY, "by-account", accountId],
};

// Generated keys:
// chatbotQueryKeys.all()        → ["chatbot"]
// chatbotQueryKeys.lists()      → ["chatbot", "list"]
// chatbotQueryKeys.list(query)  → ["chatbot", "list", query]
// chatbotQueryKeys.details()    → ["chatbot", "detail"]
// chatbotQueryKeys.detail(id)   → ["chatbot", "detail", id]
```

## Query Options

For every `useQuery`, define a reusable `queryOptions` object (separate from the hook). This allows loaders to re-use the same `queryKey` and `queryFn`.

```typescript
import { queryOptions } from "@tanstack/react-query";

// Detail query options (used in both hook and loader)
export const chatbotQueryOptions = (
  id: string,
  workspaceSlug: string,
  options?: Omit<UseQueryOptions, "queryFn" | "queryKey">,
) =>
  queryOptions({
    ...options,
    queryKey: chatbotQueryKeys.detail(id),
    queryFn: () =>
      chatbotControllerFindOneV1({
        path: { workspace: workspaceSlug, id },
      }).then((res) => res.data),
  });

// List query options
export const chatbotListQuery = () => ({
  queryKey: chatbotQueryKeys.lists(),
  queryFn: async (workspace: string) =>
    chatbotControllerFindAllV1({
      query: {
        perPage: 20,
        page: 1,
        orderBy: "createdAt",
        orderDirection: "desc",
      },
      path: { workspace },
    }).then((res) => res.data),
});
```

## Custom useQuery Hooks

Wrap `useQuery` in a custom hook for each resource. Follow these conventions:

### Detail hook → expose `item` as a shortcut to `data.data`

```typescript
export const useChatbot = (
  id: string,
  options?: Omit<UseQueryOptions, "queryFn" | "queryKey">,
) => {
  const { workspace } = useWorkspace();
  const { data, isError, error, ...rest } = useQuery<A, Error, A>(
    chatbotQueryOptions(id, workspace!.slug, options),
  );

  return {
    ...rest,
    isError,
    error,
    chatbot: data?.data as ChatbotGetDetailResponseDto | undefined, // direct shortcut
  };
};
```

### List hook → expose `items` and `count`

```typescript
export const useChatbots = (
  query?: Partial<RequestPaginationDto>,
  options?: Omit<UseQueryOptions, "queryFn" | "queryKey">,
) => {
  const { workspace } = useWorkspace();
  const { data, isError, error, ...rest } = useQuery({
    queryKey: chatbotQueryKeys.list(query),
    placeholderData: options?.placeholderData as A,
    initialData: options?.initialData as A,
    queryFn: () =>
      chatbotControllerFindAllV1({
        query,
        path: { workspace: workspace!.slug },
      }).then((res) => res.data),
  });

  return {
    ...rest,
    isError,
    error,
    chatbots: data?.data as ChatbotListResponseDto[] | undefined, // direct shortcut
    count: data?._metadata?.pagination?.total ?? 0, // direct count
  };
};
```

## Mutation Options + Custom useMutation Hooks

Define `mutationFn` and `mutationKey` together, then wrap in a custom hook.

```typescript
export const useCreateChatbot = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: chatbotQueryKeys.lists(),
    mutationFn: (data: ChatbotCreateRequestDto) =>
      chatbotControllerCreateV1({
        body: data,
        path: { workspace: workspace!.slug },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.lists() });
    },
  });
};

export const useUpdateChatbot = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: chatbotQueryKeys.details(),
    mutationFn: (data: { id: string; body: ChatbotUpdateRequestDto }) =>
      chatbotControllerUpdateV1({
        path: { workspace: workspace!.slug, id: data.id },
        body: data.body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.lists() });
    },
  });
};
```

## Loaders with queryOptions

In React Router loaders, **re-use `queryOptions`** to prefetch or ensure data is available before the page renders. Use `queryClient.ensureQueryData` (or `getQueryData` + `fetchQuery` fallback).

```typescript
// loader.ts
import { chatbotListQuery } from "@/hooks/api/chatbot";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import type { LoaderFunctionArgs } from "react-router-dom";

export const chatbotLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = chatbotListQuery();
  const workspace = getWorkspaceParams(params);

  // Return cached data if available, otherwise fetch
  const data = queryClient.getQueryData(query.queryKey);
  return (
    data ??
    queryClient.fetchQuery({
      queryKey: query.queryKey,
      queryFn: () => query.queryFn(workspace.workspaceSlug),
    })
  );
};

// detail loader.ts
export const chatbotDetailLoader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params;
  const workspace = getWorkspaceParams(params);

  return queryClient.ensureQueryData(
    chatbotQueryOptions(id!, workspace.workspaceSlug),
  );
};
```

Then in the page component, pass loader data as `initialData`:

```typescript
const initialData = useLoaderData() as Awaited<
  ReturnType<typeof chatbotLoader>
>;
const { chatbots, count, isLoading } = useChatbots(
  { ...searchParams },
  { initialData },
);
```

## File Structure

All hooks for a resource live in a single file under `src/hooks/api/`:

```
src/hooks/api/
├── chatbot.ts       # queryKeys, queryOptions, loaderQuery, useChatbot, useChatbots, useCreateChatbot, ...
├── accounts.ts
└── index.ts         # re-exports everything
```
