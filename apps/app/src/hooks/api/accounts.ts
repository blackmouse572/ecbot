import type { BatchResult } from "@/hooks/use-batch-result-toast";
import { queryKeysFactory } from "@/libs/query-factory";
import {
  accountControllerBatchDeleteSyncV1,
  accountControllerDeleteSyncV1,
  accountControllerFindUnlinkedAccountsV1,
  accountControllerGetDetailV1,
  accountControllerLinkV1,
  accountControllerListV1,
  accountControllerProvisionApiChannelV1,
  accountControllerProvisionWebsiteWidgetV1,
  accountControllerRotateApiChannelSecretV1,
  accountControllerUpdateAllowedOriginsV1,
  accountControllerUpdateCallbackUrlV1,
  type AccountControllerFindUnlinkedAccountsV1Data,
  type AccountControllerFindUnlinkedAccountsV1Responses,
  type AccountControllerListV1Data,
  type AccountControllerListV1Response,
  type AccountGetDetailResponseDto,
  type AccountLinkRequestDto,
  type AccountProvisionApiChannelRequestDto,
  type AccountProvisionApiChannelResponseDto,
  type AccountProvisionWebsiteWidgetRequestDto,
  type AccountProvisionWebsiteWidgetResponseDto,
  type AccountUpdateAllowedOriginsResponseDto,
  type AccountUpdateCallbackUrlResponseDto,
  type AccountListResponseDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useWorkspaceParams } from "../use-workspace-params";
import { useWorkspace } from "./workspace";

/** Shared by every read hook below that just forwards `useQuery`'s options. */
type AccountQueryOptions = Omit<UseQueryOptions, "queryFn" | "queryKey">;

export const ACCOUNT_QUERY_KEY = "accounts" as const;
const accountBaseKeys = queryKeysFactory(ACCOUNT_QUERY_KEY);

export const accountQueryKeys = {
  ...accountBaseKeys,
  listUnlinked: (filters?: Record<string, A>) =>
    [...accountBaseKeys.lists(), "unlinked", { query: filters ?? {} }] as const,
};

export const accountsQueryOptions = (
  workspaceId: string,
  query?: Record<string, A>,
) =>
  queryOptions({
    queryKey: accountQueryKeys.list(query),
    queryFn: () =>
      accountControllerListV1({
        query,
        params: { workspace: workspaceId },
        path: { workspace: workspaceId },
      }).then((res) => res.data as unknown as AccountControllerListV1Response),
  });

export const useAccounts = (
  query?: Partial<AccountControllerListV1Data["query"]>,
  options?: Partial<ReturnType<typeof accountsQueryOptions>>,
) => {
  const { workspace } = useWorkspace();

  const { data, isError, error, ...rest } = useQuery({
    ...options,
    ...accountsQueryOptions(workspace!.id, query),
  });

  return {
    ...rest,
    isError,
    error,
    accounts: data?.data as AccountListResponseDto[] | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const accountQueryOptions = (
  id: string,
  workspaceId: string,
  options?: AccountQueryOptions,
) =>
  queryOptions({
    ...options,
    queryKey: accountQueryKeys.detail(id),
    queryFn: () =>
      accountControllerGetDetailV1({
        path: { workspace: workspaceId, accountId: id },
      }).then((res) => res.data),
  });
export const useAccount = (id: string, options?: AccountQueryOptions) => {
  const { workspace } = useWorkspace();
  const queryConfig = accountQueryOptions(id, workspace!.id, options);
  const { data, isError, error, ...rest } = useQuery<A, Error, A>(queryConfig);

  return {
    ...rest,
    isError,
    error,
    account: data.data as AccountGetDetailResponseDto | undefined,
  };
};

type UnlinkedAccountsQuery = Partial<
  AccountControllerFindUnlinkedAccountsV1Data["query"]
>;

const fetchUnlinkedAccounts = async (
  workspaceId: string,
  query?: Record<string, A>,
) => {
  const res = await accountControllerFindUnlinkedAccountsV1({
    params: { workspace: workspaceId },
    path: { workspace: workspaceId },
    query,
  });

  return res.data as unknown as
    AccountControllerFindUnlinkedAccountsV1Responses[200] | undefined;
};

export function unLinkAccountQueryOptions(
  workspaceId: string,
  query?: Record<string, A>,
  options?: Record<string, unknown>,
) {
  const base = queryOptions({
    queryKey: accountQueryKeys.listUnlinked(query),
    queryFn: () => fetchUnlinkedAccounts(workspaceId, query),
  });

  return { ...options, ...base };
}

export function useUnlinkAccounts(
  query?: UnlinkedAccountsQuery,
  options?: Partial<ReturnType<typeof unLinkAccountQueryOptions>>,
) {
  const { workspace } = useWorkspace();
  const queryConfig = unLinkAccountQueryOptions(workspace!.id, query, options);
  const { data, isError, error, ...rest } = useQuery({
    ...options,
    ...queryConfig,
  });

  return {
    ...rest,
    isError,
    error,
    accounts: data?.data as AccountListResponseDto[] | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
}

export const useLinkAccount = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountLinkRequestDto) =>
      accountControllerLinkV1({
        body: data,
        path: {
          workspace: workspace?.id || "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.lists(),
      });
    },
  });
};

/**
 * Create an API channel and mint its callback signing secret.
 *
 * Not `useLinkAccount`: that path hands a third party's authorization `code` to
 * the server. Here the direction is reversed — the server mints the credential
 * and returns it once, so the caller must surface it immediately (see the
 * chatbot share dialog for the same shape).
 */
export const useProvisionApiChannel = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountProvisionApiChannelRequestDto) =>
      accountControllerProvisionApiChannelV1({
        body: data,
        path: { workspace: workspace?.id || "" },
      }).then(
        (res) => (res.data as A)?.data as AccountProvisionApiChannelResponseDto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.lists() });
    },
  });
};

/** Replace an API channel's signing secret. The account key is unchanged. */
export const useRotateApiChannelSecret = () => {
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (accountId: string) =>
      accountControllerRotateApiChannelSecretV1({
        path: { workspace: workspace?.id || "", accountId },
      }).then(
        (res) => (res.data as A)?.data as AccountProvisionApiChannelResponseDto,
      ),
  });
};

/** Change where an API channel's replies are POSTed. The account key is unchanged. */
export const useUpdateApiChannelCallbackUrl = (accountId: string) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (callbackUrl: string) =>
      accountControllerUpdateCallbackUrlV1({
        body: { callbackUrl },
        path: { workspace: workspace?.id || "", accountId },
      }).then(
        (res) => (res.data as A)?.data as AccountUpdateCallbackUrlResponseDto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.detail(accountId),
      });
    },
  });
};

/** Replace a website widget's allowed embed origins. The widget key is unchanged. */
export const useUpdateWebsiteWidgetAllowedOrigins = (accountId: string) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allowedOrigins: string[]) =>
      accountControllerUpdateAllowedOriginsV1({
        body: { allowedOrigins },
        path: { workspace: workspace?.id || "", accountId },
      }).then(
        (res) =>
          (res.data as A)?.data as AccountUpdateAllowedOriginsResponseDto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.detail(accountId),
      });
    },
  });
};

/**
 * Create an embeddable website widget. Unlike the API channel there is no
 * secret — the widget key ships in the page source (ADR-0014).
 */
export const useProvisionWebsiteWidget = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountProvisionWebsiteWidgetRequestDto) =>
      accountControllerProvisionWebsiteWidgetV1({
        body: data,
        path: { workspace: workspace?.id || "" },
      }).then(
        (res) =>
          (res.data as A)?.data as AccountProvisionWebsiteWidgetResponseDto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.lists() });
    },
  });
};

export const useBatchUnlinkAccounts = () => {
  const { workspaceSlug } = useWorkspaceParams();
  const queryClient = useQueryClient();
  return useMutation<BatchResult, Error, string[]>({
    mutationFn: (ids: string[]) =>
      accountControllerBatchDeleteSyncV1({
        path: { workspace: workspaceSlug || "" },
        body: { ids },
      }).then((res) => (res.data as A)?.data as BatchResult),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.lists(),
      });
    },
  });
};

export const useUnLinkAccount = () => {
  const { workspaceSlug } = useWorkspaceParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: string) =>
      accountControllerDeleteSyncV1({
        path: {
          accountId: data,
          workspace: workspaceSlug || "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.lists(),
      });
    },
  });
};
