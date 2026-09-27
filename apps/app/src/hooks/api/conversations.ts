import { queryKeysFactory } from "@/libs/query-factory";
import { toast } from "@medusajs/ui";
import {
  conversationWorkspaceControllerGetV1,
  conversationWorkspaceControllerListMessagesV1,
  conversationWorkspaceControllerListV1,
  conversationWorkspaceControllerMarkReadV1,
  conversationWorkspaceControllerReactToMessageV1,
  conversationWorkspaceControllerSendMessageV1,
  conversationWorkspaceControllerUpdateBotV1,
  conversationWorkspaceControllerUpdateStatusV1,
  type ConversationGetResponseDto,
  type ConversationSendMessageRequestDto,
  type ConversationUpdateStatusRequestDto,
  type MessageGetResponseDto,
} from "@repo/client";
import type { InfiniteData } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "./workspace";

export type ConversationStatus = "OPEN" | "RESOLVED";
export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageAuthorType = "USER" | "BOT" | "OPERATOR";
export type MessageStatus = "PENDING" | "SENT" | "FAILED";

export const CONVERSATION_QUERY_KEY = "conversation" as const;

export type ConversationListQuery = {
  search?: string;
  page?: number;
  perPage?: number;
  status?: ConversationStatus[];
  accountType?: string[];
  account?: string;
  chatbot?: string;
  botEnabled?: boolean;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
};

export const conversationQueryKeys = {
  ...queryKeysFactory<typeof CONVERSATION_QUERY_KEY, ConversationListQuery>(
    CONVERSATION_QUERY_KEY,
  ),
  messages: (id: string, query?: { perPage?: number }) =>
    [CONVERSATION_QUERY_KEY, "messages", id, { query }] as const,
  pausedCount: () => [CONVERSATION_QUERY_KEY, "paused-count"] as const,
};

const MESSAGES_PER_PAGE = 50;
const LIST_REFETCH_MS = 20_000;
const DETAIL_REFETCH_MS = 15_000;
const MESSAGES_REFETCH_MS = 5_000;
const PAUSED_COUNT_REFETCH_MS = 30_000;

const toCsv = (values?: string[]) =>
  values && values.length > 0 ? values.join(",") : undefined;

export const useConversations = (query: ConversationListQuery = {}) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, isError, error, ...rest } = useQuery({
    queryKey: conversationQueryKeys.list(query),
    enabled: !!slug,
    refetchInterval: (q) =>
      q.state.status === "error" ? false : LIST_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: () =>
      conversationWorkspaceControllerListV1({
        path: { workspace: slug! },
        query: {
          search: query.search,
          page: query.page,
          perPage: query.perPage,
          orderBy: query.orderBy,
          orderDirection: query.orderDirection,
          // Custom filters supported by the backend but absent from the OpenAPI types
          ...(toCsv(query.status) && { status: toCsv(query.status) }),
          ...(toCsv(query.accountType) && {
            accountType: toCsv(query.accountType),
          }),
          ...(query.account && { account: query.account }),
          ...(query.chatbot && { chatbot: query.chatbot }),
          ...(query.botEnabled !== undefined && {
            botEnabled: String(query.botEnabled),
          }),
        } as A,
      }).then((res) => res.data as A),
  });

  const body = data as A;
  return {
    ...rest,
    isError,
    error,
    conversations: (body?.data as ConversationGetResponseDto[]) ?? [],
    count: (body?._metadata?.pagination?.total as number | undefined) ?? 0,
  };
};

export const useConversation = (id: string | undefined) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: conversationQueryKeys.detail(id ?? ""),
    enabled: !!slug && !!id,
    refetchInterval: (query) =>
      query.state.status === "error" ? false : DETAIL_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: () =>
      conversationWorkspaceControllerGetV1({
        path: { workspace: slug!, id: id! },
      }).then((res) => res.data as A),
  });

  return {
    ...rest,
    conversation: (data as A)?.data as ConversationGetResponseDto | undefined,
  };
};

type MessagePage = {
  data: MessageGetResponseDto[];
  page: number;
  total: number;
};

export const useConversationMessages = (id: string | undefined) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const query = useInfiniteQuery<MessagePage, Error>({
    queryKey: conversationQueryKeys.messages(id ?? "", {
      perPage: MESSAGES_PER_PAGE,
    }),
    enabled: !!slug && !!id,
    refetchInterval: (query) =>
      query.state.status === "error" ? false : MESSAGES_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await conversationWorkspaceControllerListMessagesV1({
        path: { workspace: slug!, id: id! },
        query: { page: pageParam as number, perPage: MESSAGES_PER_PAGE },
      });
      const body = res.data as A;
      return {
        data: (body?.data as MessageGetResponseDto[]) ?? [],
        page: pageParam as number,
        total: (body?._metadata?.pagination?.total as number | undefined) ?? 0,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.data.length === MESSAGES_PER_PAGE
        ? lastPage.page + 1
        : undefined,
  });

  // Pages come newest-first (page 1 = newest 50). Older pages are fetched via
  // `fetchNextPage` on scroll-to-top, so reverse page order to render them
  // above newer ones — oldest at the top, newest at the bottom (#245).
  const messages =
    query.data?.pages
      .slice()
      .reverse()
      .flatMap((p) => p.data) ?? [];

  return { ...query, messages };
};

export const useSendOperatorReply = (id: string | undefined) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  const messagesKey = conversationQueryKeys.messages(id ?? "", {
    perPage: MESSAGES_PER_PAGE,
  });

  return useMutation<
    MessageGetResponseDto,
    Error,
    {
      text: string;
      retryOfClientNonce?: string;
    },
    { clientNonce: string; prev?: InfiniteData<MessagePage> }
  >({
    mutationFn: async (variables) => {
      const res = await conversationWorkspaceControllerSendMessageV1({
        path: { workspace: slug!, id: id! },
        body: { text: variables.text },
      });
      return ((res.data as A)?.data as MessageGetResponseDto)!;
    },
    onMutate: async (variables) => {
      if (!id) return { clientNonce: "" };
      await queryClient.cancelQueries({ queryKey: messagesKey });

      const clientNonce = variables.retryOfClientNonce ?? cryptoRandomId();
      const now = new Date().toISOString();

      const optimistic: MessageGetResponseDto & { _clientNonce: string } = {
        id: `tmp-${clientNonce}`,
        direction: "OUTBOUND",
        authorType: "OPERATOR",
        authorId: "self",
        text: variables.text,
        status: "PENDING",
        dateSent: now,
        createdAt: now,
        _clientNonce: clientNonce,
      };

      const prev =
        queryClient.getQueryData<InfiniteData<MessagePage>>(messagesKey);

      queryClient.setQueryData<InfiniteData<MessagePage>>(
        messagesKey,
        (curr) => {
          if (!curr || curr.pages.length === 0) {
            return {
              pages: [
                {
                  data: [optimistic],
                  page: 1,
                  total: 1,
                },
              ],
              pageParams: [1],
            };
          }
          const [firstPage, ...restPages] = curr.pages;
          // Drop any existing tmp-* entry with the same nonce (retry path)
          const filtered = firstPage.data.filter(
            (m) =>
              !(
                "_clientNonce" in (m as unknown as Record<string, unknown>) &&
                (m as unknown as { _clientNonce?: string })._clientNonce ===
                  clientNonce
              ),
          );
          return {
            ...curr,
            pages: [
              {
                ...firstPage,
                data: [...filtered, optimistic],
                total: firstPage.total + 1,
              },
              ...restPages,
            ],
          };
        },
      );

      return { clientNonce, prev };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.clientNonce) return;
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        messagesKey,
        (curr) => {
          if (!curr) return curr;
          return {
            ...curr,
            pages: curr.pages.map((page, idx) =>
              idx === 0
                ? {
                    ...page,
                    data: page.data.map((m) =>
                      (m as unknown as { _clientNonce?: string })
                        ._clientNonce === ctx.clientNonce
                        ? { ...m, status: "FAILED" as const }
                        : m,
                    ),
                  }
                : page,
            ),
          };
        },
      );
    },
    onSuccess: (serverMsg, _vars, ctx) => {
      if (!ctx?.clientNonce) return;
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        messagesKey,
        (curr) => {
          if (!curr) return curr;
          return {
            ...curr,
            pages: curr.pages.map((page, idx) =>
              idx === 0
                ? {
                    ...page,
                    data: page.data.map((m) =>
                      (m as unknown as { _clientNonce?: string })
                        ._clientNonce === ctx.clientNonce
                        ? serverMsg
                        : m,
                    ),
                  }
                : page,
            ),
          };
        },
      );
      queryClient.invalidateQueries({
        queryKey: conversationQueryKeys.lists(),
      });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: conversationQueryKeys.detail(id),
        });
      }
    },
  });
};

export type ReactToMessageAction = "react" | "unreact";

export const useReactToMessage = (
  id: string | undefined,
  currentOperatorId?: string,
) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const messagesKey = conversationQueryKeys.messages(id ?? "", {
    perPage: MESSAGES_PER_PAGE,
  });

  return useMutation<
    MessageGetResponseDto,
    Error,
    { messageId: string; emoji: string; action: ReactToMessageAction },
    { prev?: InfiniteData<MessagePage> }
  >({
    mutationFn: async (variables) => {
      const res = await conversationWorkspaceControllerReactToMessageV1({
        path: { workspace: slug!, id: id!, messageId: variables.messageId },
        body: { emoji: variables.emoji, action: variables.action },
      });
      return ((res.data as A)?.data as MessageGetResponseDto)!;
    },
    onMutate: async (variables) => {
      if (!id) return {};
      await queryClient.cancelQueries({ queryKey: messagesKey });

      const prev =
        queryClient.getQueryData<InfiniteData<MessagePage>>(messagesKey);
      const now = new Date().toISOString();

      queryClient.setQueryData<InfiniteData<MessagePage>>(
        messagesKey,
        (curr) => {
          if (!curr) return curr;
          return {
            ...curr,
            pages: curr.pages.map((page) => ({
              ...page,
              data: page.data.map((m) => {
                if (m.id !== variables.messageId) return m;
                const reactions = m.reactions ?? [];
                // Drop the operator's existing reaction with this emoji first
                // (covers both the unreact case and re-reacting cleanly).
                const withoutMine = reactions.filter(
                  (r) =>
                    !(
                      r.actorType === "operator" &&
                      r.actorId === currentOperatorId &&
                      r.emoji === variables.emoji
                    ),
                );
                return {
                  ...m,
                  reactions:
                    variables.action === "unreact"
                      ? withoutMine
                      : [
                          ...withoutMine,
                          {
                            emoji: variables.emoji,
                            actorType: "operator" as const,
                            actorId: currentOperatorId,
                            at: now,
                          },
                        ],
                };
              }),
            })),
          };
        },
      );

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(messagesKey, ctx.prev);
      }
      toast.error(t("conversations.reactions.toastFailed"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey });
    },
  });
};

export const useUpdateConversationStatus = (id: string | undefined) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { status: ConversationStatus; reason?: string }) =>
      conversationWorkspaceControllerUpdateStatusV1({
        path: { workspace: slug!, id: id! },
        body: body as A,
      }).then((res) => (res.data as A)?.data as ConversationGetResponseDto),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: conversationQueryKeys.detail(id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: conversationQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: conversationQueryKeys.pausedCount(),
      });
    },
  });
};

export const useUpdateConversationBot = (id: string | undefined) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { botEnabled: boolean; reason?: string }) =>
      conversationWorkspaceControllerUpdateBotV1({
        path: { workspace: slug!, id: id! },
        body,
      }).then((res) => res.data?.data as ConversationGetResponseDto),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: conversationQueryKeys.detail(id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: conversationQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: conversationQueryKeys.pausedCount(),
      });
    },
  });
};

export const useMarkConversationRead = (id: string | undefined) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      conversationWorkspaceControllerMarkReadV1({
        path: { workspace: slug!, id: id! },
      }),
    onMutate: async () => {
      // Optimistically clear the unread badge in the list cache
      await queryClient.cancelQueries({
        queryKey: conversationQueryKeys.lists(),
      });
      const prevData = queryClient.getQueriesData<A>({
        queryKey: conversationQueryKeys.lists(),
      });
      queryClient.setQueriesData<A>(
        { queryKey: conversationQueryKeys.lists() },
        (curr: A) => {
          if (!curr?.data) return curr;
          return {
            ...curr,
            data: curr.data.map((conv: A) =>
              conv.id === id ? { ...conv, unreadCount: 0 } : conv,
            ),
          };
        },
      );
      return { prevData };
    },
    onError: (_err: unknown, _vars: unknown, ctx: A) => {
      // Rollback on error
      if (ctx?.prevData) {
        for (const [key, data] of ctx.prevData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
  });
};

export const usePausedConversationsCount = () => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data } = useQuery({
    queryKey: conversationQueryKeys.pausedCount(),
    enabled: !!slug,
    refetchInterval: (query) =>
      query.state.status === "error" ? false : PAUSED_COUNT_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: () =>
      conversationWorkspaceControllerListV1({
        path: { workspace: slug! },
        query: {
          page: 1,
          perPage: 1,
          // Conversations a human is handling (bot off) need operator attention
          botEnabled: "false",
        } as A,
      }).then((res) => res.data as A),
  });

  return ((data as A)?._metadata?.pagination?.total as number | undefined) ?? 0;
};

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type {
  ConversationGetResponseDto,
  ConversationSendMessageRequestDto,
  ConversationUpdateStatusRequestDto,
  MessageGetResponseDto,
};
