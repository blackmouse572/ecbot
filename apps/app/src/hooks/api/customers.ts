import { queryKeysFactory } from "@/libs/query-factory";
import {
  customerWorkspaceControllerEraseV1,
  customerWorkspaceControllerGetV1,
  customerWorkspaceControllerListV1,
  customerWorkspaceControllerUpdateV1,
  exportWorkspaceControllerCustomerV1,
} from "@repo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { conversationQueryKeys } from "./conversations";
import { useWorkspace } from "./workspace";

export const CUSTOMER_QUERY_KEY = "customer" as const;

export type CustomerGetResponseDto = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  notes?: string | null;
  profileSummary?: string | null;
  mergedIntoCustomerId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type CustomerUpdateRequestDto = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  notes?: string | null;
  profileSummary?: string | null;
};

export type CustomerListQuery = {
  page?: number;
  perPage?: number;
  search?: string;
};

export const customerQueryKeys = {
  ...queryKeysFactory<typeof CUSTOMER_QUERY_KEY, CustomerListQuery>(
    CUSTOMER_QUERY_KEY,
  ),
};

export const useCustomers = (query: CustomerListQuery = {}) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerQueryKeys.list(query),
    enabled: !!slug,
    queryFn: () =>
      customerWorkspaceControllerListV1({
        path: { workspace: slug! },
        query,
      }).then((res) => res.data),
  });

  return {
    ...rest,
    customers: (data?.data as CustomerGetResponseDto[] | undefined) ?? [],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useCustomer = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerQueryKeys.detail(id ?? ""),
    enabled: !!slug && !!id,
    queryFn: () =>
      customerWorkspaceControllerGetV1({
        path: { workspace: slug!, id: id! },
      }).then((res) => res.data?.data as CustomerGetResponseDto),
  });

  return { ...rest, customer: data as CustomerGetResponseDto | undefined };
};

export const useUpdateCustomer = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CustomerUpdateRequestDto) =>
      customerWorkspaceControllerUpdateV1({
        path: { workspace: slug!, id: id! },
        body,
      }).then((res) => res.data?.data as CustomerGetResponseDto),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: customerQueryKeys.detail(id),
        });
      }
    },
  });
};

// Mirrors the API's CustomerEraseResponseDto until @repo/client is
// regenerated with it.
export type CustomerErasureSummary = {
  customers: number;
  contactPoints: number;
  conversations: number;
  messages: number;
  mediaFiles: number;
};

/** Everything stored about one customer, for a data subject request. */
export const useExportCustomer = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  return useMutation({
    mutationFn: () =>
      exportWorkspaceControllerCustomerV1({
        path: { workspace: slug!, id: id! },
        throwOnError: true,
      }).then((res) => res.data.data),
  });
};

/** Permanently deletes the customer with all conversations and messages. */
export const useEraseCustomer = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      customerWorkspaceControllerEraseV1({
        path: { workspace: slug!, id: id! },
        throwOnError: true,
      }).then(
        (res) =>
          (res.data as { data?: CustomerErasureSummary }).data as
            CustomerErasureSummary | undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: conversationQueryKeys.all });
    },
  });
};
