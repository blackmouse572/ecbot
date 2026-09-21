import {
  followupWorkspaceControllerCancelV1,
  followupWorkspaceControllerListV1,
  type FollowupListResponseDto,
} from "@repo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export type { FollowupListResponseDto };

export const FOLLOWUP_QUERY_KEY = "followup" as const;

export type FollowupListQuery = {
  page?: number;
  perPage?: number;
  chatbot?: string;
  search?: string;
  status?: string;
};

export const followupQueryKeys = {
  all: [FOLLOWUP_QUERY_KEY] as const,
  list: (query?: Record<string, unknown>) =>
    [FOLLOWUP_QUERY_KEY, "list", { query }] as const,
  byConversation: (conversationId: string) =>
    [FOLLOWUP_QUERY_KEY, "byConversation", conversationId] as const,
};

export const useFollowups = (query?: FollowupListQuery) => {
  const { workspace } = useWorkspace();
  const { data, ...rest } = useQuery({
    queryKey: followupQueryKeys.list(query),
    queryFn: () =>
      followupWorkspaceControllerListV1({
        query,
        path: { workspace: workspace!.slug },
      }).then((r) => r.data),
    enabled: !!workspace?.slug,
  });
  return {
    ...rest,
    followups: data?.data ?? [],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useConversationFollowups = (conversationId: string) => {
  const { workspace } = useWorkspace();
  const { data, ...rest } = useQuery({
    queryKey: followupQueryKeys.byConversation(conversationId),
    queryFn: () =>
      followupWorkspaceControllerListV1({
        query: { conversationId, perPage: 100 },
        path: { workspace: workspace!.slug },
      }).then((r) => r.data),
    enabled: !!workspace?.slug && !!conversationId,
  });
  return { ...rest, followups: data?.data ?? [] };
};

export const useCancelFollowup = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      followupWorkspaceControllerCancelV1({
        path: { workspace: workspace!.slug, id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followupQueryKeys.all });
    },
  });
};
