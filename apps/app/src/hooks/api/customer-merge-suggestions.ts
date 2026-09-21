import { queryKeysFactory } from "@/libs/query-factory";
import {
  customerMergeSuggestionWorkspaceControllerConfirmV1,
  customerMergeSuggestionWorkspaceControllerDismissV1,
  customerMergeSuggestionWorkspaceControllerGetV1,
  customerMergeSuggestionWorkspaceControllerListV1,
  customerMergeSuggestionWorkspaceControllerPendingCustomerIdsV1,
  customerWorkspaceControllerUnmergeV1,
} from "@repo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerQueryKeys, type CustomerGetResponseDto } from "./customers";
import { useWorkspace } from "./workspace";

export const CUSTOMER_MERGE_SUGGESTION_QUERY_KEY =
  "customer-merge-suggestion" as const;

export type CustomerMergeSuggestionStatus = "PENDING" | "DISMISSED" | "MERGED";

export type CustomerMergeSuggestionCustomerSummaryDto = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  notes?: string | null;
  profileSummary?: string | null;
  createdAt: string;
};

export type CustomerMergeSuggestionGetResponseDto = {
  id: string;
  status: CustomerMergeSuggestionStatus;
  matchField: "phone" | "email";
  matchValue: string;
  customerA: CustomerMergeSuggestionCustomerSummaryDto;
  customerB: CustomerMergeSuggestionCustomerSummaryDto;
  resolvedAt?: string | null;
  mergedSurvivorId?: string | null;
  mergedLoserId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type CustomerMergeFieldResolutionSide = "A" | "B";

export type CustomerMergeSuggestionConfirmRequestDto = {
  survivorId: string;
  fieldResolutions?: Partial<
    Record<
      "name" | "phone" | "email" | "language" | "notes" | "profileSummary",
      CustomerMergeFieldResolutionSide
    >
  >;
};

export type CustomerMergeSuggestionListQuery = {
  status?: CustomerMergeSuggestionStatus;
  page?: number;
  perPage?: number;
};

export const customerMergeSuggestionQueryKeys = {
  ...queryKeysFactory<
    typeof CUSTOMER_MERGE_SUGGESTION_QUERY_KEY,
    CustomerMergeSuggestionListQuery
  >(CUSTOMER_MERGE_SUGGESTION_QUERY_KEY),
  pendingCustomerIds: () =>
    [CUSTOMER_MERGE_SUGGESTION_QUERY_KEY, "pending-customer-ids"] as const,
};

export const useCustomerMergeSuggestionList = (
  query: CustomerMergeSuggestionListQuery = {},
) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerMergeSuggestionQueryKeys.list(query),
    enabled: !!slug,
    queryFn: () =>
      customerMergeSuggestionWorkspaceControllerListV1({
        path: { workspace: slug! },
        query: {
          status: query.status,
          page: query.page,
          perPage: query.perPage,
        },
      }).then(
        (res) =>
          res.data?.data as unknown as {
            data: CustomerMergeSuggestionGetResponseDto[];
            page: number;
            perPage: number;
            totalData: number;
          },
      ),
  });

  return {
    ...rest,
    suggestions:
      (data?.data as CustomerMergeSuggestionGetResponseDto[] | undefined) ?? [],
    page: data?.page ?? 1,
    perPage: data?.perPage ?? 20,
    totalData: data?.totalData ?? 0,
  };
};

export const useCustomerMergeSuggestion = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerMergeSuggestionQueryKeys.detail(id ?? ""),
    enabled: !!slug && !!id,
    queryFn: () =>
      customerMergeSuggestionWorkspaceControllerGetV1({
        path: { workspace: slug!, id: id! },
      }).then(
        (res) =>
          res.data?.data as unknown as CustomerMergeSuggestionGetResponseDto,
      ),
  });

  return {
    ...rest,
    suggestion: data as CustomerMergeSuggestionGetResponseDto | undefined,
  };
};

export const useConfirmMerge = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CustomerMergeSuggestionConfirmRequestDto) =>
      customerMergeSuggestionWorkspaceControllerConfirmV1({
        path: { workspace: slug!, id: id! },
        body,
      }).then(
        (res) =>
          res.data?.data as unknown as {
            survivorId: string;
            loserId: string;
          },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerMergeSuggestionQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: customerMergeSuggestionQueryKeys.pendingCustomerIds(),
      });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: customerMergeSuggestionQueryKeys.detail(id),
        });
      }
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
  });
};

export const useDismissMerge = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      customerMergeSuggestionWorkspaceControllerDismissV1({
        path: { workspace: slug!, id: id! },
      }).then(
        (res) =>
          res.data?.data as unknown as CustomerMergeSuggestionGetResponseDto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerMergeSuggestionQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: customerMergeSuggestionQueryKeys.pendingCustomerIds(),
      });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: customerMergeSuggestionQueryKeys.detail(id),
        });
      }
    },
  });
};

export const useUnmergeCustomer = (customerId: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      customerWorkspaceControllerUnmergeV1({
        path: { workspace: slug!, id: customerId! },
      }).then((res) => res.data?.data as unknown as { suggestionId: string }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerMergeSuggestionQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: customerMergeSuggestionQueryKeys.pendingCustomerIds(),
      });
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: customerQueryKeys.detail(customerId),
        });
      }
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
  });
};

export const usePendingMergeCustomerIds = () => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerMergeSuggestionQueryKeys.pendingCustomerIds(),
    enabled: !!slug,
    queryFn: () =>
      customerMergeSuggestionWorkspaceControllerPendingCustomerIdsV1({
        path: { workspace: slug! },
      }).then(
        (res) =>
          ((res.data?.data as unknown as { customerIds?: string[] })
            ?.customerIds as string[] | undefined) ?? [],
      ),
  });

  return {
    ...rest,
    customerIds: new Set<string>((data as string[] | undefined) ?? []),
  };
};

// Re-export for consumers that want the customer detail type.
export type { CustomerGetResponseDto };
