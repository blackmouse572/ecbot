import { queryKeysFactory } from "@/libs/query-factory";
import {
  marketingAudienceWorkspaceControllerCustomersV1,
  marketingAudienceWorkspaceControllerPreviewV1,
  marketingSendWorkspaceControllerCreateV1,
  marketingSendWorkspaceControllerDraftV1,
  type CustomerGetResponseDto,
  type MarketingAudienceCustomersRequestDto,
  type MarketingAudiencePreviewRequestDto,
  type MarketingAudiencePreviewResponseDto,
  type MarketingSendCreateRequestDto,
  type MarketingSendDraftRequestDto,
  type MarketingSendDraftResponseDto,
  type MarketingSendGetResponseDto,
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
