import type { BatchResult } from "@/hooks/use-batch-result-toast";
import { queryKeysFactory } from "@/libs/query-factory";
import {
  client as heyApiClient,
  toolWorkspaceControllerListV1,
  toolWorkspaceControllerGetV1,
  toolWorkspaceControllerCreateHttpV1,
  toolWorkspaceControllerCreateMcpV1,
  toolWorkspaceControllerUpdateV1,
  toolWorkspaceControllerBatchDeleteV1,
  toolWorkspaceControllerDeleteV1,
  marketplaceWorkspaceControllerGetCatalogV1,
  marketplaceWorkspaceControllerGetCategoriesV1,
  marketplaceWorkspaceControllerStartInstallV1,
  marketplaceWorkspaceControllerCompleteInstallV1,
  chatbotToolWorkspaceControllerEnableV1,
  chatbotToolWorkspaceControllerDisableV1,
  chatbotToolWorkspaceControllerUpdateActionsV1,
  type ToolListResponseDto,
  type ToolResponseDto,
  type ToolWorkspaceControllerListV1Response,
  type ToolWorkspaceControllerGetV1Response,
  type MarketplaceWorkspaceControllerGetCatalogV1Response,
  type CreateHttpToolRequestDto,
  type CreateMcpToolRequestDto,
  type UpdateToolRequestDto,
  type InstallMarketplaceRequestDto,
  type CompleteInstallRequestDto,
  type EnableOnChatbotRequestDto,
  type UpdateEnabledActionsRequestDto,
  marketplaceWorkspaceControllerGetToolkitBySlugV1,
  type MarketplaceWorkspaceControllerGetToolkitBySlugV1Response,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

// -------------------------------------------------------------------------
// Query key namespaces
// -------------------------------------------------------------------------

export const TOOLS_QUERY_KEY = "tools" as const;
export const toolsQueryKeys = {
  ...queryKeysFactory(TOOLS_QUERY_KEY),
  marketplace: (filters?: Record<string, A>) =>
    [TOOLS_QUERY_KEY, "marketplace", filters] as const,
  chatbotTools: (chatbotId: string) =>
    [TOOLS_QUERY_KEY, "chatbot", chatbotId] as const,
  chatbotInvocations: (chatbotId: string) =>
    [TOOLS_QUERY_KEY, "chatbot", chatbotId, "invocations"] as const,
};

// Mirrors apps/api ToolInvocationResponseDto. Kept inline until the generated
// @repo/client picks it up via `pnpm generate:client`.
export type ToolInvocationResponseDto = {
  id: string;
  toolId: string;
  chatbotId: string;
  conversationId?: string;
  correlationId: string;
  status: "SUCCESS" | "ERROR" | "TIMEOUT";
  actionName?: string;
  inputArgs: Record<string, unknown>;
  outputResult?: unknown;
  errorMessage?: string;
  durationMs: number;
  createdAt: string;
};

// -------------------------------------------------------------------------
// Tool queries
// -------------------------------------------------------------------------

export type ToolListParams = {
  search?: string;
  page?: number;
  perPage?: number;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
  kind?: "HTTP" | "MCP";
  status?: "ACTIVE" | "NEEDS_REAUTH" | "EXPIRED" | "REVOKED";
  mcpProvider?: "COMPOSIO" | "ECCHO" | "OPERATOR";
};

export const toolListQueryOptions = (
  workspace: string,
  params?: ToolListParams,
) =>
  queryOptions({
    queryKey: toolsQueryKeys.list({ workspace, ...params }),
    queryFn: () =>
      toolWorkspaceControllerListV1({
        path: { workspace } as never,
        // Cast: generated client doesn't yet know about kind/status/mcpProvider.
        // Re-run `pnpm generate:client` after the API change to update types.
        query: params as A,
      }).then((res) => res.data as A as ToolWorkspaceControllerListV1Response),
    staleTime: 2 * 60 * 1000,
  });

export const toolDetailQueryOptions = (workspace: string, toolId: string) =>
  queryOptions({
    queryKey: toolsQueryKeys.detail(toolId),
    queryFn: () =>
      toolWorkspaceControllerGetV1({
        path: { workspace, toolId } as A,
      }).then((res) => res.data as A as ToolWorkspaceControllerGetV1Response),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useListTools = (
  workspace: string,
  params?: ToolListParams,
  options?: { enabled?: boolean },
) => {
  const { data, isError, error, ...rest } = useQuery({
    ...toolListQueryOptions(workspace, params),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    tools: data?.data as ToolListResponseDto[] | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useGetTool = (
  workspace: string,
  toolId: string,
  options?: { enabled?: boolean },
) => {
  const { data, isError, error, ...rest } = useQuery({
    ...toolDetailQueryOptions(workspace, toolId),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    tool: data?.data as ToolResponseDto | undefined,
  };
};

// -------------------------------------------------------------------------
// Tool mutations
// -------------------------------------------------------------------------

export const useCreateHttpTool = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["create-http-tool"] as const,
    mutationFn: (body: CreateHttpToolRequestDto) =>
      toolWorkspaceControllerCreateHttpV1({
        path: { workspace } as never,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    createHttpTool: mutateAsync,
    ...rest,
  };
};

export const useCreateMcpTool = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["create-mcp-tool"] as const,
    mutationFn: (body: CreateMcpToolRequestDto) =>
      toolWorkspaceControllerCreateMcpV1({
        path: { workspace } as never,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    createMcpTool: mutateAsync,
    ...rest,
  };
};

export const useUpdateTool = (workspace: string, toolId: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["update-tool", toolId] as const,
    mutationFn: (body: UpdateToolRequestDto) =>
      toolWorkspaceControllerUpdateV1({
        path: { workspace, toolId } as A,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.detail(toolId),
      });
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    updateTool: mutateAsync,
    ...rest,
  };
};

export const useBatchDeleteTools = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation<BatchResult, Error, string[]>({
    mutationKey: ["batch-delete-tools"] as const,
    mutationFn: (ids: string[]) =>
      toolWorkspaceControllerBatchDeleteV1({
        path: { workspace } as A,
        body: { ids },
      }).then((res) => (res.data as A)?.data as BatchResult),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    batchDeleteTools: mutateAsync,
    ...rest,
  };
};

export const useDeleteTool = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["delete-tool"] as const,
    mutationFn: (toolId: string) =>
      toolWorkspaceControllerDeleteV1({
        path: { workspace, toolId } as A,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    deleteTool: mutateAsync,
    ...rest,
  };
};

// -------------------------------------------------------------------------
// Marketplace
// -------------------------------------------------------------------------

export const marketplaceCatalogQueryOptions = (
  workspace: string,
  filters?: {
    category?: string;
    search?: string;
    page?: number;
    perPage?: number;
  },
) =>
  queryOptions({
    queryKey: toolsQueryKeys.marketplace(filters),
    queryFn: () =>
      marketplaceWorkspaceControllerGetCatalogV1({
        path: { workspace } as never,
        query: {
          category: filters?.category ?? "",
          search: filters?.search ?? "",
          page: filters?.page ?? 1,
          perPage: filters?.perPage ?? 24,
        } as A,
      }).then(
        (res) =>
          res.data as A as MarketplaceWorkspaceControllerGetCatalogV1Response,
      ),
    staleTime: 5 * 60 * 1000,
  });

export const useMarketplaceCatalog = (
  workspace: string,
  filters?: {
    category?: string;
    search?: string;
    page?: number;
    perPage?: number;
  },
  options?: { enabled?: boolean },
) => {
  const { data, isError, error, ...rest } = useQuery({
    ...marketplaceCatalogQueryOptions(workspace, filters),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    catalog: data?.data as A,
    total: (data?._metadata?.pagination?.total as number) ?? 0,
    totalPage: (data?._metadata?.pagination?.totalPage as number) ?? 1,
  };
};

export const useStartInstall = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["start-install-marketplace"] as const,
    mutationFn: (body: InstallMarketplaceRequestDto) =>
      marketplaceWorkspaceControllerStartInstallV1({
        path: { workspace },
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    startInstall: mutateAsync,
    ...rest,
  };
};

export const marketplaceCategoriesQueryOptions = (workspace: string) =>
  queryOptions({
    queryKey: [TOOLS_QUERY_KEY, "marketplace", "categories"] as const,
    queryFn: () =>
      marketplaceWorkspaceControllerGetCategoriesV1({
        path: { workspace } as never,
      }).then((res) => res.data as A),
    staleTime: 60 * 60 * 1000,
  });

export const useMarketplaceCategories = (
  workspace: string,
  options?: { enabled?: boolean },
) => {
  const { data, isLoading, isError, ...rest } = useQuery({
    ...marketplaceCategoriesQueryOptions(workspace),
    ...options,
  });

  return {
    ...rest,
    isLoading,
    isError,
    categories: ((data as A)?.data ?? []) as { id: string; name: string }[],
  };
};

export type ComposioToolkitDetail = {
  slug: string;
  name: string;
  enabled: boolean;
  composio_managed_auth_schemes: string[];
  is_local_toolkit: boolean;
  auth_guide_url?: string;
  base_url?: string;
  meta: {
    created_at: string;
    updated_at: string;
    description: string;
    logo: string;
    app_url: string;
    categories: { name: string; slug: string }[];
    triggers_count: number;
    tools_count: number;
    version: string;
    available_versions: string[];
  };
};

export const toolkitDetailQueryOptions = (workspace: string, slug: string) =>
  queryOptions({
    queryKey: [TOOLS_QUERY_KEY, "toolkit", slug] as const,
    queryFn: () =>
      marketplaceWorkspaceControllerGetToolkitBySlugV1({
        path: { workspace, slug } as never,
      }).then(
        (res) =>
          res.data as A as MarketplaceWorkspaceControllerGetToolkitBySlugV1Response,
      ),
    staleTime: 60 * 60 * 1000,
  });

export const useGetToolkitDetail = (
  workspace: string,
  slug: string,
  options?: { enabled?: boolean },
) => {
  const { data, ...rest } = useQuery({
    ...toolkitDetailQueryOptions(workspace, slug),
    ...options,
  });
  return {
    ...rest,
    toolkit: data?.data,
  };
};

// Composio toolkit slug is only exposed via the untyped `source` bag
// (e.g. { toolkit: "gmail" }) — there's no typed field for it on the DTO.
export const getToolkitSlug = (
  item?: Pick<ToolResponseDto | ToolListResponseDto, "source">,
) => {
  const toolkit = item?.source?.toolkit;
  return typeof toolkit === "string" ? toolkit : undefined;
};

// Resolves a saved tool's logo via its Composio toolkit, if any (HTTP tools
// and MCP tools with no resolvable toolkit fall back to undefined logo).
export const useToolLogo = (
  workspace: string,
  item?: Pick<ToolResponseDto | ToolListResponseDto, "source">,
) => {
  const toolkitSlug = getToolkitSlug(item);
  const { toolkit, isLoading } = useGetToolkitDetail(
    workspace,
    toolkitSlug ?? "",
    { enabled: !!toolkitSlug },
  );

  return {
    logo: toolkit?.meta.logo,
    isLoading: !!toolkitSlug && isLoading,
  };
};

export const useReauth = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["reauth-marketplace", workspace] as const,
    mutationFn: (body: { toolId: string; callbackUrl: string }) =>
      heyApiClient.post({
        url: "/api/v1/workspace/{workspace}/tool/marketplace/reauth",
        path: { workspace },
        body,
        security: [
          { scheme: "bearer", type: "http" },
          { name: "x-api-key", type: "apiKey" },
        ],
        responseType: "json",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolsQueryKeys.lists() });
    },
  });

  return { reauth: mutateAsync, ...rest };
};

export const useCompleteInstall = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["complete-install-marketplace"] as const,
    mutationFn: (body: CompleteInstallRequestDto) =>
      marketplaceWorkspaceControllerCompleteInstallV1({
        path: { workspace } as never,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    completeInstall: mutateAsync,
    ...rest,
  };
};

// -------------------------------------------------------------------------
// Chatbot <-> Tool wiring
// -------------------------------------------------------------------------

export const useEnableToolOnChatbot = (
  workspace: string,
  chatbotId: string,
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["enable-tool-on-chatbot", chatbotId] as const,
    mutationFn: ({
      toolId,
      body,
    }: {
      toolId: string;
      body: EnableOnChatbotRequestDto;
    }) =>
      chatbotToolWorkspaceControllerEnableV1({
        path: { workspace, chatbotId, toolId } as A,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.chatbotTools(chatbotId),
      });
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    enableToolOnChatbot: mutateAsync,
    ...rest,
  };
};

export const useDisableToolOnChatbot = (
  workspace: string,
  chatbotId: string,
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["disable-tool-on-chatbot", chatbotId] as const,
    mutationFn: (toolId: string) =>
      chatbotToolWorkspaceControllerDisableV1({
        path: { workspace, chatbotId, toolId } as A,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.chatbotTools(chatbotId),
      });
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.lists(),
      });
    },
  });

  return {
    disableToolOnChatbot: mutateAsync,
    ...rest,
  };
};

// -------------------------------------------------------------------------
// Tool invocations (per-chatbot log viewer)
// -------------------------------------------------------------------------

/**
 * Fetches the last N invocations for a chatbot. Until `pnpm generate:client`
 * picks up the new endpoint, we call it through the underlying client directly.
 * Once the generated SDK ships `chatbotToolWorkspaceControllerListInvocationsV1`
 * we can swap this body to use it.
 */
async function fetchToolInvocations(
  workspace: string,
  chatbotId: string,
  limit: number,
): Promise<{ data: ToolInvocationResponseDto[] }> {
  const res = await heyApiClient.get({
    url: "/api/v1/workspace/{workspace}/chatbot/{chatbotId}/tool/invocations",
    path: { workspace, chatbotId },
    query: { limit },
    security: [
      { scheme: "bearer", type: "http" },
      { name: "x-api-key", type: "apiKey" },
    ],
    responseType: "json",
  });
  return (res.data ?? { data: [] }) as { data: ToolInvocationResponseDto[] };
}

export const toolInvocationsQueryOptions = (
  workspace: string,
  chatbotId: string,
  limit = 100,
) =>
  queryOptions({
    queryKey: toolsQueryKeys.chatbotInvocations(chatbotId),
    queryFn: () => fetchToolInvocations(workspace, chatbotId, limit),
    staleTime: 30 * 1000,
  });

export const useToolInvocations = (
  workspace: string,
  chatbotId: string,
  options?: { enabled?: boolean; limit?: number },
) => {
  const { data, ...rest } = useQuery({
    ...toolInvocationsQueryOptions(workspace, chatbotId, options?.limit),
    enabled: options?.enabled,
  });
  return {
    ...rest,
    invocations: data?.data ?? [],
  };
};

// -------------------------------------------------------------------------
// Chatbot tool list (per-chatbot enabled tools)
// -------------------------------------------------------------------------

/**
 * Mirrors apps/api ChatbotToolListResponseDto. Kept inline until the generated
 * @repo/client picks it up via `pnpm generate:client`.
 */
export interface ChatbotToolListItem {
  id: string;
  kind: "HTTP" | "MCP";
  name: string;
  description?: string;
  status: string;
  enabledActions: string[] | null;
}

async function fetchChatbotTools(
  workspace: string,
  chatbotId: string,
): Promise<{ data: ChatbotToolListItem[] }> {
  const res = await heyApiClient.get({
    url: "/api/v1/workspace/{workspace}/chatbot/{chatbotId}/tool",
    path: { workspace, chatbotId },
    security: [
      { scheme: "bearer", type: "http" },
      { name: "x-api-key", type: "apiKey" },
    ],
    responseType: "json",
  });
  return (res.data ?? { data: [] }) as { data: ChatbotToolListItem[] };
}

export const useListChatbotTools = (
  workspace: string,
  chatbotId: string,
  options?: { enabled?: boolean },
) => {
  const { data, ...rest } = useQuery({
    queryKey: toolsQueryKeys.chatbotTools(chatbotId),
    queryFn: () => fetchChatbotTools(workspace, chatbotId),
    staleTime: 30 * 1000,
    enabled: options?.enabled,
  });
  return {
    ...rest,
    tools: data?.data ?? [],
  };
};

export const useRediscoverTool = (workspace: string, toolId: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["rediscover-tool", toolId] as const,
    mutationFn: () =>
      heyApiClient.post({
        url: "/api/v1/workspace/{workspace}/tool/{toolId}/discover",
        path: { workspace, toolId },
        security: [
          { scheme: "bearer", type: "http" },
          { name: "x-api-key", type: "apiKey" },
        ],
        responseType: "json",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.detail(toolId),
      });
    },
  });

  return { rediscover: mutateAsync, ...rest };
};

// -------------------------------------------------------------------------
// Tool test (HTTP)
// -------------------------------------------------------------------------

export interface ToolTestResult {
  status: "SUCCESS" | "ERROR" | "TIMEOUT";
  result?: unknown;
  errorMessage?: string;
  durationMs: number;
}

export const useTestSavedTool = (workspace: string, toolId: string) => {
  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["test-saved-tool", toolId] as const,
    mutationFn: (args: Record<string, unknown>) =>
      heyApiClient.post({
        url: "/api/v1/workspace/{workspace}/tool/{toolId}/test",
        path: { workspace, toolId },
        body: { args },
        security: [
          { scheme: "bearer", type: "http" },
          { name: "x-api-key", type: "apiKey" },
        ],
        responseType: "json",
      }),
  });
  return { testTool: mutateAsync, ...rest };
};

export const useTestInlineTool = (workspace: string) => {
  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["test-inline-tool", workspace] as const,
    mutationFn: (body: Record<string, unknown>) =>
      heyApiClient.post({
        url: "/api/v1/workspace/{workspace}/tool/test",
        path: { workspace },
        body,
        security: [
          { scheme: "bearer", type: "http" },
          { name: "x-api-key", type: "apiKey" },
        ],
        responseType: "json",
      }),
  });
  return { testTool: mutateAsync, ...rest };
};

export const useUpdateEnabledActions = (
  workspace: string,
  chatbotId: string,
  toolId: string,
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["update-enabled-actions", chatbotId, toolId] as const,
    mutationFn: (body: UpdateEnabledActionsRequestDto) =>
      chatbotToolWorkspaceControllerUpdateActionsV1({
        path: { workspace, chatbotId, toolId } as A,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.chatbotTools(chatbotId),
      });
      queryClient.invalidateQueries({
        queryKey: toolsQueryKeys.detail(toolId),
      });
    },
  });

  return {
    updateEnabledActions: mutateAsync,
    ...rest,
  };
};
