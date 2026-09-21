import { queryKeysFactory } from "@/libs/query-factory";
import {
  ragWorkspaceControllerCreateWithFileV1,
  ragWorkspaceControllerDeleteV1,
  ragWorkspaceControllerFindAllV1,
  ragWorkspaceControllerUploadFileV1,
  type AwsS3PresignResponseDto,
  type RagListByChatbotResponseDto,
  type RagWorkspaceControllerCreateWithFileV1Data,
  type RagWorkspaceControllerFindAllV1Response,
  type RagWorkspaceControllerUploadFileV1Data,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const ragKey = queryKeysFactory("rag");

export const ragListQueryOptions = (
  query: Record<string, A>,
  workspace: string,
  chatbot: string,
) =>
  queryOptions({
    queryKey: ragKey.list({ ...query, workspace, chatbot }),
    queryFn: () =>
      ragWorkspaceControllerFindAllV1({
        path: { chatbot, workspace },
        query,
      }).then(
        (res) => res.data as unknown as RagWorkspaceControllerFindAllV1Response,
      ),
  });

export const useRagList = (
  query: Record<string, A>,
  workspace: string,
  chatbot: string,
  options?: Omit<
    ReturnType<typeof ragListQueryOptions>,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, isLoading, error } = useQuery({
    ...ragListQueryOptions(query, workspace, chatbot),
    ...options,
  });

  return {
    rags: data?.data as RagListByChatbotResponseDto[],
    totals: data?._metadata.pagination?.total ?? 0,
    isLoading,
    error,
  };
};

export const useRAGSignedUrl = (workspace: string, chatbot: string) => {
  return useMutation({
    mutationFn: async (
      body: RagWorkspaceControllerUploadFileV1Data["body"],
    ) => {
      const res = await ragWorkspaceControllerUploadFileV1({
        body: body,
        path: { workspace, chatbot },
      });
      if (res.error) {
        return Promise.reject(res.error);
      }
      return res.data as unknown as { data: AwsS3PresignResponseDto; error: A };
    },
  });
};

export const useRAGCreateWithFile = (workspace: string, chatbot: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: RagWorkspaceControllerCreateWithFileV1Data["body"]) => {
      return ragWorkspaceControllerCreateWithFileV1({
        path: { workspace, chatbot },
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ragKey.list({ workspace, chatbot }),
      });
    },
  });
};

export const useDeleteRag = (workspace: string, chatbot: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ragId: string) => {
      return ragWorkspaceControllerDeleteV1({
        path: { workspace, chatbot, rag: ragId },
      })
        .then((res) => {
          if (res.error) {
            return Promise.reject(res.error);
          }
          return res.data as unknown as { data: null; error: A };
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ragKey.list({ workspace, chatbot }),
      });
    },
  });
};
