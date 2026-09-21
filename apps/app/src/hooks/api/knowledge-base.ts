import type { BatchResult } from "@/hooks/use-batch-result-toast";
import { queryKeysFactory } from "@/libs/query-factory";
import type { RequestPaginationDto } from "@/libs/query-types";
import {
  knowledgeBaseWorkspaceControllerListV1,
  knowledgeBaseWorkspaceControllerGetV1,
  knowledgeItemWorkspaceControllerListV1,
  knowledgeItemWorkspaceControllerGetV1,
  chatbotKnowledgeItemWorkspaceControllerListV1,
  chatbotKnowledgeItemWorkspaceControllerLinkV1,
  chatbotKnowledgeItemWorkspaceControllerUnlinkV1,
  type KnowledgeBaseResponseDto,
  type KnowledgeItemResponseDto,
  type KnowledgeBaseWorkspaceControllerGetV1Response,
  type KnowledgeBaseWorkspaceControllerListV1Response,
  type KnowledgeItemWorkspaceControllerUpdateV1Response,
  type KnowledgeItemWorkspaceControllerListV1Response,
  type ChatbotKnowledgeItemResponseDto,
  knowledgeItemWorkspaceControllerBatchDeleteV1,
  knowledgeItemWorkspaceControllerBatchProcessV1,
  knowledgeItemWorkspaceControllerDeleteV1,
  knowledgeItemWorkspaceControllerCreateV1,
  type KnowledgeItemCreateRequestDto,
  knowledgeItemWorkspaceControllerUpdateV1,
  type KnowledgeItemUpdateRequestDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type MutationOptions,
} from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const KNOWLEDGE_BASE_QUERY_KEY = "knowledge-base" as const;
export const knowledgeBaseQueryKeys = {
  ...queryKeysFactory(KNOWLEDGE_BASE_QUERY_KEY),
  items: () => ["knowledge-base-items"] as const,
  itemList: (filters?: Record<string, A>) =>
    ["knowledge-base-items", "list", filters] as const,
  itemDetail: (id: string) => ["knowledge-base-items", "detail", id] as const,
};

// Knowledge Base Queries
export const knowledgeBaseListQueryOptions = (workspace: string) =>
  queryOptions({
    queryKey: knowledgeBaseQueryKeys.lists(),
    queryFn: () =>
      knowledgeBaseWorkspaceControllerListV1({
        path: { workspace },
      }).then(
        (res) =>
          res.data as A as KnowledgeBaseWorkspaceControllerListV1Response,
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const knowledgeBaseDetailQueryOptions = (
  workspace: string,
  knowledgeBaseId: string,
) =>
  queryOptions({
    queryKey: knowledgeBaseQueryKeys.detail(knowledgeBaseId),
    queryFn: () =>
      knowledgeBaseWorkspaceControllerGetV1({
        path: { workspace, id: knowledgeBaseId, knowledgeBaseId },
      }).then(
        (res) => res.data as A as KnowledgeBaseWorkspaceControllerGetV1Response,
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useKnowledgeBases = (options?: { enabled?: boolean }) => {
  const { workspace } = useWorkspace();

  const { data, isError, error, ...rest } = useQuery({
    ...knowledgeBaseListQueryOptions(workspace!.slug),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    knowledgeBases: data?.data as KnowledgeBaseResponseDto[] | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useKnowledgeBase = (
  knowledgeBaseId: string,
  options?: { enabled?: boolean },
) => {
  const { workspace } = useWorkspace();

  const { data, isError, error, ...rest } = useQuery({
    ...knowledgeBaseDetailQueryOptions(workspace!.slug, knowledgeBaseId),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    knowledgeBase: data?.data as KnowledgeBaseResponseDto,
  };
};

// Knowledge Base Items Queries
export const knowledgeItemListQueryOptions = (
  workspace: string,
  knowledgeBaseId: string,
  filters?: Record<string, A>,
) =>
  queryOptions({
    queryKey: knowledgeBaseQueryKeys.itemList(filters),
    queryFn: () =>
      knowledgeItemWorkspaceControllerListV1({
        path: { workspace, knowledgeBaseId },
        query: filters,
      }).then(
        (res) =>
          res.data as A as KnowledgeItemWorkspaceControllerListV1Response,
      ),
    staleTime: 2 * 60 * 1000, // 2 minutes for list data
  });

export const knowledgeItemDetailQueryOptions = (
  workspace: string,
  knowledgeBaseId: string,
  itemId: string,
) =>
  queryOptions({
    queryKey: knowledgeBaseQueryKeys.itemDetail(itemId),
    queryFn: () =>
      knowledgeItemWorkspaceControllerGetV1({
        path: { workspace, knowledgeBaseId, id: itemId },
      }).then(
        (res) =>
          res.data as A as KnowledgeItemWorkspaceControllerUpdateV1Response,
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes for detail data
  });

export const useKnowledgeItems = (
  knowledgeBaseId: string,
  query?: Partial<RequestPaginationDto>,
  options?: { enabled?: boolean },
) => {
  const { workspace } = useWorkspace();
  const { data, isError, error, ...rest } = useQuery({
    ...knowledgeItemListQueryOptions(workspace!.slug, knowledgeBaseId, query),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    items: data?.data as KnowledgeItemResponseDto[] | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useKnowledgeItem = (
  knowledgeBaseId: string,
  itemId: string,
  options?: { enabled?: boolean },
) => {
  const { workspace } = useWorkspace();

  const { data, isError, error, ...rest } = useQuery({
    ...knowledgeItemDetailQueryOptions(
      workspace!.slug,
      knowledgeBaseId,
      itemId,
    ),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    item: data?.data as KnowledgeItemResponseDto,
  };
};

export const useBatchDeleteKnowledgeItems = (knowledgebaseId: string) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation<BatchResult, Error, string[]>({
    mutationKey: ["batch-delete-knowledge-items"] as const,
    mutationFn: (ids: string[]) =>
      knowledgeItemWorkspaceControllerBatchDeleteV1({
        path: {
          knowledgeBaseId: knowledgebaseId,
          workspace: workspace!.slug,
        },
        body: { ids },
      }).then((res) => (res.data as A)?.data as BatchResult),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.items(),
      });
    },
  });
};

export const useBatchProcessKnowledgeItems = (knowledgebaseId: string) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation<BatchResult, Error, string[]>({
    mutationKey: ["batch-process-knowledge-items"] as const,
    mutationFn: (ids: string[]) =>
      knowledgeItemWorkspaceControllerBatchProcessV1({
        path: {
          knowledgeBaseId: knowledgebaseId,
          workspace: workspace!.slug,
        },
        body: { ids },
      }).then((res) => (res.data as A)?.data as BatchResult),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.items(),
      });
    },
  });
};

export const useDeleteKnowledgeItem = (knowledgebaseId: string) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: ["delete-knowledge-item"] as const,
    mutationFn: (itemId: string) =>
      knowledgeItemWorkspaceControllerDeleteV1({
        path: {
          id: itemId,
          knowledgeBaseId: knowledgebaseId,
          workspace: workspace!.slug,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.items(),
      });
    },
  });

  return mutation;
};

export const useCreateKnowledgeItem = (
  knowledgebaseId: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
    onUploadProgress?: (progress: number) => void;
  },
) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: ["create-knowledge-item"] as const,
    mutationFn: async (
      data: KnowledgeItemCreateRequestDto & { file?: File },
    ) => {
      // Endpoint is multipart/form-data — the generated client serializes the
      // plain object into FormData (incl. the File and array tags) via
      // formDataBodySerializer. Do NOT pre-build a FormData or override
      // Content-Type: re-serializing an existing FormData produces an empty
      // body (Object.entries(FormData) === []) and drops the boundary.
      const result = await knowledgeItemWorkspaceControllerCreateV1({
        path: {
          knowledgeBaseId: knowledgebaseId,
          workspace: workspace!.slug,
        },
        body: data as A,
        onUploadProgress: (progressEvent) => {
          if (options?.onUploadProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100,
            );
            options.onUploadProgress(progress);
          }
        },
      });

      return result;
    },
    ...options,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.items(),
      });
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
  });

  return mutation;
};

// Chatbot Knowledge Items - Query Keys
export const chatbotKnowledgeItemQueryKeys = {
  all: () => ["chatbot-knowledge-items"] as const,
  lists: () => ["chatbot-knowledge-items", "list"] as const,
  list: (chatbotId: string, filters?: Record<string, A>) =>
    ["chatbot-knowledge-items", "list", { chatbotId, ...filters }] as const,
};

export const chatbotKnowledgeItemListQueryOptions = (
  workspace: string,
  chatbotId: string,
  filters?: Record<string, A>,
) =>
  queryOptions({
    queryKey: chatbotKnowledgeItemQueryKeys.list(chatbotId, filters),
    queryFn: () =>
      chatbotKnowledgeItemWorkspaceControllerListV1({
        path: { workspace, chatbotId },
        query: filters,
      }).then((res) => res.data as A),
    staleTime: 2 * 60 * 1000,
  });

export const useChatbotKnowledgeItems = (
  chatbotId: string,
  query?: Partial<RequestPaginationDto>,
  options?: { enabled?: boolean },
) => {
  const { workspace } = useWorkspace();
  const { data, isLoading, error, ...rest } = useQuery({
    ...chatbotKnowledgeItemListQueryOptions(workspace!.slug, chatbotId, query),
    ...options,
  });

  return {
    ...rest,
    isLoading,
    error,
    items: data?.data as ChatbotKnowledgeItemResponseDto[] | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useLinkKnowledgeItemToChatbot = (
  chatbotId: string,
  options?: MutationOptions<unknown, Error, string>,
) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (knowledgeItemId: string) => {
      return chatbotKnowledgeItemWorkspaceControllerLinkV1({
        path: {
          workspace: workspace!.slug,
          chatbotId,
          knowledgeItemId,
          id: knowledgeItemId,
        },
      });
    },
    ...options,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: chatbotKnowledgeItemQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: ["chatbot"],
      });
      if (options?.onSuccess) {
        options.onSuccess(data, undefined as A, undefined as A);
      }
    },
  });
};

export const useUnlinkKnowledgeItemFromChatbot = (
  chatbotId: string,
  options?: MutationOptions<unknown, Error, string>,
) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (knowledgeItemId: string) => {
      return chatbotKnowledgeItemWorkspaceControllerUnlinkV1({
        path: {
          workspace: workspace!.slug,
          chatbotId,
          knowledgeItemId,
          id: knowledgeItemId,
        },
      });
    },
    ...options,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: chatbotKnowledgeItemQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: ["chatbot"],
      });
      if (options?.onSuccess) {
        options.onSuccess(data, undefined as A, undefined as A);
      }
    },
  });
};

export function useProcessKnowledgeItem() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      knowledgeBaseId,
      id,
    }: {
      knowledgeBaseId: string;
      id: string;
    }) => {
      const res = await knowledgeItemWorkspaceControllerUpdateV1({
        path: { workspace: workspace!.slug, knowledgeBaseId, id },
        body: { status: "READY" },
      });
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.itemDetail(id),
      });
    },
  });
}

export const useUpdateKnowledgeItem = (
  workspaceSlug: string,
  knowledgeBaseId: string,
  itemId: string,
  options?: MutationOptions<unknown, Error, KnowledgeItemUpdateRequestDto>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: KnowledgeItemUpdateRequestDto) => {
      return knowledgeItemWorkspaceControllerUpdateV1({
        path: {
          workspace: workspaceSlug,
          knowledgeBaseId,
          id: itemId,
        },
        body: dto,
      });
    },
    ...options,
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.itemDetail(itemId),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseQueryKeys.lists(),
      });
      if (options?.onSuccess) {
        options.onSuccess(data, undefined as A, undefined as A);
      }
    },
  });
};
