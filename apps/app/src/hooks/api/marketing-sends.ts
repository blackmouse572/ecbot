import { queryKeysFactory } from "@/libs/query-factory";
import type { BatchResult } from "@/hooks/use-batch-result-toast";
import {
  marketingAudienceWorkspaceControllerCustomersV1,
  marketingAudienceWorkspaceControllerPreviewV1,
  marketingSendWorkspaceControllerCreateV1,
  marketingSendWorkspaceControllerDraftV1,
  marketingSendWorkspaceControllerGetV1,
  marketingSendWorkspaceControllerListV1,
  marketingSendWorkspaceControllerRepliesV1,
  marketingSendWorkspaceControllerUpdateV1,
  type CustomerGetResponseDto,
  type MarketingAudienceCustomersRequestDto,
  type MarketingAudiencePreviewRequestDto,
  type MarketingAudiencePreviewResponseDto,
  type MarketingSendCreateRequestDto,
  type MarketingSendDraftRequestDto,
  type MarketingSendDraftResponseDto,
  type MarketingSendGetResponseDto,
  type MarketingSendListResponseDto,
  type MarketingSendReplyResponseDto,
  type MarketingSendUpdateRequestDto,
} from "@repo/client";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type {
  MarketingAudienceCustomersRequestDto,
  MarketingAudiencePreviewRequestDto,
  MarketingAudiencePreviewResponseDto,
  MarketingSendCreateRequestDto,
  MarketingSendDraftRequestDto,
  MarketingSendGetResponseDto,
  MarketingSendListResponseDto,
  MarketingSendReplyResponseDto,
  MarketingSendUpdateRequestDto,
} from "@repo/client";

export const marketingAudienceKeys = queryKeysFactory("marketing-audience");
export const marketingSendKeys = queryKeysFactory("marketing-send");

export const marketingAudiencePreviewQueryOptions = (
  workspace: string,
  audience: MarketingAudiencePreviewRequestDto,
) =>
  queryOptions({
    queryKey: marketingAudienceKeys.detail(workspace, audience),
    // SAFETY: the client throws on errors, and a 200 always carries data.
    queryFn: () =>
      marketingAudienceWorkspaceControllerPreviewV1({
        path: { workspace },
        body: audience,
      }).then((res) => res.data.data as MarketingAudiencePreviewResponseDto),
  });

/** Who an audience reaches now: the count, who it leaves out, by channel. */
export const useMarketingAudiencePreview = (
  workspace: string,
  audience: MarketingAudiencePreviewRequestDto,
) => {
  const { data, ...rest } = useQuery({
    ...marketingAudiencePreviewQueryOptions(workspace, audience),
    enabled: !!workspace,
    // Unticking a customer recounts without blanking the numbers.
    placeholderData: keepPreviousData,
  });

  return { ...rest, preview: data };
};

/** One page of the customers an audience reaches, by channel or name. */
export const useMarketingAudienceCustomers = (
  workspace: string,
  body: MarketingAudienceCustomersRequestDto,
  query: { page: number; perPage: number },
) => {
  const { data, ...rest } = useQuery({
    queryKey: marketingAudienceKeys.list({ workspace, ...body, ...query }),
    queryFn: () =>
      marketingAudienceWorkspaceControllerCustomersV1({
        path: { workspace },
        query,
        body,
      }).then((res) => res.data),
    enabled: !!workspace,
    placeholderData: keepPreviousData,
  });

  return {
    ...rest,
    // SAFETY: the list endpoint pages CustomerGetResponseDto rows.
    customers: (data?.data as CustomerGetResponseDto[] | undefined) ?? [],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

/** The AI writes, or rewrites, a send's text. */
export const useDraftMarketingSend = (workspace: string) =>
  useMutation({
    // SAFETY: the client throws on errors, and a 200 always carries data.
    mutationFn: (body: MarketingSendDraftRequestDto) =>
      marketingSendWorkspaceControllerDraftV1({
        path: { workspace },
        body,
      }).then((res) => res.data.data as MarketingSendDraftResponseDto),
  });

export const useCreateMarketingSend = (workspace: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // SAFETY: the client throws on errors, and a 200 always carries data.
    mutationFn: (body: MarketingSendCreateRequestDto) =>
      marketingSendWorkspaceControllerCreateV1({
        path: { workspace },
        body,
      }).then((res) => res.data.data as MarketingSendGetResponseDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingSendKeys.all });
      queryClient.invalidateQueries({ queryKey: marketingAudienceKeys.all });
    },
  });
};

export type MarketingSendListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  /** "AUTO", "ONCE" or both, comma separated. */
  mode?: string;
  /** Stages ("ASKED_PRICE,NEW"), comma separated. */
  preset?: string;
  /** "true" (Đang tự gửi) and/or "false" (Đã tắt tự gửi). */
  active?: string;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
};

/** Đã gửi: every send, newest first. */
export const useMarketingSends = (
  workspace: string,
  params: MarketingSendListParams,
) => {
  const { data, ...rest } = useQuery({
    queryKey: marketingSendKeys.list({ workspace, ...params }),
    queryFn: () =>
      marketingSendWorkspaceControllerListV1({
        path: { workspace },
        query: params,
      }).then((res) => res.data),
    enabled: !!workspace,
    placeholderData: keepPreviousData,
  });

  return {
    ...rest,
    // SAFETY: the list endpoint pages MarketingSendListResponseDto rows.
    sends: (data?.data as MarketingSendListResponseDto[] | undefined) ?? [],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const marketingSendQueryOptions = (workspace: string, id: string) =>
  queryOptions({
    queryKey: marketingSendKeys.detail(id),
    // SAFETY: the client throws on errors, and a 200 always carries data.
    queryFn: () =>
      marketingSendWorkspaceControllerGetV1({
        path: { workspace, send: id },
      }).then((res) => res.data.data as MarketingSendGetResponseDto),
  });

/** One send with its results: by channel, and who it could not reach. */
export const useMarketingSend = (workspace: string, id: string) => {
  const { data, ...rest } = useQuery({
    ...marketingSendQueryOptions(workspace, id),
    enabled: !!workspace && !!id,
  });

  return { ...rest, send: data };
};

/** One page of the customers who replied to a send. */
export const useMarketingSendReplies = (
  workspace: string,
  id: string,
  query: { page: number; perPage: number },
) => {
  const { data, ...rest } = useQuery({
    queryKey: marketingSendKeys.list({
      workspace,
      id,
      replies: true,
      ...query,
    }),
    queryFn: () =>
      marketingSendWorkspaceControllerRepliesV1({
        path: { workspace, send: id },
        query,
      }).then((res) => res.data),
    enabled: !!workspace && !!id,
    placeholderData: keepPreviousData,
  });

  return {
    ...rest,
    // SAFETY: the replies endpoint pages MarketingSendReplyResponseDto rows.
    replies: (data?.data as MarketingSendReplyResponseDto[] | undefined) ?? [],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

/** Sửa tin nhắn, and Tắt / Bật lại tự gửi. */
export const useUpdateMarketingSend = (workspace: string, id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // SAFETY: the client throws on errors, and a 200 always carries data.
    mutationFn: (body: MarketingSendUpdateRequestDto) =>
      marketingSendWorkspaceControllerUpdateV1({
        path: { workspace, send: id },
        body,
      }).then((res) => res.data.data as MarketingSendGetResponseDto),
    onSuccess: (send) => {
      queryClient.setQueryData(marketingSendKeys.detail(id), send);
      queryClient.invalidateQueries({ queryKey: marketingSendKeys.lists() });
    },
  });
};

/**
 * Tắt / Bật lại tự gửi for the rows ticked in Đã gửi. The API has no batch
 * route, so each send is patched on its own and the outcomes are counted.
 */
export const useBatchSetMarketingSendsActive = (workspace: string) => {
  const queryClient = useQueryClient();

  return useMutation<BatchResult, Error, { ids: string[]; active: boolean }>({
    mutationFn: async ({ ids, active }) => {
      const results = await Promise.allSettled(
        ids.map((send) =>
          marketingSendWorkspaceControllerUpdateV1({
            path: { workspace, send },
            body: { active },
          }),
        ),
      );

      return results.reduce<BatchResult>(
        (batch, result, i) => {
          if (result.status === "fulfilled") batch.succeeded.push(ids[i]);
          else batch.failed.push({ id: ids[i], reason: String(result.reason) });

          return batch;
        },
        { succeeded: [], failed: [] },
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: marketingSendKeys.all }),
  });
};
