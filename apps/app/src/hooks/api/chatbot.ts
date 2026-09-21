import type { BatchResult } from "@/hooks/use-batch-result-toast";
import { queryKeysFactory } from "@/libs/query-factory";
import type { RequestPaginationDto } from "@/libs/query-types";
import { CHATBOT_CONSTANTS } from "@/routes/chatbot/constants";
import {
  chatbotControllerActiveV1,
  chatbotControllerBatchDeleteV1,
  chatbotControllerBatchStatusV1,
  chatbotControllerCloneV1,
  chatbotControllerCreateShareLinkV1,
  chatbotControllerCreateV1,
  chatbotControllerDeleteV1,
  chatbotControllerFindAllV1,
  chatbotControllerFindOneV1,
  chatbotControllerInactiveV1,
  chatbotControllerLinkAccountV1,
  chatbotControllerModelsV1,
  chatbotControllerUnlinkAccountV1,
  chatbotControllerUpdateV1,
  type ChatbotCreateRequestDto,
  type ChatbotCreateResponseDto,
  type CloneChatbotRequestDto,
  type ChatbotGetDetailResponseDto,
  type ChatbotLinkAccountRequestDto,
  type ChatbotListResponseDto,
  type ChatbotModelResponseDto,
  type ChatbotShareLinkRequestDto,
  type ChatbotShareLinkResponseDto,
  type ChatbotUpdateRequestDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

/** Shared by every read hook below that just forwards `useQuery`'s options. */
type ChatbotQueryOptions = Omit<UseQueryOptions, "queryFn" | "queryKey">;

export const CHATBOT_QUERY_KEY = "chatbot" as const;
export const chatbotQueryKeys = {
  ...queryKeysFactory(CHATBOT_QUERY_KEY),
};

export const chatbotListQuery = () => ({
  queryKey: chatbotQueryKeys.lists(),
  queryFn: async (workspace: string) =>
    chatbotControllerFindAllV1({
      query: {
        perPage: CHATBOT_CONSTANTS.PAGE_SIZE,
        page: CHATBOT_CONSTANTS.DEFAULT_ACCOUNTS_PAGE,
        orderBy: "createdAt",
        orderDirection: "desc",
      },
      path: { workspace },
    }).then((res) => res.data),
});

export const useChatbots = (
  query?: Partial<RequestPaginationDto>,
  options?: ChatbotQueryOptions,
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
    chatbots: data?.data as ChatbotListResponseDto[],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const chatbotModelsQuery = () => ({
  queryKey: [CHATBOT_QUERY_KEY, "models"] as const,
  queryFn: (workspace: string) =>
    chatbotControllerModelsV1({ path: { workspace } }).then(
      (res) => res.data?.data ?? [],
    ),
  staleTime: 60 * 60 * 1000,
});

export const useChatbotModels = () => {
  const { workspace } = useWorkspace();

  const { data, isError, error, ...rest } = useQuery({
    queryKey: chatbotModelsQuery().queryKey,
    queryFn: () => chatbotModelsQuery().queryFn(workspace!.slug),
    enabled: !!workspace?.slug,
    staleTime: 60 * 60 * 1000,
  });

  return {
    ...rest,
    isError,
    error,
    models: data ?? [],
  };
};

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
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Failed to create chatbot:", error);
    },
  });
};

export const chatbotQueryOptions = (
  id: string,
  workspaceSlug: string,
  options?: ChatbotQueryOptions,
) =>
  queryOptions({
    ...options,
    queryKey: chatbotQueryKeys.detail(id),
    queryFn: () =>
      chatbotControllerFindOneV1({
        path: { workspace: workspaceSlug, id },
      }).then((res) => res.data),
  });

export const useChatbot = (id: string, options?: ChatbotQueryOptions) => {
  const { workspace } = useWorkspace();

  const { data, isError, error, ...rest } = useQuery<A, Error, A>(
    chatbotQueryOptions(id, workspace!.slug, options),
  );

  return {
    ...rest,
    isError,
    error,
    chatbot: data?.data,
  };
};

export function useAccountChatbot(
  accountId: string,
  options?: ChatbotQueryOptions,
) {
  const { workspace } = useWorkspace();
  const singleAccountQuery = { perPage: 1, page: 1, account: accountId };

  const { data, isError, error, ...rest } = useQuery({
    queryKey: chatbotQueryKeys.list(singleAccountQuery),
    placeholderData: options?.placeholderData as A,
    initialData: options?.initialData as A,
    queryFn: () =>
      chatbotControllerFindAllV1({
        query: singleAccountQuery,
        path: { workspace: workspace!.slug },
      }).then((res) => res.data),
  });

  const accountChatbots = data?.data as ChatbotListResponseDto[] | undefined;

  return {
    ...rest,
    isError,
    error,
    chatbot: accountChatbots?.[0],
    count: data?._metadata?.pagination?.total ?? 0,
  };
}

export const useUpdateChatbot = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; body: ChatbotUpdateRequestDto }) =>
      chatbotControllerUpdateV1({
        path: { workspace: workspace!.slug, id: data.id },
        body: data.body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Failed to update chatbot:", error);
    },
  });
};

export const useDeleteChatbot = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string }) =>
      chatbotControllerDeleteV1({
        path: { workspace: workspace!.slug, id: data.id },
      }),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({
        queryKey: chatbotQueryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Failed to delete chatbot:", error);
    },
  });
};

export const useBatchDeleteChatbots = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation<BatchResult, Error, string[]>({
    mutationFn: (ids: string[]) =>
      chatbotControllerBatchDeleteV1({
        path: { workspace: workspace!.slug },
        body: { ids },
      }).then((res) => (res.data as A)?.data as BatchResult),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
  });
};

export const useBatchToggleChatbotActive = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation<BatchResult, Error, { ids: string[]; active: boolean }>({
    mutationFn: ({ ids, active }) =>
      chatbotControllerBatchStatusV1({
        path: { workspace: workspace!.slug },
        body: { ids, active },
      }).then((res) => (res.data as A)?.data as BatchResult),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
  });
};

export const useToggleChatbotActivate = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { id: string; active: boolean }) =>
      payload.active
        ? chatbotControllerActiveV1({
            path: {
              workspace: workspace!.slug,
              id: payload.id,
            },
          })
        : chatbotControllerInactiveV1({
            path: {
              workspace: workspace!.slug,
              id: payload.id,
            },
          }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Failed to disable chatbot:", error);
    },
  });
};

export const useUnlinkChatbotAccount = (chatbotId: string) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ChatbotLinkAccountRequestDto) =>
      chatbotControllerUnlinkAccountV1({
        path: { workspace: workspace!.slug, id: chatbotId },
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.detail(chatbotId),
      });
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
  });
};

export const useLinkChatbotAccount = (chatbotId: string) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ChatbotLinkAccountRequestDto) =>
      chatbotControllerLinkAccountV1({
        path: { workspace: workspace!.slug, id: chatbotId },
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.detail(chatbotId),
      });
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
  });
};

export const useCloneChatbot = (chatbotId: string) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CloneChatbotRequestDto) =>
      chatbotControllerCloneV1({
        body: data,
        path: { workspace: workspace!.slug, id: chatbotId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatbotQueryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Failed to clone chatbot:", error);
    },
  });
};

export type {
  ChatbotCreateRequestDto,
  ChatbotCreateResponseDto,
  ChatbotGetDetailResponseDto,
  ChatbotLinkAccountRequestDto,
  ChatbotListResponseDto,
  ChatbotModelResponseDto,
  ChatbotUpdateRequestDto,
  CloneChatbotRequestDto,
};

/**
 * Mint a signed, time-limited public preview link. Nothing is persisted — the
 * token is self-contained and cannot be revoked, only outlived — so there is no
 * query to invalidate afterwards.
 */
export const useCreateChatbotShareLink = (chatbotId: string) => {
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: async (payload: ChatbotShareLinkRequestDto) => {
      const res = await chatbotControllerCreateShareLinkV1({
        path: { workspace: workspace!.slug, id: chatbotId },
        body: payload,
      });
      return (res.data as unknown as { data: ChatbotShareLinkResponseDto })
        .data;
    },
  });
};
