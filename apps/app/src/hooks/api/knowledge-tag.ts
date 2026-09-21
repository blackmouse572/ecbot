import { queryKeysFactory } from "@/libs/query-factory";
import {
  knowledgeItemTagControllerListV1,
  knowledgeItemTagControllerDeleteV1,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const KNOWLEDGE_TAG_QUERY_KEY = "knowledge-tag" as const;
export const knowledgeTagQueryKeys = {
  ...queryKeysFactory(KNOWLEDGE_TAG_QUERY_KEY),
  list: (workspace: string, knowledgeBaseId: string) =>
    [KNOWLEDGE_TAG_QUERY_KEY, "list", workspace, knowledgeBaseId] as const,
};

/**
 * Get all unique tags for a knowledge base
 */
export const knowledgeTagListQueryOptions = (
  workspace: string,
  knowledgeBaseId: string,
  options?: Omit<UseQueryOptions, "queryFn" | "queryKey">,
) =>
  queryOptions({
    queryKey: knowledgeTagQueryKeys.list(workspace, knowledgeBaseId),
    queryFn: () =>
      knowledgeItemTagControllerListV1({
        path: { workspace, knowledgeBaseId },
      }).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Hook to fetch all tags for a knowledge base
 */
export function useKnowledgeTags(
  knowledgeBaseId: string,
  options?: Omit<UseQueryOptions, "queryFn" | "queryKey">,
) {
  const { workspace } = useWorkspace();
  const { data, isLoading, error, ...rest } = useQuery(
    knowledgeTagListQueryOptions(workspace!.slug, knowledgeBaseId, options),
  );

  return {
    tags: data?.data as unknown as string[],
    isLoading,
    error,
    ...rest,
  };
}

/**
 * Hook to delete a tag from a knowledge base
 */
export function useDeleteKnowledgeTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      workspace: string;
      knowledgeBaseId: string;
      tag: string;
    }) =>
      knowledgeItemTagControllerDeleteV1({
        path: {
          workspace: variables.workspace,
          knowledgeBaseId: variables.knowledgeBaseId,
          tag: variables.tag,
          tagId: variables.tag,
        },
      }),
    onSuccess: (_, variables) => {
      // Invalidate the tags list for this knowledge base
      queryClient.invalidateQueries({
        queryKey: knowledgeTagQueryKeys.list(
          variables.workspace,
          variables.knowledgeBaseId,
        ),
      });
    },
  });
}
