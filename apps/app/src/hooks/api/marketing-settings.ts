import { queryKeysFactory } from "@/libs/query-factory";
import {
  marketingSettingsWorkspaceControllerGetV1,
  marketingSettingsWorkspaceControllerUpdateV1,
  type MarketingSettingsGetResponseDto,
  type MarketingSettingsUpdateRequestDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { marketingAudienceKeys } from "./marketing-sends";

export type {
  MarketingSettingsGetResponseDto,
  MarketingSettingsUpdateRequestDto,
} from "@repo/client";

export const marketingSettingsKeys = queryKeysFactory("marketing-settings");

export const marketingSettingsQueryOptions = (workspace: string) =>
  queryOptions({
    queryKey: marketingSettingsKeys.detail(workspace),
    // SAFETY: the client throws on errors, and a 200 always carries data.
    queryFn: () =>
      marketingSettingsWorkspaceControllerGetV1({ path: { workspace } }).then(
        (res) => res.data.data as MarketingSettingsGetResponseDto,
      ),
  });

/** Cài đặt gửi tin: send hours, caps, rest and opt-out. */
export const useMarketingSettings = (workspace: string) => {
  const { data, ...rest } = useQuery({
    ...marketingSettingsQueryOptions(workspace),
    enabled: !!workspace,
  });

  return { ...rest, settings: data };
};

export const useUpdateMarketingSettings = (workspace: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // SAFETY: the client throws on errors, and a 200 always carries data.
    mutationFn: (body: MarketingSettingsUpdateRequestDto) =>
      marketingSettingsWorkspaceControllerUpdateV1({
        path: { workspace },
        body,
      }).then((res) => res.data.data as MarketingSettingsGetResponseDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingSettingsKeys.all });
      // Caps and rest change who an audience leaves out.
      queryClient.invalidateQueries({ queryKey: marketingAudienceKeys.all });
    },
  });
};
