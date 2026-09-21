---
applyTo: "apps/app/src/**/*.{ts,tsx}"
description: "Data fetching for apps/app: TanStack Query v5 (query-key factory, query options, hooks, mutations) and the @repo/client API client"
---

# Data Fetching (TanStack Query v5)

All server access goes through custom hooks in `apps/app/src/hooks/api/<resource>.ts` that wrap TanStack Query and the generated `@repo/client`.

## Query key factory

Build keys with `queryKeysFactory` for consistency:

```typescript
// hooks/api/chatbot.ts
import { queryKeysFactory } from "@/libs/query-factory";

export const CHATBOT_QUERY_KEY = "chatbot" as const;
export const chatbotQueryKeys = {
  ...queryKeysFactory(CHATBOT_QUERY_KEY),
  // add specific keys as needed, e.g. me: (ws?: string) => [CHATBOT_QUERY_KEY, "me", ws]
};
// factory generates: all(), lists(), list(filters), details(), detail(id)
```

## Custom query hooks

Expose a typed hook per read. Pull the workspace from context (`useWorkspace`) and unwrap `res.data`:

```typescript
export const useChatbots = (
  query?: Partial<RequestPaginationDto>,
  options?: Omit<UseQueryOptions, "queryFn" | "queryKey">,
) => {
  const { workspace } = useWorkspace();
  const { data, isError, error, ...rest } = useQuery({
    queryKey: chatbotQueryKeys.list(query),
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
    chatbots: data?.data as ChatbotListResponseDto[],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};
```

For shared query definitions used by both hooks and route loaders, export a plain factory (e.g. `chatbotListQuery()`) returning `{ queryKey, queryFn }` so loaders can prime the cache (see `routing-and-modals.instructions.md`).

## Mutation hooks

Return the `useMutation` result and invalidate the relevant list/detail keys on success:

```typescript
export const useCreateChatbot = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChatbotCreateRequestDto) =>
      chatbotControllerCreateV1({
        body: data,
        path: { workspace: workspace!.slug },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.lists() });
    },
    onError: (error) => console.error("Failed to create chatbot:", error),
  });
};
```

Consume mutations from form components with `toast` + `handleSuccess()` (see `routing-and-modals.instructions.md`).

## API client

Always use the generated functions and types from `@repo/client`. They are named `<controller>Controller<action>V1` and take `{ path, query, body }`:

```typescript
import {
  chatbotControllerFindAllV1,
  chatbotControllerCreateV1,
  type ChatbotCreateRequestDto,
  type ChatbotListResponseDto,
} from "@repo/client";
```

Never hand-write `fetch`/`axios` calls — regenerate the client instead if an endpoint is missing.
